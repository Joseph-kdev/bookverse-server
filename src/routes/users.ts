import express, { Router } from "express";
import { addUsers, getUser } from "../services/users";

const router: Router = express.Router();

router.post("/add_user", async (req, res) => {
  try {
    const { userId, email } = req.body;
    const newUser = await addUsers({ userId, email });
    res.status(200).json(newUser);
  } catch (error) {
    res.status(500).json({ error: "Error adding user" });
  }
});

router.get("/get_user", async (req, res) => {
  try {
    const userId = req.query.userId as string;
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
