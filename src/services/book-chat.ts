import ai from "../config/gemini-start";

const chatSessions: Map<string, any> = new Map();

const chatAboutBook = async (sessionId: string, title: string, author: string, message: string[]) => {
  const model = "gemini-2.0-flash-lite";
  const prompt = `You are an expert on books and literature. Provide detailed and accurate information about the book "${title}" by ${author}. 
    Answer questions concisely, focusing on plot, themes, characters, and historical context. 
    Maintain context from previous messages to provide relevant follow-up responses.`;

let chat = chatSessions.get(sessionId);
if(!chat) {
  chat = await ai.chats.create({
      model: model,
      config: {
        systemInstruction: prompt,
      },
  })
  chatSessions.set(sessionId, chat);
}

const response = await chat.sendMessageStream({
  message: message || `What is the book ${title} by ${author} about?`,
})

return { stream: response, sessionId };
};

export default chatAboutBook;