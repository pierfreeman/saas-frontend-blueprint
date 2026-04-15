export type ChatMessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  createdAt: string;
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
}

/** Shape of each SSE `data:` JSON chunk from the backend. */
export interface SseChunk {
  content?: string;
  error?: string;
}
