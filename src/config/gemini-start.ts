import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { configDotenv } from "dotenv";

configDotenv()
const config = {
  responseMimeType: "text/plain",
};
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set in environment variables");
}

const ai = new ChatGoogleGenerativeAI({
  model: 'gemini-2.5-flash',
  apiKey: GEMINI_API_KEY,
})

export default ai;
