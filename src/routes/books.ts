import express, { Router } from "express";
import {
  addBook,
  checkFavorite,
  checkStatus,
  getBook,
  getBookDownloadLink,
  getFavorites,
  getUserBooks,
  removeBookStatus,
  toggleFavorites,
  updateBookStatus,
} from "../services/books";

const router: Router = express.Router();

router.get("/", (req, res) => {
  res.send("Welcome to my express ts server");
});

router.get("/download_link", async (req, res) => {
  const title = req.query.title as string;

  try {
    const data = await getBookDownloadLink(title);
    res.json(data);
  } catch (error: any) {
    console.log("Error getting book links");
    res.status(500).json({
      error: error.message,
    });
  }
});

router.post("/add_book", async (req, res) => {
  try {
    const {
      id,
      title,
      authors,
      description,
      imageLinks,
      publisher,
      categories,
      isbnValue,
    } = req.body;
    const addedBook = await addBook({
      id,
      title,
      authors,
      description,
      imageLinks,
      publisher,
      categories,
      isbnValue,
    });
    res.status(200).json(addedBook);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/get_book", async (req, res) => {
  try {
    const bookId = req.query.bookId as string;
    const fetchedBook = await getBook(bookId);
    res.status(200).json(fetchedBook);
  } catch (error: any) {
    if (error.message === "No book was found") {
      res.status(404).json({ error: "Book not found" });
    } else {
      console.log("Error getting book", error);
      res.status(500).json({ error: error.message });
    }
  }
});

router.get("/check_status/:userId/:bookId", async (req, res) => {
  try {
    const {userId, bookId} = req.params
    const fetchedBook = await checkStatus({ bookId, userId });
    res.status(200).json(fetchedBook);
  } catch (error: any) {
    if (error.message === "No book was found") {
      res.status(404).json({ error: "Book not found" });
    } else {
      console.log("Error getting book", error);
      res.status(500).json({ error: error.message });
    }
  }
});

router.post("/update_book_status", async (req, res) => {
  try {
    const { userId, bookId, status } = req.body;
    const savedBook = await updateBookStatus({ userId, bookId, status });
    res.status(200).json(savedBook);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/remove_book_status", async (req, res) => {
  try {
    const { userId, bookId } = req.body;
    const removedBook = await removeBookStatus({ userId, bookId });
    res.status(200).json(removedBook);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/toggle_favorite", async (req, res) => {
  try {
    const { userId, bookId } = req.body;
    const result = await toggleFavorites({ userId, bookId });
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/check_favorite/:userId/:bookId", async (req, res) => {
  try {
    const {userId, bookId} = req.params
    const result = await checkFavorite({ userId, bookId });
    res.status(200).json(result);
  } catch (error: any) {
    res.json({ error: error.message });
  }
});

router.get("/get_user_books/:userId", async(req, res) => {
  try {
    const {userId} = req.params
    const result = await getUserBooks(userId);
    res.status(200).json(result)
  } catch (error: any) {
    res.json({error : error.message})
  }
})

router.get("/get_favorites/:userId", async(req,res) => {
  try {
    const {userId} = req.params
    const result = await getFavorites(userId)
    res.status(200).json(result)
  } catch (error: any) {
    res.json({error : error.message})
  }
})

export default router;
