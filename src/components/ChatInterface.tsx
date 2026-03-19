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
  Cpu,
  Volume2,
  VolumeX,
  Mic,
  MicOff
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  
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
    const currentInput = input;
    const currentImage = selectedImage;
    const currentMime = imageMimeType;
    
    setInput('');
    if (!isEditingMode) {
      setSelectedImage(null);
    }
    
    await executeRequest(currentInput, currentImage, currentMime);
  };

  const handleRetry = async (errorMsgId: string) => {
    const errorIndex = messages.findIndex(m => m.id === errorMsgId);
    if (errorIndex <= 0) return;
    
    const userMsg = messages[errorIndex - 1];
    if (userMsg.role !== 'user') return;

    // Remove the error message
    setMessages(prev => prev.filter(m => m.id !== errorMsgId));
    
    let b64 = null;
    let mime = '';
    if (userMsg.image && userMsg.image.startsWith('data:')) {
      const parts = userMsg.image.split(',');
      mime = parts[0].split(':')[1].split(';')[0];
      b64 = parts[1];
    }

    await executeRequest(userMsg.content, b64, mime);
  };

  const handleSpeak = (text: string, msgId: string) => {
    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);
    
    setSpeakingMsgId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleSpeechToText = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in your browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        setInput(prev => prev + (prev ? ' ' : '') + finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const executeRequest = async (text: string, image: string | null, mime: string) => {
    setIsLoading(true);

    try {
      let responseText = "";
      let editedImage: string | null = null;

      if (image) {
        if (isEditingMode) {
          const result = await editImage(image, text || "Enhance this image", selectedImageModel);
          responseText = result.textResponse || "I've processed your image edit request.";
          editedImage = result.editedImageB64;
        } else {
          responseText = await analyzeImage(image, text);
        }
      } else if (isGenerationMode) {
        const result = await generateImage(text, selectedImageModel);
        responseText = result.textResponse || "I've generated an image for you.";
        editedImage = result.generatedImageB64;
      } else if (isOrchestrationMode) {
        const response = await fetch('/api/orchestrate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: text })
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Orchestration failed");
        }
        const data = await response.json();
        responseText = data.finalResult;
      } else {
        responseText = await chatWithGemini(text, messages, selectedChatModel);
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
          {/* Gallery Button */}
          <button 
            onClick={() => setIsGalleryOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 rounded-full border border-white/5 text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <ImageIcon size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Gallery</span>
          </button>

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
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Active Chat Model</span>
                  </div>
                  <div className="text-xs font-semibold text-zinc-100">
                    {isOrchestrationMode ? "4-Agent Orchestrator" : selectedChatModel.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')}
                  </div>
                </div>
                <div className="h-px bg-white/5" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <ImageIcon size={12} className="text-zinc-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Active Visual Model</span>
                  </div>
                  <div className="text-xs font-semibold text-zinc-100">
                    {selectedImageModel.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')}
                  </div>
                </div>
              </div>
            </div>
          </div>
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
                      {msg.isError ? (
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-2 text-red-600 font-bold text-[10px] uppercase tracking-wider">
                            <AlertCircle size={12} />
                            System Error: {msg.errorCode}
                          </div>
                          <div className="prose prose-sm max-w-none prose-zinc leading-relaxed text-red-400/80">
                            {msg.content.split('\n').map((line, i) => (
                              <p key={i} className="mb-3 last:mb-0">{line}</p>
                            ))}
                          </div>
                          <button
                            onClick={() => handleRetry(msg.id)}
                            disabled={isLoading}
                            className="flex items-center gap-2 self-start px-3 py-1.5 bg-red-950/30 border border-red-900/50 rounded-lg text-[10px] font-bold uppercase tracking-wider text-red-400 hover:bg-red-900/40 transition-all disabled:opacity-50"
                          >
                            <RefreshCcw size={12} className={isLoading ? "animate-spin" : ""} />
                            Retry Request
                          </button>
                        </div>
                      ) : (
                        <>
                          {msg.image && (
                            <div className="mb-3 relative group cursor-pointer" onClick={() => setFullscreenImage(msg.image || null)}>
                              <img 
                                src={msg.image} 
                                alt="Uploaded content" 
                                className="rounded-xl max-h-80 object-contain bg-zinc-900 border border-white/5 shadow-sm transition-transform group-hover:scale-[1.01]"
                              />
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                                <Maximize2 size={24} className="text-white" />
                              </div>
                            </div>
                          )}
                          <div className="prose prose-sm max-w-none prose-zinc leading-relaxed">
                            {msg.content.split('\n').map((line, i) => (
                              <p key={i} className="mb-3 last:mb-0">{line}</p>
                            ))}
                          </div>
                          {msg.role === 'assistant' && !msg.isError && (
                            <div className="mt-3 flex items-center gap-2">
                              <button
                                onClick={() => handleSpeak(msg.content, msg.id)}
                                className={`p-2 rounded-lg transition-all ${
                                  speakingMsgId === msg.id 
                                    ? 'bg-zinc-100 text-zinc-900' 
                                    : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
                                }`}
                                title={speakingMsgId === msg.id ? "Stop Speaking" : "Read Aloud"}
                              >
                                {speakingMsgId === msg.id ? <VolumeX size={14} /> : <Volume2 size={14} />}
                              </button>
                            </div>
                          )}
                        </>
                      )}
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
          {/* Unified Model & Tools Menu */}
      <AnimatePresence>
        {isGalleryOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            className="fixed inset-y-0 right-0 w-full sm:w-96 bg-zinc-950 border-l border-white/5 z-50 flex flex-col shadow-2xl"
          >
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-zinc-950/80 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <ImageIcon size={18} className="text-zinc-400" />
                <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-100">Image Gallery</h2>
              </div>
              <button 
                onClick={() => setIsGalleryOpen(false)}
                className="p-2 hover:bg-white/5 rounded-full transition-colors text-zinc-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
              {messages.filter(m => m.image).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-4">
                  <ImageIcon size={48} strokeWidth={1} />
                  <p className="text-xs font-medium">No images in this session yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {messages.filter(m => m.image).map((msg, idx) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="relative aspect-square rounded-xl overflow-hidden bg-zinc-900 border border-white/5 group cursor-pointer"
                      onClick={() => setFullscreenImage(msg.image || null)}
                    >
                      <img 
                        src={msg.image} 
                        alt="Gallery item" 
                        className="w-full h-full object-cover transition-transform group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Maximize2 size={18} className="text-white" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen Lightbox */}
      <AnimatePresence>
        {fullscreenImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-4 md:p-12"
          >
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <a 
                href={fullscreenImage} 
                download="mova-ai-export.png"
                className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all backdrop-blur-md"
                title="Download Image"
              >
                <Download size={20} />
              </a>
              <button 
                onClick={() => setFullscreenImage(null)}
                className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all backdrop-blur-md"
              >
                <X size={20} />
              </button>
            </div>
            
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              src={fullscreenImage}
              alt="Fullscreen view"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unified Model & Tools Menu */}
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute bottom-full left-0 mb-4 w-80 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
              >
                <div className="p-4 space-y-6">
                  {/* File Upload Section */}
                  <div>
                    <button
                      onClick={() => {
                        fileInputRef.current?.click();
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 p-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-zinc-700 flex items-center justify-center text-zinc-300 group-hover:text-white transition-colors">
                        <Plus size={20} />
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-bold text-zinc-100">Upload Media</div>
                        <div className="text-[10px] text-zinc-500">Images for analysis or editing</div>
                      </div>
                    </button>
                  </div>

                  {/* Chat Models */}
                  <div>
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <Cpu size={14} className="text-zinc-500" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Intelligence Engine</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { id: 'gemini-3.1-pro-preview', name: 'Pro 3.1', desc: 'Best for complex reasoning', tag: 'Smartest' },
                        { id: 'gemini-3-flash-preview', name: 'Flash 3', desc: 'Balanced speed & intelligence', tag: 'Popular' },
                        { id: 'gemini-flash-lite-latest', name: 'Flash Lite', desc: 'Lightweight & ultra-fast', tag: 'Fastest' }
                      ].map(model => (
                        <button
                          key={model.id}
                          onClick={() => {
                            setSelectedChatModel(model.id);
                            setIsMenuOpen(false);
                          }}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                            selectedChatModel === model.id 
                              ? 'bg-zinc-100 border-zinc-100 text-zinc-900' 
                              : 'bg-zinc-800/30 border-white/5 text-zinc-400 hover:bg-zinc-800'
                          }`}
                        >
                          <div className="text-left">
                            <div className="text-xs font-bold">{model.name}</div>
                            <div className={`text-[10px] ${selectedChatModel === model.id ? 'text-zinc-600' : 'text-zinc-500'}`}>{model.desc}</div>
                          </div>
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            selectedChatModel === model.id ? 'bg-zinc-900/10 text-zinc-900' : 'bg-zinc-900 text-zinc-500'
                          }`}>
                            {model.tag}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Visual Models */}
                  <div>
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <ImageIcon size={14} className="text-zinc-500" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Visual Engine</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { id: 'gemini-3-pro-image-preview', name: 'Pro Image', desc: 'Highest detail & quality', tag: 'Best' },
                        { id: 'gemini-3.1-flash-image-preview', name: 'Flash HQ', desc: 'High quality & flexible', tag: 'HQ' },
                        { id: 'gemini-2.5-flash-image', name: 'Flash Image', desc: 'Fast generation', tag: 'Fast' },
                        { id: 'imagen-4.0-generate-001', name: 'Imagen 4', desc: 'Photorealistic results', tag: 'New' }
                      ].map(model => (
                        <button
                          key={model.id}
                          onClick={() => {
                            setSelectedImageModel(model.id);
                            setIsMenuOpen(false);
                          }}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                            selectedImageModel === model.id 
                              ? 'bg-zinc-100 border-zinc-100 text-zinc-900' 
                              : 'bg-zinc-800/30 border-white/5 text-zinc-400 hover:bg-zinc-800'
                          }`}
                        >
                          <div className="text-left">
                            <div className="text-xs font-bold">{model.name}</div>
                            <div className={`text-[10px] ${selectedImageModel === model.id ? 'text-zinc-600' : 'text-zinc-500'}`}>{model.desc}</div>
                          </div>
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            selectedImageModel === model.id ? 'bg-zinc-900/10 text-zinc-900' : 'bg-zinc-900 text-zinc-500'
                          }`}>
                            {model.tag}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Modes */}
                  <div className="pt-2 border-t border-white/5 flex gap-2">
                    <button
                      onClick={() => {
                        setIsGenerationMode(!isGenerationMode);
                        setIsMenuOpen(false);
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg text-[10px] font-bold uppercase transition-all ${
                        isGenerationMode ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      <Sparkles size={12} />
                      Generate
                    </button>
                    <button
                      onClick={() => {
                        setIsOrchestrationMode(!isOrchestrationMode);
                        setIsMenuOpen(false);
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg text-[10px] font-bold uppercase transition-all ${
                        isOrchestrationMode ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      <Layers size={12} />
                      Orchestrate
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`p-2 transition-all ${
                  isMenuOpen ? 'text-white rotate-45' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Plus size={20} />
              </button>
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
                isRecording
                  ? "Listening..."
                  : selectedImage 
                    ? (isEditingMode ? "Describe edits..." : "Ask about image...") 
                    : (isGenerationMode ? "Describe image to generate..." : isOrchestrationMode ? "Describe complex task for orchestration..." : "Message mova ai...")
              }
              className={`flex-1 max-h-48 min-h-[40px] py-2 bg-transparent border-none focus:ring-0 text-sm resize-none ${
                (isGenerationMode || isOrchestrationMode) && !selectedImage ? 'placeholder-zinc-500 text-zinc-100' : 'text-zinc-100'
              }`}
              rows={1}
            />

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleSpeechToText}
                className={`p-2 rounded-full transition-all ${
                  isRecording 
                    ? 'bg-red-500/20 text-red-500 animate-pulse' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title={isRecording ? "Stop Recording" : "Voice Input"}
              >
                {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
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
            </div>
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
