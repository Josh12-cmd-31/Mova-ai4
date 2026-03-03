export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  image?: string;
  isEditing?: boolean;
  isError?: boolean;
  errorCode?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}
