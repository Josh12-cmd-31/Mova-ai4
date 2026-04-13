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

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  tokens: number;
  isSubscribed: boolean;
  plan?: 'free' | 'mova1' | 'mova4' | 'business';
  subscriptionId?: string;
  lastTokenReset: number;
  createdAt: number;
}
