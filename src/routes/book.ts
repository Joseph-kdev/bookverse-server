import express, { Router } from "express";
import searchBook from "../services/books";

const router: Router = express.Router();

router.get("/", (req, res) => {
    res.send("Welcome to my express ts server");
})

router.get("/:title", async(req, res) => {
    const title = req.params.title;

    try {
       const data = await searchBook(title)
       res.json(data)
    } catch (error) {
        console.log("Error getting book details")
        res.status(500).json({
            error: "Error fetching book details"
        })
    }
})

export default router;