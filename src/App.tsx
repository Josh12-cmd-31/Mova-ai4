import React, { useState } from 'react';
import { motion } from 'motion/react';
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-brand-bg overflow-hidden">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        className="bg-white border-r border-zinc-200 flex flex-col overflow-hidden"
      >
        <div className="p-6 flex items-center gap-3 border-b border-zinc-100">
          <div className="w-10 h-10 bg-brand-ink rounded-xl flex items-center justify-center text-white">
            <Zap size={24} />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">mova ai</h1>
            <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest">Strategic Intel</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavItem icon={<MessageSquare size={18} />} label="Intelligence Chat" active />
          <NavItem icon={<ImageIcon size={18} />} label="Visual Lab" />
          <NavItem icon={<LayoutDashboard size={18} />} label="Strategic Analysis" />
          
          <div className="pt-8 pb-2 px-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Capabilities</span>
          </div>
          <NavItem icon={<Cpu size={18} />} label="Neural Processing" />
          <NavItem icon={<Shield size={18} />} label="Secure Analysis" />
        </nav>

        <div className="p-4 border-t border-zinc-100">
          <button className="w-full flex items-center gap-3 p-3 rounded-xl text-zinc-500 hover:bg-zinc-50 transition-colors">
            <Settings size={18} />
            <span className="text-sm font-medium">System Settings</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className="h-16 bg-white/50 backdrop-blur-sm border-b border-zinc-200 flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-zinc-100 rounded-lg transition-colors text-zinc-500"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-brand-accent rounded-full animate-pulse" />
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">System Online</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-bold">Expert Reasoning</span>
              <span className="text-[10px] text-zinc-400">v2.5.0-stable</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200" />
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-hidden">
          <ChatInterface />
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <button className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
      active 
        ? 'bg-zinc-900 text-white shadow-md' 
        : 'text-zinc-500 hover:bg-zinc-50'
    }`}>
      {icon}
      <span className="text-sm font-medium">{label}</span>
      {active && <motion.div layoutId="active-pill" className="ml-auto w-1.5 h-1.5 bg-brand-accent rounded-full" />}
    </button>
  );
}
