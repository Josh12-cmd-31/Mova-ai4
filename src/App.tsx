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
  LogOut
} from 'lucide-react';
import ChatInterface from './components/ChatInterface';
import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged, User } from './services/firebase';

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
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
      <div className="h-screen w-screen flex items-center justify-center bg-brand-bg text-brand-ink p-4">
        <div className="max-w-md w-full glass-panel p-8 rounded-3xl flex flex-col items-center text-center gap-6">
          <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center text-zinc-900 shadow-xl">
            <Zap size={32} />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Welcome to mova ai</h1>
            <p className="text-zinc-400 text-sm">Sign in to start your intelligent journey.</p>
          </div>
          <button 
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-zinc-100 text-zinc-900 py-3 rounded-xl font-semibold hover:bg-white transition-all shadow-lg"
          >
            <LogIn size={20} />
            Continue with Google
          </button>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Secure Authentication via Firebase</p>
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
          <NavItem icon={<MessageSquare size={16} />} label="New Chat" active />
          <div className="py-2 px-3">
            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">History</span>
          </div>
          <NavItem icon={<MessageSquare size={16} />} label="Previous analysis" />
          <NavItem icon={<ImageIcon size={16} />} label="Image generation" />
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
          <button className="w-full flex items-center gap-3 p-2.5 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors text-sm">
            <Settings size={16} />
            <span>Settings</span>
          </button>
        </div>
      </motion.aside>

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
          <ChatInterface />
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
