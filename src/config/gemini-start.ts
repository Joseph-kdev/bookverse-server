import { GoogleGenAI } from "@google/genai";
import { configDotenv } from "dotenv";

configDotenv()
const config = {
  responseMimeType: "text/plain",
};
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set in environment variables");
}

const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
});

export default ai;
