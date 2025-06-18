import { BOOKS } from "@consumet/extensions";

const books = new BOOKS.Libgen();

const searchBook = async (book: string) => {
  const data = await books.search(book);
  console.log(data);
  return data;
};

export default searchBook;
