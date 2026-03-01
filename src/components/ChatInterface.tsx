import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Image as ImageIcon, 
  Paperclip, 
  User, 
  Bot, 
  Loader2, 
  X,
  Wand2,
  Maximize2,
  Download,
  AlertCircle,
  RefreshCcw,
  Plus
} from 'lucide-react';
import { chatWithGemini, analyzeImage, editImage, GeminiError } from '../services/gemini';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  image?: string;
  isEditing?: boolean;
  isError?: boolean;
  errorCode?: string;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello, I am **mova ai**. I am ready to assist you with complex reasoning, document analysis, and advanced image editing. How can I help you today?"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('');
  const [isEditingMode, setIsEditingMode] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setSelectedImage(base64String);
        setImageMimeType(file.type);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      image: selectedImage ? `data:${imageMimeType};base64,${selectedImage}` : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      let responseText = "";
      let editedImage: string | null = null;

      if (selectedImage) {
        if (isEditingMode) {
          const result = await editImage(selectedImage, input || "Enhance this image");
          responseText = result.textResponse || "I've processed your image edit request.";
          editedImage = result.editedImageB64;
        } else {
          responseText = await analyzeImage(selectedImage, input);
        }
      } else {
        responseText = await chatWithGemini(input);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText,
        image: editedImage ? `data:image/png;base64,${editedImage}` : undefined
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      if (editedImage) {
        setSelectedImage(editedImage);
        setImageMimeType('image/png');
      } else {
        if (!isEditingMode) {
          setSelectedImage(null);
        }
      }
    } catch (error) {
      console.error(error);
      let errorMessage = "I encountered an unexpected error processing your request.";
      let errorCode = "UNKNOWN_ERROR";

      if (error instanceof GeminiError) {
        errorMessage = error.message;
        errorCode = error.code || "GEMINI_ERROR";
      }

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: errorMessage,
        isError: true,
        errorCode: errorCode
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chat History */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-hide"
      >
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-4 w-full ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-zinc-200 ${
                    msg.role === 'user' ? 'bg-zinc-100' : 'bg-white'
                  }`}>
                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={`flex-1 min-w-0 ${msg.role === 'user' ? 'flex flex-col items-end' : ''}`}>
                    <div className={`max-w-[90%] md:max-w-[85%] ${
                      msg.role === 'user' 
                        ? 'bg-zinc-100 p-3 rounded-2xl text-zinc-900' 
                        : 'text-zinc-900'
                    }`}>
                      {msg.isError && (
                        <div className="flex items-center gap-2 mb-2 text-red-600 font-bold text-[10px] uppercase tracking-wider">
                          <AlertCircle size={12} />
                          System Error: {msg.errorCode}
                        </div>
                      )}
                      {msg.image && (
                        <div className="mb-3 relative group">
                          <img 
                            src={msg.image} 
                            alt="Uploaded content" 
                            className="rounded-xl max-h-80 object-contain bg-zinc-50 border border-zinc-100 shadow-sm"
                          />
                          <a 
                            href={msg.image} 
                            download="mova-ai-image.png"
                            className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Download size={14} />
                          </a>
                        </div>
                      )}
                      <div className="prose prose-sm max-w-none prose-zinc leading-relaxed">
                        {msg.content.split('\n').map((line, i) => (
                          <p key={i} className="mb-3 last:mb-0">{line}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex gap-4 w-full">
                <div className="w-8 h-8 rounded-full bg-white border border-zinc-200 flex items-center justify-center shrink-0">
                  <Loader2 size={16} className="animate-spin text-zinc-400" />
                </div>
                <div className="flex gap-1.5 items-center h-8">
                  <span className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="max-w-3xl w-full mx-auto px-4 pb-6 pt-2">
        <div className="relative">
          {/* Image Preview */}
          <AnimatePresence>
            {selectedImage && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-full left-0 mb-3 p-2 bg-white border border-zinc-200 rounded-xl shadow-lg flex items-center gap-3"
              >
                <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-zinc-100">
                  <img 
                    src={`data:${imageMimeType};base64,${selectedImage}`} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                  />
                  <button 
                    onClick={() => setSelectedImage(null)}
                    className="absolute top-0 right-0 p-0.5 bg-black/50 text-white rounded-bl-lg hover:bg-black/70"
                  >
                    <X size={12} />
                  </button>
                </div>
                <div className="flex flex-col gap-1 pr-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Visual Context</span>
                  <button 
                    onClick={() => setIsEditingMode(!isEditingMode)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase transition-colors ${
                      isEditingMode 
                        ? 'bg-zinc-900 text-white' 
                        : 'bg-zinc-100 text-zinc-600'
                    }`}
                  >
                    {isEditingMode ? <Wand2 size={10} /> : <ImageIcon size={10} />}
                    {isEditingMode ? 'Editing' : 'Analysis'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form 
            onSubmit={handleSubmit}
            className="relative flex items-end gap-2 p-1.5 bg-zinc-100 border border-zinc-200 rounded-3xl focus-within:bg-white focus-within:ring-1 focus-within:ring-zinc-200 transition-all"
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              <Plus size={20} />
            </button>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
            
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder={isEditingMode ? "Describe edits..." : "Message mova ai..."}
              className="flex-1 max-h-48 min-h-[40px] py-2 bg-transparent border-none focus:ring-0 text-sm resize-none"
              rows={1}
            />

            <button
              type="submit"
              disabled={(!input.trim() && !selectedImage) || isLoading}
              className={`p-2 rounded-full transition-all ${
                (!input.trim() && !selectedImage) || isLoading
                  ? 'text-zinc-300'
                  : 'text-white bg-zinc-900 hover:bg-zinc-800 shadow-sm'
              }`}
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </form>
          <div className="mt-2 flex justify-center">
            <span className="text-[10px] text-zinc-400 font-medium">
              mova ai can make mistakes. Check important info.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
