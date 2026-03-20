export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  file?: string;
  fileId?: string;
  fileName?: string;
  fileMimeType?: string;
  beforeFile?: string;
  beforeFileId?: string;
  isEditing?: boolean;
  isError?: boolean;
  errorCode?: string;
}

export interface SessionFile {
  id: string;
  sessionId: string;
  data: string;
  mimeType: string;
  createdAt: number;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}
