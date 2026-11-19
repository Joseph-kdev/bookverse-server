import express, { Router } from "express";
import { z } from "zod";
import chatAboutBook, { MAX_HISTORY_TURNS } from "../services/book-chat";
import { requireAuth } from "../middleware/verifyToken";
import { chatBurstLimiter, chatDailyLimiter } from "../middleware/rateLimit";

const router: Router = express.Router();

export const MAX_MESSAGE_LENGTH = 2000;
const MAX_TURN_LENGTH = 8000;

const chatRequestSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(300),
  author: z.string().trim().min(1, "Author is required").max(200),
  message: z.string().trim().max(MAX_MESSAGE_LENGTH).optional(),
  // The client owns the conversation. Accept a little more than we use and
  // keep only the most recent turns.
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(MAX_TURN_LENGTH),
      }),
    )
    .max(MAX_HISTORY_TURNS * 3)
    .default([]),
});

const writeEvent = (res: express.Response, event: string | null, data: unknown) => {
  res.write(`${event ? `event: ${event}\n` : ""}data: ${JSON.stringify(data)}\n\n`);
};

router.post("/", requireAuth, chatBurstLimiter, chatDailyLimiter, async (req, res) => {
  const parsed = chatRequestSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: parsed.error.issues[0]?.message ?? "Invalid chat request",
    });
    return;
  }

  const { title, author, message, history } = parsed.data;

  // Stop generating (and spending Gemini tokens) if the user leaves.
  const abortController = new AbortController();
  res.on("close", () => {
    if (!res.writableEnded) {
      abortController.abort();
    }
  });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    const stream = await chatAboutBook({
      title,
      author,
      message,
      history: history.filter((turn) => turn.content.trim().length > 0),
      signal: abortController.signal,
    });

    for await (const chunk of stream) {
      const text = typeof chunk.content === "string" ? chunk.content : "";
      if (text) {
        writeEvent(res, null, { text });
      }
    }

    writeEvent(res, "end", {});
    res.end();
  } catch (error) {
    if (abortController.signal.aborted) {
      res.end();
      return;
    }
    console.log("Error on chat", error);
    writeEvent(res, "error", { error: "Error processing chat" });
    res.end();
  }
});

export default router;
