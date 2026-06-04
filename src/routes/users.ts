import express, { Router } from "express";
import { addUsers, getUser } from "../services/users";
import cors from "cors"
import { getAuthenticatedUser, getAuthenticatedUserId, requireAuth } from "../middleware/verifyToken";

const router: Router = express.Router();

router.use(cors({ origin: "https://bookvs.pages.dev" }));
router.post("/add_user", requireAuth, async (req, res) => {
  try {
    const user = getAuthenticatedUser(req);
    const userId = user.uid;
    const email = user.email;
    const displayName = user.name || "Anonymous";

    if (!email) {
      res.status(400).json({ error: "Authenticated user email is required" });
      return;
    }

    const newUser = await addUsers({ userId, email, displayName });
    res.status(200).json(newUser);
  } catch (error) {
    res.status(500).json({ error: "Error adding user" });
  }
});

router.get("/get_user", requireAuth, async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const returnedUser = await getUser(userId);
    res.status(200).json(returnedUser);
  } catch (error: any) {
    if (error.message === "No user was found") {
      res.status(404).json({ error: "User not found" });
    } else {
      console.log(error)
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

export default router;
