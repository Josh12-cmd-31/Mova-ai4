import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Image as ImageIcon, 
  Settings, 
  Menu, 
  X,
  Zap,
  Shield,
  Cpu,
  LogIn,
  LogOut,
  Mail,
  Lock,
  User as UserIcon,
  Plus,
  Download,
  Copy,
  Check
} from 'lucide-react';
import ChatInterface from './components/ChatInterface';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  db,
  handleFirestoreError,
  OperationType
} from './services/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  setDoc, 
  doc, 
  orderBy,
  getDocFromServer
} from 'firebase/firestore';
import { ChatSession, Message, SessionFile } from './types';

// Helper to remove undefined values for Firestore
function sanitizeData(data: any): any {
  if (Array.isArray(data)) {
    return data.map(v => sanitizeData(v));
  } else if (data !== null && typeof data === 'object') {
    return Object.fromEntries(
      Object.entries(data)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, sanitizeData(v)])
    );
  }
  return data;
}

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  
  // Chat Sessions State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Auth Form State
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  // Validate connection to Firestore
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  // Load sessions from Firestore
  useEffect(() => {
    if (user && user.emailVerified) {
      const q = query(
        collection(db, 'sessions'),
        where('userId', '==', user.uid),
        orderBy('updatedAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const loadedSessions = snapshot.docs.map(doc => doc.data() as ChatSession);
        setSessions(loadedSessions);
        
        if (loadedSessions.length > 0 && !activeSessionId) {
          setActiveSessionId(loadedSessions[0].id);
        } else if (loadedSessions.length === 0) {
          createNewChat();
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'sessions');
      });

      return () => unsubscribe();
    }
  }, [user, user?.emailVerified]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const createNewChat = async () => {
    if (!user) return;
    const newId = Date.now().toString();
    const welcomeName = user.displayName ? `, ${user.displayName.split(' ')[0]}` : '';
    const newSession: ChatSession = {
      id: newId,
      userId: user.uid,
      title: 'New Chat',
      messages: [
        {
          id: '1',
          role: 'assistant',
          content: `How can I help you today${welcomeName}?`
        }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    try {
      await setDoc(doc(db, 'sessions', newId), sanitizeData(newSession));
      setActiveSessionId(newId);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `sessions/${newId}`);
    }
  };

  const saveSessionFile = async (sessionId: string, data: string, mimeType: string): Promise<string> => {
    const fileId = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    const sessionFile: SessionFile = {
      id: fileId,
      sessionId,
      data,
      mimeType,
      createdAt: Date.now()
    };
    try {
      await setDoc(doc(db, 'session_files', fileId), sanitizeData(sessionFile));
      return fileId;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `session_files/${fileId}`);
      throw error;
    }
  };

  const updateSessionMessages = async (sessionId: string, messages: Message[]) => {
    if (!user) return;
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    let newTitle = session.title;
    if (session.title === 'New Chat') {
      const firstUserMsg = messages.find(m => m.role === 'user');
      if (firstUserMsg) {
        newTitle = firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
      }
    }

    // Handle large files by moving them to session_files collection
    const processedMessages = await Promise.all(messages.map(async (msg) => {
      const updatedMsg = { ...msg };
      
      // If file is present and is a base64 string, save it separately
      if (updatedMsg.file && updatedMsg.file.startsWith('data:')) {
        const parts = updatedMsg.file.split(',');
        const mime = parts[0].split(':')[1].split(';')[0];
        const b64 = parts[1];
        
        // Only move to separate collection if it's large or if we want to be safe
        // For now, let's move all images to be safe from the 1MB limit
        try {
          const fileId = await saveSessionFile(sessionId, b64, mime);
          updatedMsg.fileId = fileId;
          delete updatedMsg.file; // Remove base64 from session doc
        } catch (e) {
          console.error("Failed to save session file:", e);
        }
      }

      if (updatedMsg.beforeFile && updatedMsg.beforeFile.startsWith('data:')) {
        const parts = updatedMsg.beforeFile.split(',');
        const mime = parts[0].split(':')[1].split(';')[0];
        const b64 = parts[1];
        
        try {
          const fileId = await saveSessionFile(sessionId, b64, mime);
          updatedMsg.beforeFileId = fileId;
          delete updatedMsg.beforeFile; // Remove base64 from session doc
        } catch (e) {
          console.error("Failed to save session beforeFile:", e);
        }
      }

      return updatedMsg;
    }));

    const updatedSession = sanitizeData({
      ...session,
      messages: processedMessages,
      title: newTitle,
      updatedAt: Date.now()
    });

    try {
      await setDoc(doc(db, 'sessions', sessionId), updatedSession);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `sessions/${sessionId}`);
    }
  };

  const activeSession = sessions.find(s => s.id === activeSessionId);

  const handleGoogleLogin = async () => {
    setAuthError(null);
    setVerificationSent(false);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login failed", error);
      setAuthError(error.message || "Google login failed");
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    setVerificationSent(false);

    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) {
          await updateProfile(userCredential.user, { displayName });
        }
        await sendEmailVerification(userCredential.user);
        await signOut(auth);
        setVerificationSent(true);
        setIsSignUp(false);
        setEmail('');
        setPassword('');
        setDisplayName('');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      console.error("Auth failed", error);
      setAuthError(error.message || "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (user) {
      try {
        setAuthLoading(true);
        await sendEmailVerification(user);
        alert("Verification email sent!");
      } catch (error: any) {
        setAuthError(error.message || "Failed to resend verification");
      } finally {
        setAuthLoading(false);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setVerificationSent(false);
      setIsSettingsOpen(false);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newDisplayName.trim() || isUpdatingName) return;

    setIsUpdatingName(true);
    try {
      await updateProfile(user, { displayName: newDisplayName });
      // Force a re-render by updating the user state
      setUser({ ...user, displayName: newDisplayName });
      setIsSettingsOpen(false);
    } catch (error: any) {
      console.error("Failed to update name", error);
      setAuthError(error.message || "Failed to update name");
    } finally {
      setIsUpdatingName(false);
    }
  };

  const exportChatHistory = (format: 'json' | 'text') => {
    if (!activeSession) return;
    
    let content = '';
    let fileName = `chat-history-${activeSession.id}`;
    
    if (format === 'json') {
      content = JSON.stringify(activeSession.messages, null, 2);
      fileName += '.json';
    } else {
      content = activeSession.messages.map(m => 
        `[${m.role.toUpperCase()}]\n${m.content}\n${m.image ? `[Image attached]\n` : ''}\n`
      ).join('-------------------\n');
      fileName += '.txt';
    }

    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyChatHistory = () => {
    if (!activeSession) return;
    const content = activeSession.messages.map(m => 
      `[${m.role.toUpperCase()}]\n${m.content}\n`
    ).join('\n');
    
    navigator.clipboard.writeText(content).then(() => {
      alert("Chat history copied to clipboard!");
    });
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-brand-bg text-brand-ink">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-900 animate-pulse">
            <Zap size={24} />
          </div>
          <span className="text-sm font-medium animate-pulse">Initializing mova ai...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-brand-bg text-brand-ink p-4 overflow-y-auto">
        <div className="max-w-md w-full glass-panel p-8 rounded-3xl flex flex-col items-center gap-6 my-8">
          <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center text-zinc-900 shadow-xl">
            <Zap size={32} />
          </div>
          
          {verificationSent ? (
            <div className="space-y-6 text-center w-full">
              <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight text-emerald-400">Verify your email</h1>
                <p className="text-zinc-400 text-sm">
                  We've sent a verification link to your email. Please check your inbox and verify your account.
                </p>
              </div>
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <p className="text-emerald-400 text-xs font-medium">Check your email & verify, then log in</p>
              </div>
              <button 
                onClick={() => setVerificationSent(false)}
                className="w-full bg-zinc-100 text-zinc-900 py-3 rounded-xl font-semibold hover:bg-white transition-all shadow-lg"
              >
                Login
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-2 text-center">
                <h1 className="text-2xl font-bold tracking-tight">
                  {isSignUp ? 'Create an account' : 'Welcome back'}
                </h1>
                <p className="text-zinc-400 text-sm">
                  {isSignUp ? 'Join mova ai to start your journey' : 'Sign in to continue your intelligent journey'}
                </p>
              </div>

              <form onSubmit={handleEmailAuth} className="w-full space-y-4">
                {isSignUp && (
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-white/20 transition-colors"
                      required={isSignUp}
                    />
                  </div>
                )}
                
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-white/20 transition-colors"
                    required
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-white/20 transition-colors"
                    required
                  />
                </div>

                {authError && (
                  <p className="text-red-400 text-xs text-center px-2">{authError}</p>
                )}

                <button 
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-zinc-100 text-zinc-900 py-3 rounded-xl font-semibold hover:bg-white transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {authLoading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
                </button>
              </form>

              <div className="w-full flex items-center gap-4">
                <div className="h-px flex-1 bg-white/5" />
                <span className="text-[10px] text-zinc-500 uppercase font-bold">OR</span>
                <div className="h-px flex-1 bg-white/5" />
              </div>

              <button 
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 bg-zinc-900 border border-white/10 text-zinc-100 py-3 rounded-xl font-medium hover:bg-zinc-800 transition-all"
              >
                <LogIn size={20} />
                Continue with Google
              </button>

              <p className="text-sm text-zinc-400">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button 
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setAuthError(null);
                  }}
                  className="text-zinc-100 font-semibold hover:underline"
                >
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </button>
              </p>
            </>
          )}

          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Secure Authentication via Firebase</p>
        </div>
      </div>
    );
  }

  if (user && !user.emailVerified) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-brand-bg text-brand-ink p-4">
        <div className="max-w-md w-full glass-panel p-8 rounded-3xl flex flex-col items-center gap-6 text-center">
          <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 shadow-xl border border-amber-500/20">
            <Mail size={32} />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-amber-500">Verify your email</h1>
            <p className="text-zinc-400 text-sm">
              Your email address <strong>{user.email}</strong> is not verified yet. Please check your inbox for the verification link.
            </p>
          </div>
          
          <div className="w-full space-y-3">
            <button 
              onClick={handleResendVerification}
              disabled={authLoading}
              className="w-full bg-zinc-100 text-zinc-900 py-3 rounded-xl font-semibold hover:bg-white transition-all shadow-lg disabled:opacity-50"
            >
              {authLoading ? 'Sending...' : 'Resend Verification Email'}
            </button>
            <button 
              onClick={handleLogout}
              className="w-full bg-zinc-900 border border-white/10 text-zinc-100 py-3 rounded-xl font-medium hover:bg-zinc-800 transition-all"
            >
              Back to Login
            </button>
          </div>
          
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Email Verification Required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-brand-bg overflow-hidden text-brand-ink">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ 
          width: isSidebarOpen ? 260 : 0,
          x: isSidebarOpen ? 0 : -260
        }}
        transition={{ type: 'spring', damping: 20, stiffness: 150 }}
        className="fixed lg:relative inset-y-0 left-0 z-50 bg-zinc-950 border-r border-white/5 flex flex-col overflow-hidden"
      >
        <div className="p-4 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center text-zinc-900">
              <Zap size={18} />
            </div>
            <h1 className="font-semibold text-sm tracking-tight text-zinc-100">mova ai</h1>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1 hover:bg-zinc-800 rounded-md transition-colors text-zinc-400"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          <button 
            onClick={createNewChat}
            className="w-full flex items-center gap-3 p-2.5 rounded-lg transition-all text-sm text-zinc-100 bg-zinc-800 hover:bg-zinc-700 font-medium mb-4"
          >
            <Plus size={16} />
            <span>New Chat</span>
          </button>
          
          <div className="py-2 px-3">
            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">History</span>
          </div>
          
          <div className="space-y-1">
            {sessions.map(session => (
              <button 
                key={session.id}
                onClick={() => {
                  setActiveSessionId(session.id);
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-all text-sm ${
                  activeSessionId === session.id 
                    ? 'bg-zinc-800/50 text-zinc-100 font-medium border border-white/5' 
                    : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
                }`}
              >
                <MessageSquare size={16} />
                <span className="truncate text-left flex-1">{session.title}</span>
              </button>
            ))}
          </div>
        </nav>

        <div className="p-2 border-t border-white/5">
          <div className="flex items-center gap-3 p-2.5 mb-2">
            <img 
              src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'User'}`} 
              alt="Profile" 
              className="w-8 h-8 rounded-full border border-white/10"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate">{user.displayName || 'Anonymous'}</p>
              <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-2.5 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors text-sm"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
          <button 
            onClick={() => {
              setNewDisplayName(user.displayName || '');
              setIsSettingsOpen(true);
            }}
            className="w-full flex items-center gap-3 p-2.5 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors text-sm"
          >
            <Settings size={16} />
            <span>Settings</span>
          </button>
        </div>
      </motion.aside>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-zinc-100">Settings</h2>
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-500"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUpdateName} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Display Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                    <input
                      type="text"
                      placeholder="Enter your name"
                      value={newDisplayName}
                      onChange={(e) => setNewDisplayName(e.target.value)}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-zinc-100 focus:outline-none focus:border-white/20 transition-colors"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500">This name will be used to personalize your experience.</p>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(false)}
                    className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold text-zinc-400 hover:bg-zinc-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingName || !newDisplayName.trim()}
                    className="flex-1 bg-zinc-100 text-zinc-900 px-4 py-3 rounded-xl text-sm font-semibold hover:bg-white transition-all shadow-lg disabled:opacity-50"
                  >
                    {isUpdatingName ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>

              <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Chat Export</label>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => exportChatHistory('json')}
                    disabled={!activeSession}
                    className="flex items-center justify-between w-full p-3 bg-zinc-950 border border-white/5 rounded-xl text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all group disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <Download size={16} className="text-zinc-500 group-hover:text-zinc-300" />
                      <span>Export as JSON</span>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-600">.json</span>
                  </button>
                  
                  <button
                    onClick={() => exportChatHistory('text')}
                    disabled={!activeSession}
                    className="flex items-center justify-between w-full p-3 bg-zinc-950 border border-white/5 rounded-xl text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all group disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <Download size={16} className="text-zinc-500 group-hover:text-zinc-300" />
                      <span>Export as Text</span>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-600">.txt</span>
                  </button>

                  <button
                    onClick={copyChatHistory}
                    disabled={!activeSession}
                    className="flex items-center justify-between w-full p-3 bg-zinc-950 border border-white/5 rounded-xl text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all group disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <Copy size={16} className="text-zinc-500 group-hover:text-zinc-300" />
                      <span>Copy to Clipboard</span>
                    </div>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative bg-brand-bg">
        {/* Mobile Header */}
        <header className="h-14 flex items-center justify-between px-4 border-b border-white/5 lg:border-none">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 lg:hidden"
          >
            <Menu size={20} />
          </button>
          
          <div className="flex items-center gap-1.5 lg:hidden text-zinc-100">
            <span className="font-semibold text-sm">mova ai</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-white/5 text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 bg-brand-accent rounded-full" />
              System Online
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-hidden relative">
          {activeSession ? (
            <div key={activeSession.id} className="h-full">
              <ChatInterface 
                initialMessages={activeSession.messages}
                onUpdateMessages={(msgs) => updateSessionMessages(activeSession.id, msgs)}
              />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-zinc-500">
              Select or start a new chat
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <button className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-all text-sm ${
      active 
        ? 'bg-zinc-800 text-zinc-100 font-medium' 
        : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
    }`}>
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}
