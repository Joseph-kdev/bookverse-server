import { eq, sql } from "drizzle-orm";
import { db } from "../db/db";
import { Reviews, Users } from "../db/schema";
import { getBook } from "./books";

export const addReview = async ({
  userId,
  bookId,
  reviewDesc,
  starRating,
}: {
  userId: string;
  bookId: string;
  reviewDesc: string;
  starRating: number;
}) => {
  if (!userId) {
    throw new Error("Missing user details");
  }
  if (!bookId) {
    throw new Error("Missing book details");
  }

  const book = await getBook(bookId);

  if (!book) {
    throw new Error("Book could not be found")
  }


  const newReview = await db.insert(Reviews).values({
    userId: userId,
    bookId: bookId,
    reviewDesc: reviewDesc,
    starRating: starRating,
  }).returning()
  
  return newReview[0]
};

export const likeReview = async (reviewId: number) => {
  if (!reviewId) {
    throw new Error("Missing review Id");
  }

  const result = await db
    .update(Reviews)
    .set({
      likeCount: sql`${Reviews.likeCount} + 1`,
    })
    .where(eq(Reviews.id, reviewId))
    .returning();

  return result[0];
};

export const unlikeReview = async (reviewId: number) => {
  if (!reviewId) {
    throw new Error("Missing review Id");
  }

  const result = await db
    .update(Reviews)
    .set({
      likeCount: sql`GREATEST(${Reviews.likeCount} - 1, 0)`,
    })
    .where(eq(Reviews.id, reviewId))
    .returning();

  return result[0];
};

export const getReviews = async (bookId : string) => {
    const bookReviews = await db.select().from(Reviews).where(eq(Reviews.bookId, bookId)).leftJoin(Users, eq(Reviews.userId, Users.userId))
    return bookReviews
}