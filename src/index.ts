import express, { NextFunction, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import indexRouter from "./routes/books";
import chatRouter from "./routes/chat";
import userRouter from "./routes/users";
import reviewRouter from "./routes/reviews";
import authRouter from "./routes/auth";

dotenv.config()

const app = express();
const port = process.env.PORT;

// CORS: only allow the BookVerse frontend (plus Cloudflare Pages previews and local dev).
// Override with a comma-separated ALLOWED_ORIGINS env variable.
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS ??
  "https://bookvs.pages.dev,http://localhost:5173,http://localhost:4173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const isAllowedOrigin = (origin: string) =>
  allowedOrigins.includes(origin) ||
  /^https:\/\/[a-z0-9-]+\.bookvs\.pages\.dev$/.test(origin);

app.use(
  cors({
    origin: (origin, callback) => {
      // Requests without an Origin header (curl, server-to-server) are not CORS requests.
      if (!origin || isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
  }),
);
app.use(express.json());

app.use('/api/books', indexRouter)
app.use('/api/chat', chatRouter)
app.use('/api/users', userRouter)
app.use('/api/reviews', reviewRouter)
app.use('/api/auth', authRouter)

// Central error handler for routes wrapped in asyncHandler.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  if (res.headersSent) {
    res.end();
    return;
  }
  const message = err instanceof Error ? err.message : "Internal server error";
  res.status(500).json({ error: message });
});

app.listen(port, () => {
  console.log(`Server running at ${port}`);
});

export default app
