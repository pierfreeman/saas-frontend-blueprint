/**
 * AI Chat API types — local definitions.
 * No backend endpoints exist yet; replace with OpenAPI-generated
 * types once the backend AI controller is available.
 */

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

export interface ChatResponse {
  conversationId: string;
  message: ChatMessage;
}
