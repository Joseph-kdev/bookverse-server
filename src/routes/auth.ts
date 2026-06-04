import express, { Router } from "express";
import { auth } from "../config/firebase-admin";
import { addUsers } from "../services/users";

const router: Router = express.Router();

router.post("/verify-token", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token || typeof token !== "string") {
      res.status(400).json({ error: "Token is required" });
      return;
    }

    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;
    const email = decodedToken.email;

    if (!email) {
      res.status(400).json({ error: "Verified Firebase user has no email" });
      return;
    }

    const displayName = decodedToken.name || "Anonymous";
    const user = await addUsers({ userId, email, displayName });

    res.status(200).json({
      userId,
      email,
      displayName,
      user: user[0],
    });
  } catch (error) {
    console.error("Failed to verify Firebase token:", error);
    res.status(401).json({ error: "Invalid token" });
  }
});

export default router;
