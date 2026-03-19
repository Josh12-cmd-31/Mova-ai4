export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  file?: string;
  fileName?: string;
  fileMimeType?: string;
  beforeFile?: string;
  isEditing?: boolean;
  isError?: boolean;
  errorCode?: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}
