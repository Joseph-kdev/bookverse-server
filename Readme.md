# BookVerse Backend

This is the backend server for the BookVerse web application. It powers key features such as book search, AI-powered book chats, and provides API endpoints for the frontend React app.

## What is BookVerse Backend?

BookVerse Backend is a Node.js (TypeScript) REST API that:

- Fetches and aggregates book data—including download links.
- Hosts an AI-powered reviewer/chatbot (using Google Gemini) for in-depth book discussions and summaries, accessible by streaming chat responses.
- Serves as the integration point for BookVerse's digital bookshelf experience.

## Key Features

- **Book Search API:** Search for books and retrieve download links via `/api/book/:title`.
- **AI Book Reviewer:** Chat with an AI about any book, get summaries, reviews, and recommendations at `/api/chat`.
- **Streaming Chat Responses:** Book chats are streamed using Server-Sent Events (SSE) for real-time AI interaction.
- **Cross-Origin Resource Sharing (CORS):** Enabled for seamless frontend-backend communication.
- **TypeScript:** Built with modern, type-safe code.

## Technologies Used

- **Node.js** & **Express** (REST API)
- **TypeScript** (type safety and modern JS)
- **@consumet/extensions** (for book search/downloads)
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
     ```

4. **Build and run the server:**

   ```bash
   npm run build
   npm start
   # For development with hot-reload:
   npm run dev
   ```

5. **API Endpoints:**
   - `GET /api/book/:title` — Search for a book and get download links.
   - `POST /api/chat` — Start or continue an AI-powered book chat (see API docs or code for parameters).

## Project Structure

- `src/routes/` — REST API endpoints
- `src/services/` — Book search and AI chat logic
- `src/config/` — Configuration and API keys

## License

ISC

---
