const { ChromaClient } = await import('chromadb');

export const chroma = new ChromaClient({
  host: process.env.VITE_CHROMA_URL || 'localhost',
  port: 8000
});
