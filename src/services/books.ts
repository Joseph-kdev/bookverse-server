import { BOOKS } from "@consumet/extensions";
import { Books, UserBooks } from "../db/schema";
import { db } from "../db/db";
import { eq, sql } from "drizzle-orm";

type StatusEnum = "favorites" | "reading_list" | "completed";
type StatusArray = StatusEnum[];
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

export const saveBook = async ({
  bookId,
  userId,
  status,
}: {
  bookId: string;
  userId: string;
  status: StatusArray;
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

  let initialStatus: any = [...new Set(...savedBook[0].status, ...status)];
  if (initialStatus.includes("completed")) {
    initialStatus = initialStatus.filter((s: string) => s != "reading_list");
  }
  const book = await db
    .update(UserBooks)
    .set({ status: initialStatus })
    .where(
      sql`${UserBooks.bookId} = ${bookId} and ${UserBooks.userId} = ${userId}`
    )
    .returning();
  return book;
};
