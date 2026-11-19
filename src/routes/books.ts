import express, { Router } from "express";
import {
  addBook,
  checkFavorite,
  checkStatus,
  fetchBookByGenre,
  fetchSimilarBooks,
  getBook,
  getBookDetails,
  getFavorites,
  getUserBooks,
  removeBookStatus,
  searchForBook,
  toggleFavorites,
  updateBookStatus,
} from "../services/books";
import { getAuthenticatedUserId, requireAuth } from "../middleware/verifyToken";
import { getReadingLinks } from "../services/reading-links";

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong";

const router: Router = express.Router();

router.get("/", (req, res) => {
  res.send("Welcome stranger, you seem lost!");
});

router.post("/add_book", requireAuth, async (req, res) => {
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
    if (!fetchedBook) {
      res.status(404).json({ error: "Book not found" });
      return;
    }
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

// Book details for the book page: DB first, then Google Books.
router.get("/details/:bookId", async (req, res) => {
  try {
    const book = await getBookDetails(req.params.bookId);
    if (!book) {
      res.status(404).json({ error: "Book not found" });
      return;
    }
    res.status(200).json(book);
  } catch (error) {
    console.log("Error getting book details", error);
    res.status(500).json({ error: errorMessage(error) });
  }
});

// Legal free reading/download links, with a Google Books preview fallback.
router.get("/reading_links/:bookId", async (req, res) => {
  try {
    const { bookId } = req.params;
    const title = typeof req.query.title === "string" ? req.query.title : undefined;
    const author = typeof req.query.author === "string" ? req.query.author : undefined;
    const isbnParam = typeof req.query.isbn === "string" ? req.query.isbn : "";
    const isbns = isbnParam
      .split(",")
      .map((isbn) => isbn.replace(/[^0-9Xx]/g, ""))
      .filter((isbn) => isbn.length === 10 || isbn.length === 13);

    const result = await getReadingLinks({ bookId, title, author, isbns });
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400");
    res.status(200).json(result);
  } catch (error) {
    console.log("Error getting reading links", error);
    res.status(500).json({ error: errorMessage(error) });
  }
});

router.get("/search", async(req, res) => {
  try {
    const bookToSearch = req.query.book as string
    const searchedBook = await searchForBook(bookToSearch)
    res.status(200).json(searchedBook)
  } catch (error) {
    console.log("Error searching for the book", error)
    res.status(502).json({ error: errorMessage(error) });
  }
})

router.get("/fetch_by_genre/:genre", async (req, res) => {
  try {
    const genre = req.params.genre as string;
    if (!genre?.trim()) {
      res.status(400).json({ error: "Genre is required" });
      return;
    }
    const fetchedBooks = await fetchBookByGenre(genre);
    if (!fetchedBooks.length) {
      res.status(404).json({ error: `No books found for genre: ${genre}` });
      return;
    }
    res.status(200).json(fetchedBooks);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong";
    res.status(500).json({ error: message });
  }
});

router.get("/check_status/:bookId", requireAuth, async (req, res) => {
  try {
    const { bookId } = req.params;
    const userId = getAuthenticatedUserId(req);
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

router.get("/check_status/:userId/:bookId", requireAuth, async (req, res) => {
  try {
    const { bookId } = req.params;
    const userId = getAuthenticatedUserId(req);
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

router.post("/update_book_status", requireAuth, async (req, res) => {
  try {
    const { bookId, status } = req.body;
    const userId = getAuthenticatedUserId(req);
    const savedBook = await updateBookStatus({ userId, bookId, status });
    res.status(200).json(savedBook);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/remove_book_status", requireAuth, async (req, res) => {
  try {
    const { bookId } = req.body;
    const userId = getAuthenticatedUserId(req);
    const removedBook = await removeBookStatus({ userId, bookId });
    res.status(200).json(removedBook);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/toggle_favorite", requireAuth, async (req, res) => {
  try {
    const { bookId } = req.body;
    const userId = getAuthenticatedUserId(req);
    const result = await toggleFavorites({ userId, bookId });
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/check_favorite/:bookId", requireAuth, async (req, res) => {
  try {
    const { bookId } = req.params;
    const userId = getAuthenticatedUserId(req);
    const result = await checkFavorite({ userId, bookId });
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ error: errorMessage(error) });
  }
});

router.get("/check_favorite/:userId/:bookId", requireAuth, async (req, res) => {
  try {
    const { bookId } = req.params;
    const userId = getAuthenticatedUserId(req);
    const result = await checkFavorite({ userId, bookId });
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ error: errorMessage(error) });
  }
});

router.get("/get_user_books", requireAuth, async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const result = await getUserBooks(userId);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ error: errorMessage(error) });
  }
});

router.get("/get_user_books/:userId", requireAuth, async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const result = await getUserBooks(userId);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ error: errorMessage(error) });
  }
});

router.get("/get_favorites", requireAuth, async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const result = await getFavorites(userId);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ error: errorMessage(error) });
  }
});

router.get("/get_favorites/:userId", requireAuth, async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const result = await getFavorites(userId);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ error: errorMessage(error) });
  }
});

router.get("/similar_books/:query", async(req, res) => {
  try {
    const { query } = req.params;
    const result = await fetchSimilarBooks(query);
    res.status(200).json(result)
  } catch (error) {
    res.status(500).json({ error: errorMessage(error) })
  }
})

export default router;
