import { BOOKS } from "@consumet/extensions";
import { Books, UserBooks, UserFavorites } from "../db/schema";
import { db } from "../db/db";
import { eq, sql } from "drizzle-orm";

type StatusEnum = "reading" | "reading_list" | "completed";
interface imageLinks {
  smallThumbnail: string;
  thumbnail: string;
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
  imageLinks: imageLinks;
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
    .returning();
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
      sql`${UserBooks.bookId} = ${bookId} and ${UserBooks.userId} = ${userId}`
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
      sql`${UserBooks.bookId} = ${bookId} and ${UserBooks.userId} = ${userId}`
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
      sql`${UserBooks.bookId} = ${bookId} and ${UserBooks.userId} = ${userId}`
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
      sql`${UserBooks.userId} = ${userId} and ${UserBooks.bookId} = ${bookId}`
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
      sql`${UserFavorites.bookId} = ${bookId} and ${UserFavorites.userId} = ${userId}`
    );

  if (existingBook.length > 0) {
    await db
      .delete(UserFavorites)
      .where(
        sql`${UserFavorites.bookId} = ${bookId} and ${UserFavorites.userId} = ${userId}`
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
      sql`${UserFavorites.bookId} = ${bookId} and ${UserFavorites.userId} = ${userId}`
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
      status: UserBooks.status
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
    .leftJoin(Books, eq(UserFavorites.bookId, Books.id));;
  if (!response) {
    throw new Error("Could not retrieve favorites");
  }
  return response;
};
