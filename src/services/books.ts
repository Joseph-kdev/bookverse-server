import { BOOKS } from "@consumet/extensions";

const books = new BOOKS.Libgen();

const searchBook = async (book: string) => {
  const data = await books.search(book);
  return data;
};

export default searchBook;
