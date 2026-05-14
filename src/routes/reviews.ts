import express, { Router } from "express";
import { addReview, getReviews, likeReview, unlikeReview } from "../services/reviews";
import { asyncHandler } from "../utils/asyncHandler";

const router: Router = express.Router();

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { userId, bookId, reviewDesc, starRating } = req.body;
    const reviewAdded = await addReview({
      userId: userId,
      bookId: bookId,
      reviewDesc: reviewDesc,
      starRating: starRating,
    });
    res.status(200).json(reviewAdded);
  }),
);

router.get(
  "/:bookId",
  asyncHandler(async (req, res) => {
    const bookId = req.params.bookId as string;
    const bookReviews = await getReviews(bookId)
    res.status(200).json(bookReviews)
  }),
);

router.post(
  "/:id/like",
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const result = await likeReview(id);
    res.status(200).json(result);
  }),
);

router.post(
  "/:id/unlike",
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const result = await unlikeReview(id);
    res.status(200).json(result);
  }),
);

export default router;