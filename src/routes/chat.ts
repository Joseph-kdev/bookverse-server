import express, { Router } from "express";
import chatAboutBook from "../services/book-chat";
import { randomUUID } from "crypto";
import cors from "cors";

const router: Router = express.Router();

router.use(cors({ origin: "https://bookvs.pages.dev/" }));

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
    const { stream, sessionId: returnedSessionId, history } = await chatAboutBook(
      chatSessionId,
      title,
      author,
      message
    );

    let fullReply = ""

    for await (const chunk of stream) {
      const text = typeof chunk.content === "string" ? chunk.content : "";
      if(text) {
        fullReply += text
        res.write(
          `data: ${JSON.stringify({
            text,
            sessionId: returnedSessionId,
          })}\n\n`
        );
      }
    }

    await history.addAIMessage(fullReply)

    res.write("event: end\ndata: {}\n\n");
    res.end();
  } catch (error) {
    res.write(
      `event: error\ndata: ${JSON.stringify({
        error: "Error processing chat",
      })}\n\n`
    );
    console.log("Error on chat", error)
    res.end();
  }
});

export default router;
