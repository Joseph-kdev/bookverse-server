import express, { Router } from "express";
import chatAboutBook from "../services/book-chat";
import { randomUUID } from "crypto";

const router: Router = express.Router();

router.post("/", async (req, res): Promise<any> => {
  const { title, author, message, sessionId } = req.body;

  if (!title || !author) {
    return res.status(400).json({ error: "Title and author are required" });
  }

  try {
    const chatSessionId = sessionId || randomUUID();
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    const { stream, sessionId: returnedSessionId } = await chatAboutBook(
      chatSessionId,
      title,
      author,
      message
    );

    console.log(`Chatting about ${title}`);
    for await (const chunk of stream) {
      res.write(
        `data: ${JSON.stringify({
          text: chunk.text,
          sessionId: returnedSessionId,
        })}\n\n`
      );
    }

    res.write("event: end\ndata: {}\n\n");
    res.end();
  } catch (error) {
    console.error("Error in chat route:", error);
    res.write(
      `event: error\ndata: ${JSON.stringify({
        error: "Error processing chat",
      })}\n\n`
    );
    res.end();
  }
});

export default router;
