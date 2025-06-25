import { BOOKS } from "@consumet/extensions";
import { Books } from "../db/schema";
import { db } from "../db/db";
import { eq } from "drizzle-orm";

const books = new BOOKS.Libgen();

export const getBookDownloadLink = async (book: string) => {
  const data = await books.search(book);
  return data;
};

export const addBook = async({id, title, authors, description, imageLinks, publisher, categories, isbnValue}: {id: string; title: string; authors: string[]; description: string; imageLinks: string; publisher: string; categories: string[]; isbnValue: string[]}) => {
  if(!id || !title) {
    throw new Error("Missing Id or title");
  }
  const newBook = await db.insert(Books).values({id, title, authors, description, imageLinks, publisher, categories, isbnValue}).returning()
  return newBook
}

export const getBook = async(id: string) => {
  if(!id) {
    throw new Error("No book Id was found")
  }
  const book = await db.select().from(Books).where(eq(Books.id, id))
  if(book.length === 0) {
    throw new Error("No book was found")
  }
  return book
}
