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
  Plus,
  Sparkles,
  Layers,
  Info,
  Cpu
} from 'lucide-react';
import { chatWithGemini, analyzeImage, editImage, generateImage, GeminiError } from '../services/gemini';
import { Message } from '../types';

interface ChatInterfaceProps {
  initialMessages: Message[];
  onUpdateMessages: (messages: Message[]) => void;
}

export default function ChatInterface({ initialMessages, onUpdateMessages }: ChatInterfaceProps): React.JSX.Element {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('');
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [isGenerationMode, setIsGenerationMode] = useState(false);
  const [isOrchestrationMode, setIsOrchestrationMode] = useState(false);
  const [selectedImageModel, setSelectedImageModel] = useState('gemini-2.5-flash-image');
  const [selectedChatModel, setSelectedChatModel] = useState('gemini-3.1-pro-preview');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    onUpdateMessages(messages);
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
          const result = await editImage(selectedImage, input || "Enhance this image", selectedImageModel);
          responseText = result.textResponse || "I've processed your image edit request.";
          editedImage = result.editedImageB64;
        } else {
          responseText = await analyzeImage(selectedImage, input);
        }
      } else if (isGenerationMode) {
        const result = await generateImage(input, selectedImageModel);
        responseText = result.textResponse || "I've generated an image for you.";
        editedImage = result.generatedImageB64;
      } else if (isOrchestrationMode) {
        const response = await fetch('/api/orchestrate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: input })
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Orchestration failed");
        }
        const data = await response.json();
        responseText = data.finalResult;
      } else {
        responseText = await chatWithGemini(input, [], selectedChatModel);
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

      // Safety check: if errorMessage is still a JSON string, try to extract the message
      if (typeof errorMessage === 'string' && errorMessage.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(errorMessage);
          if (parsed.error && parsed.error.message) {
            errorMessage = parsed.error.message;
          } else if (parsed.message) {
            errorMessage = parsed.message;
          }
        } catch (e) {
          // Not valid JSON or no message property, keep original
        }
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
    <div className="flex flex-col h-full bg-brand-bg text-brand-ink">
      {/* Header with Model Selection */}
      <div className="shrink-0 h-14 border-b border-white/5 flex items-center justify-between px-4 bg-brand-bg/80 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-900 font-bold text-xs">
            M
          </div>
          <span className="font-semibold text-sm text-zinc-100">mova ai</span>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Model Status Indicator */}
          <div className="flex items-center gap-3 px-3 py-1.5 bg-zinc-900 rounded-full border border-white/5 group relative cursor-help">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-wider text-zinc-400">System Active</span>
              <Info size={12} className="sm:hidden text-zinc-400" />
            </div>
            
            {/* Tooltip */}
            <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-zinc-900 rounded-xl shadow-xl border border-white/5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Cpu size={12} className="text-zinc-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Chat Engine</span>
                  </div>
                  <div className="text-xs font-semibold text-zinc-100">
                    {isOrchestrationMode ? "4-Agent Orchestrator" : selectedChatModel.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')}
                  </div>
                </div>
                <div className="h-px bg-white/5" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <ImageIcon size={12} className="text-zinc-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Visual Engine</span>
                  </div>
                  <div className="text-xs font-semibold text-zinc-100">
                    {selectedImageModel.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <select 
            value={selectedChatModel}
            onChange={(e) => setSelectedChatModel(e.target.value)}
            className="bg-zinc-900 text-zinc-400 text-[11px] font-bold uppercase px-3 py-1.5 rounded-full border border-white/5 focus:ring-0 cursor-pointer hover:bg-zinc-800 transition-colors"
          >
            <option value="gemini-3.1-pro-preview">Pro 3.1</option>
            <option value="gemini-3-flash-preview">Flash 3</option>
            <option value="gemini-flash-lite-latest">Flash Lite</option>
          </select>
        </div>
      </div>

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
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-white/5 ${
                    msg.role === 'user' ? 'bg-zinc-800' : 'bg-zinc-900'
                  }`}>
                    {msg.role === 'user' ? <User size={16} className="text-zinc-400" /> : <Bot size={16} className="text-zinc-400" />}
                  </div>
                  <div className={`flex-1 min-w-0 ${msg.role === 'user' ? 'flex flex-col items-end' : ''}`}>
                    <div className={`max-w-[90%] md:max-w-[85%] ${
                      msg.role === 'user' 
                        ? 'bg-zinc-800 p-3 rounded-2xl text-zinc-100' 
                        : 'text-zinc-100'
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
                            className="rounded-xl max-h-80 object-contain bg-zinc-900 border border-white/5 shadow-sm"
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
                <div className="w-8 h-8 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center shrink-0">
                  <Loader2 size={16} className="animate-spin text-zinc-500" />
                </div>
                <div className="flex gap-1.5 items-center h-8">
                  <span className="w-1.5 h-1.5 bg-zinc-700 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-zinc-700 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-zinc-700 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
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
                className="absolute bottom-full left-0 mb-3 p-2 bg-zinc-900 border border-white/5 rounded-xl shadow-lg flex items-center gap-3"
              >
                <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-white/5">
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
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Visual Context</span>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => setIsEditingMode(!isEditingMode)}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase transition-colors ${
                        isEditingMode 
                          ? 'bg-zinc-100 text-zinc-900' 
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {isEditingMode ? <Wand2 size={10} /> : <ImageIcon size={10} />}
                      {isEditingMode ? 'Editing' : 'Analysis'}
                    </button>
                    {isEditingMode && (
                      <select 
                        value={selectedImageModel}
                        onChange={(e) => setSelectedImageModel(e.target.value)}
                        className="bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase px-2 py-1 rounded-md border-none focus:ring-0"
                      >
                        <option value="gemini-2.5-flash-image">Flash</option>
                        <option value="gemini-3.1-flash-image-preview">Flash HQ</option>
                        <option value="gemini-3-pro-image-preview">Pro</option>
                      </select>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form 
            onSubmit={handleSubmit}
            className={`relative flex items-end gap-2 p-1.5 border rounded-3xl transition-all ${
              (isGenerationMode || isOrchestrationMode) && !selectedImage
                ? 'bg-zinc-900 border-white/10 text-white focus-within:ring-zinc-700'
                : 'bg-zinc-900 border-white/5 focus-within:bg-zinc-800 focus-within:ring-white/10'
            }`}
          >
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`p-2 transition-colors ${
                  (isGenerationMode || isOrchestrationMode) && !selectedImage ? 'text-zinc-500 hover:text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Plus size={20} />
              </button>
              {!selectedImage && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsGenerationMode(!isGenerationMode)}
                    className={`p-2 transition-colors ${
                      isGenerationMode ? 'text-brand-accent' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                    title="Toggle Image Generation"
                  >
                    <Sparkles size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOrchestrationMode(!isOrchestrationMode)}
                    className={`p-2 transition-colors ${
                      isOrchestrationMode ? 'text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                    title="Toggle Sequential Orchestration"
                  >
                    <Layers size={18} />
                  </button>
                  {(isGenerationMode || isOrchestrationMode) && (
                    <select 
                      value={selectedImageModel}
                      onChange={(e) => setSelectedImageModel(e.target.value)}
                      className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md border-none focus:ring-0 transition-colors ${
                        isGenerationMode || isOrchestrationMode ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      <option value="gemini-2.5-flash-image">Flash</option>
                      <option value="gemini-3.1-flash-image-preview">Flash HQ</option>
                      <option value="gemini-3-pro-image-preview">Pro</option>
                      <option value="imagen-4.0-generate-001">Imagen 4</option>
                    </select>
                  )}
                </div>
              )}
            </div>
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
              placeholder={
                selectedImage 
                  ? (isEditingMode ? "Describe edits..." : "Ask about image...") 
                  : (isGenerationMode ? "Describe image to generate..." : isOrchestrationMode ? "Describe complex task for orchestration..." : "Message mova ai...")
              }
              className={`flex-1 max-h-48 min-h-[40px] py-2 bg-transparent border-none focus:ring-0 text-sm resize-none ${
                (isGenerationMode || isOrchestrationMode) && !selectedImage ? 'placeholder-zinc-500 text-zinc-100' : 'text-zinc-100'
              }`}
              rows={1}
            />

            <button
              type="submit"
              disabled={(!input.trim() && !selectedImage) || isLoading}
              className={`p-2 rounded-full transition-all ${
                (!input.trim() && !selectedImage) || isLoading
                  ? 'text-zinc-700'
                  : (isGenerationMode || isOrchestrationMode) && !selectedImage
                    ? 'text-zinc-900 bg-zinc-100 hover:bg-white shadow-sm'
                    : 'text-zinc-900 bg-zinc-100 hover:bg-white shadow-sm'
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
