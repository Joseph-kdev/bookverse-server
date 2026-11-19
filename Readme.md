# BookVerse Backend

This is the backend server for the BookVerse web application. It powers key features such as book search, AI-powered book chats, and provides API endpoints for the frontend React app.

## What is BookVerse Backend?

BookVerse Backend is a Node.js (TypeScript) REST API that:

- Fetches and aggregates book data, including legal free reading links (Project Gutenberg, Standard Ebooks, Internet Archive, Open Library) with a Google Books preview fallback.
- Hosts an AI-powered reviewer/chatbot (using Google Gemini) for in-depth book discussions and summaries, accessible by streaming chat responses.
- Serves as the integration point for BookVerse's digital bookshelf experience.

## Key Features

- **Book Search API:** Search Google Books via `/api/books/search?book=...`.
- **Reading Links API:** Legal free reading/download links via `/api/books/reading_links/:bookId`.
- **AI Book Reviewer:** Chat with an AI about any book, get summaries, reviews, and recommendations at `/api/chat`.
- **Streaming Chat Responses:** Book chats are streamed using Server-Sent Events (SSE) for real-time AI interaction.
- **Cross-Origin Resource Sharing (CORS):** Enabled for seamless frontend-backend communication.
- **TypeScript:** Built with modern, type-safe code.

## Technologies Used

- **Node.js** & **Express** (REST API)
- **TypeScript** (type safety and modern JS)
- **Drizzle ORM** + **Postgres** (data storage)
- **Firebase Admin** (auth token verification)
- **Open Library** + **Google Books** APIs (book data and reading links)
- **@google/genai** (Google Gemini AI model for book chat)

See all dependencies in [`package.json`](https://github.com/Joseph-kdev/bookverse-server/blob/main/package.json).

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm or yarn
- A Google Gemini API key (for AI chat functionality)

### Setup Instructions

1. **Clone the repository:**

   ```bash
   git clone https://github.com/Joseph-kdev/bookverse-server.git
   cd bookverse-server
   ```

2. **Install dependencies:**

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure Environment Variables:**
   - Create a `.env` file in the project root.
   - Add your Google Gemini API key:

     ```
     GEMINI_API_KEY=your_google_gemini_key_here
     GOOGLE_BOOKS_API_KEY=your_google_books_key_here
     DATABASE_URL=postgres://...
     # Optional, comma-separated. Defaults to https://bookvs.pages.dev and localhost
     ALLOWED_ORIGINS=https://bookvs.pages.dev,http://localhost:5173
     # Optional per-user chat limits (defaults: 6 per minute, 60 per day)
     CHAT_RATE_LIMIT_PER_MINUTE=6
     CHAT_RATE_LIMIT_PER_DAY=60
     ```

4. **Build and run the server:**

   ```bash
   npm run build
   npm start
   # For development with hot-reload:
   npm run dev
   ```

5. **API Endpoints:**
   - `GET /api/books/search?book=<query>` — Search for books.
   - `GET /api/books/details/:bookId` — Book details (database, then Google Books).
   - `GET /api/books/reading_links/:bookId?title=&author=&isbn=` — Legal free reading links, falling back to a Google Books preview.
   - `POST /api/chat` — AI book chat (SSE stream). Requires `Authorization: Bearer <Firebase ID token>`. Body: `{ title, author, message, history: [{ role: "user" | "assistant", content }] }`. The server is stateless; the client stores the conversation and sends recent turns (the last 20 are used). Rate limited per user; returns `429` with `Retry-After` when exceeded.

## Project Structure

- `src/routes/` — REST API endpoints
- `src/services/` — Book search and AI chat logic
- `src/config/` — Configuration and API keys

## License

ISC

---
