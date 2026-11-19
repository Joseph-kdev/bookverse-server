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
import { fetchGoogleVolume } from "./reading-links";

type StatusEnum = "reading" | "reading_list" | "completed";
export interface ImageLinks {
  smallThumbnail: string;
  thumbnail: string;
}
export interface IndustryIdentifier {
  type: string;
  identifier: string;
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const fetchWithExponentialBackoff = async (
  input: RequestInfo,
  init?: RequestInit,
  maxRetries = 3,
  initialDelayMs = 500,
) => {
  let attempt = 0;

  while (true) {
    const response = await fetch(input, init);

    if (response.ok) {
      return response;
    }

    if (response.status !== 429 || attempt >= maxRetries) {
      return response;
    }

    const retryAfter = response.headers.get("Retry-After");
    let delayMs = initialDelayMs * 2 ** attempt;

    if (retryAfter) {
      const parsedRetryAfter = Number(retryAfter);
      if (!Number.isNaN(parsedRetryAfter)) {
        delayMs = Math.max(delayMs, parsedRetryAfter * 1000);
      }
    }

    attempt += 1;
    console.log(
      `Received 429 from ${input}. Retrying in ${delayMs}ms (attempt ${attempt}/${maxRetries})`,
    );
    await delay(delayMs);
  }
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
  return book[0] ?? null;
};

/**
 * Returns a book from the database, falling back to the Google Books API
 * so that book pages work on refresh / shared links even if the book
 * was never saved.
 */
export const getBookDetails = async (id: string) => {
  if (!id) {
    throw new Error("No book Id was found");
  }

  const stored = await getBook(id);
  if (stored) {
    return stored;
  }

  const volume = await fetchGoogleVolume(id);
  if (!volume?.volumeInfo?.title) {
    return null;
  }

  const info = volume.volumeInfo;
  return {
    id: volume.id,
    title: info.title,
    authors: info.authors ?? [],
    description: info.description ?? "",
    imageLinks: info.imageLinks ?? null,
    publisher: info.publisher ?? null,
    categories: info.categories ?? [],
    isbnValue: (info.industryIdentifiers ?? []).map((i) => i.identifier),
  };
};

export const fetchBookByGenre = async (genre: string) => {
  const slugGenre = slugify(genre.toLowerCase());
  const googleBooksApi = process.env.GOOGLE_BOOKS_API_KEY;

  try {
    const booksByGenre = await db
      .select()
      .from(BookCategories)
      .where(eq(BookCategories.categoryId, slugGenre))
      .leftJoin(Books, eq(BookCategories.bookId, Books.id));

    if (booksByGenre.length < 10) {
      const googleBooksUrl: string = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(`subject:${genre}`)}&key=${encodeURIComponent(googleBooksApi ?? "")}&orderBy=relevance&maxResults=40`;

      const response = await fetch(googleBooksUrl);

      if (!response.ok) {
        console.log("Error fetching books from api");
        return booksByGenre;
      }

      const data = await response.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      const books = items.map(
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
          console.warn(
            `Failed to add book "${book.title ?? "unknown"}" (Google ID: ${book.id ?? "n/a"}):`,
            error instanceof Error ? error.message : error,
          );
        }
      }
      return await db
        .select()
        .from(BookCategories)
        .where(eq(BookCategories.categoryId, slugGenre))
        .leftJoin(Books, eq(BookCategories.bookId, Books.id));
    }
    console.log("Books found");
    return booksByGenre;
  } catch (error) {
    console.log(`fetchBookByGenre crashed for genre "${genre}":`, error);
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

export const fetchSimilarBooks = async (query: string) => {
  if (!query) {
    throw new Error("No query was found");
  }

  const BiG_BOOK_API = process.env.BIG_BOOKS;
  const bigBookEndPoint = `https://api.bigbookapi.com/search-books?query=${encodeURIComponent(query)}&api-key=${encodeURIComponent(BiG_BOOK_API ?? "")}`;

  try {
    const response = await fetchWithExponentialBackoff(bigBookEndPoint);

    if (!response.ok) {
      console.log("Error fetching similar books", response.status);
      throw new Error("Could not find similar books");
    }

    const data = await response.json();
    return data.books;
  } catch (error) {
    console.log("Error calling similar function", error);
    throw new Error("Could not find similar books :(");
  }
};

export const searchForBook = async (query: string) => {
  if (!query) {
    throw new Error("No query was found");
  }

  const googleBooksUrl = "https://www.googleapis.com/books/v1/volumes";
  const googleBooksKey = process.env.GOOGLE_BOOKS_API_KEY;

  try {
    const response = await fetchWithExponentialBackoff(
      `${googleBooksUrl}?q=${encodeURIComponent(query)}&key=${encodeURIComponent(googleBooksKey ?? "")}`,
    );

    if (!response.ok) {
      console.log("Error searching for book", response.status);
      throw new Error("Book Search Failed");
    }

    const data = await response.json();
    const items = Array.isArray(data?.items) ? data.items : [];
    const books = items.map(
      (item: {
        id: string;
        volumeInfo: {
          title: string;
          authors: string[];
          description: string;
          imageLinks: ImageLinks;
          publisher: string;
          categories: string[];
          industryIdentifiers: IndustryIdentifier;
        };
      }) => ({
        id: item.id,
        title: item.volumeInfo.title,
        authors: item.volumeInfo.authors,
        description: item.volumeInfo.description,
        imageLinks: item.volumeInfo.imageLinks,
        publisher: item.volumeInfo.publisher,
        categories: item.volumeInfo.categories,
        isbnValue: item.volumeInfo.industryIdentifiers,
      })
    );
    return books
  } catch (error) {
    console.log("Error searching for book", error)
    throw new Error("Book Search Failed");
  }
};
