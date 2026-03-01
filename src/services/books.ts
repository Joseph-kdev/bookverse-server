import { BOOKS } from "@consumet/extensions";
import {
  BookCategories,
  Books,
  Categories,
  UserBooks,
  UserFavorites,
} from "../db/schema";
import { db } from "../db/db";
import { eq, sql } from "drizzle-orm";
import slugify from "slugify";

type StatusEnum = "reading" | "reading_list" | "completed";
export interface ImageLinks {
  smallThumbnail: string;
  thumbnail: string;
}
export interface IndustryIdentifier {
  type: string;
  identifier: string;
}

const books = new BOOKS.Libgen();

export const getBookDownloadLink = async (book: string) => {
  const data = await books.search(book);
  return data;
};

export const addBook = async ({
  id,
  title,
  authors,
  description,
  imageLinks,
  publisher,
  categories,
  isbnValue,
}: {
  id: string;
  title: string;
  authors: string[];
  description: string;
  imageLinks: ImageLinks;
  publisher: string;
  categories: string[];
  isbnValue: string[];
}) => {
  if (!id || !title) {
    throw new Error("Missing Id or title");
  }
  const newBook = await db
    .insert(Books)
    .values({
      id,
      title,
      authors,
      description,
      imageLinks,
      publisher,
      categories,
      isbnValue,
    })
    .onConflictDoNothing();

  const bookCategories = categories ?? [];

  if (bookCategories.length === 0) {
    return;
  }

  for (const c of bookCategories) {
    const categoryId = slugify(c, { lower: true });

    await db
      .insert(Categories)
      .values({ id: categoryId, name: c })
      .onConflictDoNothing();

    await db
      .insert(BookCategories)
      .values({ bookId: id, categoryId })
      .onConflictDoNothing();
  }

  return newBook;
};

export const getBook = async (id: string) => {
  if (!id) {
    throw new Error("No book Id was found");
  }
  const book = await db.select().from(Books).where(eq(Books.id, id));
  if (book.length === 0) {
    throw new Error("No book was found");
  }
  return book;
};

export const fetchBookByGenre = async (genre: string) => {
  const slugGenre = slugify(genre);
  const googleBooksApi = process.env.GOOGLE_BOOKS_API_KEY;

  try {
    const booksByGenre = await db
      .select()
      .from(BookCategories)
      .where(eq(BookCategories.categoryId, slugGenre))
      .leftJoin(Books, eq(BookCategories.bookId, Books.id));

    if (booksByGenre.length < 10) {
      const googleBooksUrl: string = `https://www.googleapis.com/books/v1/volumes/?q=subject:${genre}&api-key=${googleBooksApi}&orderBy=relevance&maxResults=40`;

      const response = await fetch(googleBooksUrl);

      if (!response.ok) {
        throw new Error("Error fetching books from api");
      }

      const data = await response.json();
      const books = data.items.map(
        (item: {
          id: string;
          volumeInfo: {
            title: string;
            authors: string[];
            description: string;
            imageLinks: ImageLinks;
            publisher: string;
            categories: string[];
            industryIdentifiers: IndustryIdentifier[];
          };
        }) => ({
          id: item.id,
          title: item.volumeInfo.title,
          authors: item.volumeInfo.authors,
          description: item.volumeInfo.description,
          imageLinks: item.volumeInfo.imageLinks,
          publisher: item.volumeInfo.publisher,
          categories: item.volumeInfo.categories?.length
            ? [...new Set([genre, ...item.volumeInfo.categories])]
            : [genre],
          isbnValue: item.volumeInfo.industryIdentifiers?.map(
            (i) => i.identifier,
          ),
        }),
      );
      for (const book of books) {
        try {
          await addBook(book);
        } catch (error) {
          throw new Error(`Failed to add ${book.title}`);
        }
      }
      return books;
    }
    return await db
      .select()
      .from(BookCategories)
      .where(eq(BookCategories.categoryId, slugGenre))
      .leftJoin(Books, eq(BookCategories.bookId, Books.id));
  } catch (error) {
    throw new Error(error);
  }
};

export const updateBookStatus = async ({
  bookId,
  userId,
  status,
}: {
  bookId: string;
  userId: string;
  status: StatusEnum;
}) => {
  if (!userId) {
    throw new Error("User not specified");
  }
  if (!bookId) {
    throw new Error("Book not specified");
  }

  const savedBook = await db
    .select()
    .from(UserBooks)
    .where(
      sql`${UserBooks.bookId} = ${bookId} and ${UserBooks.userId} = ${userId}`,
    );

  if (savedBook.length === 0) {
    const book = await db
      .insert(UserBooks)
      .values({ bookId, userId, status })
      .returning();
    return book;
  }

  const book = await db
    .update(UserBooks)
    .set({ status: status })
    .where(
      sql`${UserBooks.bookId} = ${bookId} and ${UserBooks.userId} = ${userId}`,
    )
    .returning();

  return book;
};

export const removeBookStatus = async ({
  bookId,
  userId,
}: {
  bookId: string;
  userId: string;
}) => {
  const result = await db
    .delete(UserBooks)
    .where(
      sql`${UserBooks.bookId} = ${bookId} and ${UserBooks.userId} = ${userId}`,
    )
    .returning();

  return result;
};

export const checkStatus = async ({
  bookId,
  userId,
}: {
  bookId: string;
  userId: string;
}) => {
  if (!bookId) {
    throw new Error("No book id found");
  }
  if (!userId) {
    throw new Error("No user id found");
  }

  const result = await db
    .select()
    .from(UserBooks)
    .where(
      sql`${UserBooks.userId} = ${userId} and ${UserBooks.bookId} = ${bookId}`,
    );
  if (!result) {
    throw new Error("No Book found in catalogue");
  }
  return result;
};

export const toggleFavorites = async ({
  bookId,
  userId,
}: {
  bookId: string;
  userId: string;
}) => {
  if (!userId) {
    throw new Error("User not specified");
  }
  if (!bookId) {
    throw new Error("Book not specified");
  }

  const existingBook = await db
    .select()
    .from(UserFavorites)
    .where(
      sql`${UserFavorites.bookId} = ${bookId} and ${UserFavorites.userId} = ${userId}`,
    );

  if (existingBook.length > 0) {
    await db
      .delete(UserFavorites)
      .where(
        sql`${UserFavorites.bookId} = ${bookId} and ${UserFavorites.userId} = ${userId}`,
      );
    return { action: "removed", isFavorite: false };
  } else {
    const book = await db
      .insert(UserFavorites)
      .values({ bookId, userId })
      .returning();
    return { action: "added", isFavorite: true, book };
  }
};

export const checkFavorite = async ({
  bookId,
  userId,
}: {
  bookId: string;
  userId: string;
}) => {
  if (!bookId) {
    throw new Error("No book id found");
  }
  if (!userId) {
    throw new Error("No user id found");
  }

  const result = await db
    .select()
    .from(UserFavorites)
    .where(
      sql`${UserFavorites.bookId} = ${bookId} and ${UserFavorites.userId} = ${userId}`,
    );
  if (!result) {
    throw new Error("No Book found in favorites");
  }
  return result;
};

export const getUserBooks = async (userId: string) => {
  if (!userId) {
    throw new Error("No user id found");
  }

  const response = await db
    .select({
      id: UserBooks.bookId,
      title: Books.title,
      description: Books.description,
      categories: Books.categories,
      authors: Books.authors,
      imageLinks: Books.imageLinks,
      publisher: Books.publisher,
      status: UserBooks.status,
    })
    .from(UserBooks)
    .where(eq(UserBooks.userId, userId))
    .leftJoin(Books, eq(UserBooks.bookId, Books.id));
  if (!response) {
    throw new Error("Could not retrieve user's books");
  }
  return response;
};

export const getFavorites = async (userId: string) => {
  if (!userId) {
    throw new Error("No user id found");
  }
  const response = await db
    .select({
      id: Books.id,
      title: Books.title,
      description: Books.description,
      categories: Books.categories,
      authors: Books.authors,
      imageLinks: Books.imageLinks,
      publisher: Books.publisher,
    })
    .from(UserFavorites)
    .where(eq(UserFavorites.userId, userId))
    .leftJoin(Books, eq(UserFavorites.bookId, Books.id));
  if (!response) {
    throw new Error("Could not retrieve favorites");
  }
  return response;
};
