import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import indexRouter from "./routes/books";
import chatRouter from "./routes/chat";
import userRouter from "./routes/users";
import reviewRouter from "./routes/reviews";

dotenv.config()

const app = express();
const port = process.env.PORT;

app.use(express.json());
app.use(cors())

app.use('/api/books', indexRouter)
app.use('/api/chat', chatRouter)
app.use('/api/users', userRouter)
app.use('/api/reviews', reviewRouter)

app.listen(port, () => {
  console.log(`Server running at ${port}`);
});

export default app