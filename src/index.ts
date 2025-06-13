import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import indexRouter from "./routes/book";

dotenv.config()

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors())

app.use('/api/book', indexRouter)

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
