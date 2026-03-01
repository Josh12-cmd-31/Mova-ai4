import React, { useState } from 'react';
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
  Cpu
} from 'lucide-react';
import ChatInterface from './components/ChatInterface';

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-white overflow-hidden text-zinc-900">
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
        className="fixed lg:relative inset-y-0 left-0 z-50 bg-zinc-50 border-r border-zinc-200 flex flex-col overflow-hidden"
      >
        <div className="p-4 flex items-center justify-between border-b border-zinc-200/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center text-white">
              <Zap size={18} />
            </div>
            <h1 className="font-semibold text-sm tracking-tight">mova ai</h1>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1 hover:bg-zinc-200 rounded-md transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          <NavItem icon={<MessageSquare size={16} />} label="New Chat" active />
          <div className="py-2 px-3">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">History</span>
          </div>
          <NavItem icon={<MessageSquare size={16} />} label="Previous analysis" />
          <NavItem icon={<ImageIcon size={16} />} label="Image generation" />
        </nav>

        <div className="p-2 border-t border-zinc-200/50">
          <button className="w-full flex items-center gap-3 p-2.5 rounded-lg text-zinc-600 hover:bg-zinc-200 transition-colors text-sm">
            <Settings size={16} />
            <span>Settings</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative bg-white">
        {/* Mobile Header */}
        <header className="h-14 flex items-center justify-between px-4 border-b border-zinc-100 lg:border-none">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 hover:bg-zinc-100 rounded-lg transition-colors text-zinc-500 lg:hidden"
          >
            <Menu size={20} />
          </button>
          
          <div className="flex items-center gap-1.5 lg:hidden">
            <span className="font-semibold text-sm">mova ai</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-50 border border-zinc-200 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
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
        ? 'bg-zinc-200 text-zinc-900 font-medium' 
        : 'text-zinc-600 hover:bg-zinc-200'
    }`}>
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}
