import React, { useState, useRef, useEffect } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Paperclip, 
  User, 
  Bot, 
  Loader2, 
  X,
  Download,
  AlertCircle,
  RefreshCcw,
  Plus,
  Layers,
  Info,
  Cpu,
  FileText,
  Music,
  Video,
  File,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  MessageSquare,
  ChevronDown,
  Settings2,
  Globe
} from 'lucide-react';
import { chatWithGemini, analyzeFile, GeminiError } from '../services/gemini';
import { OrchestrationService, OrchestrationConfig } from '../services/orchestrationService';
import { Message, SessionFile } from '../types';
import { db, handleFirestoreError, OperationType, auth } from '../services/firebase';
import { getDoc, doc, collection, query, where, onSnapshot } from 'firebase/firestore';

function FileImage({ fileId, alt, className }: { fileId: string; alt: string; className?: string }) {
  const { t } = useTranslation();
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadFile = async () => {
      try {
        const docRef = doc(db, 'session_files', fileId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const fileData = docSnap.data() as SessionFile;
          const url = `data:${fileData.mimeType};base64,${fileData.data}`;
          setDataUrl(url);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error(t('error_loading_file_console'), err);
        setError(true);
      }
    };
    loadFile();
  }, [fileId]);

  if (error) return <div className="flex items-center justify-center bg-zinc-800 rounded-lg aspect-square text-white/30 text-xs">{t('error_occurred')}</div>;
  if (!dataUrl) return <div className="flex items-center justify-center bg-zinc-800 rounded-lg aspect-square"><Loader2 className="w-4 h-4 animate-spin text-white/30" /></div>;

  return <img src={dataUrl} alt={alt} className={className} referrerPolicy="no-referrer" />;
}

interface ChatInterfaceProps {
  initialMessages: Message[];
  onUpdateMessages: (messages: Message[]) => void;
  onOpenOrchestrationSettings?: () => void;
}

export default function ChatInterface({ initialMessages, onUpdateMessages, onOpenOrchestrationSettings }: ChatInterfaceProps): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileMimeType, setFileMimeType] = useState<string>('');
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [isOrchestrationMode, setIsOrchestrationMode] = useState(false);

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      const docRef = doc(db, 'session_files', fileId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const fileData = docSnap.data() as SessionFile;
        const url = `data:${fileData.mimeType};base64,${fileData.data}`;
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error(t('download_failed_console'), err);
    }
  };
  const [selectedChatModel, setSelectedChatModel] = useState('gemini-3.1-pro-preview');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [isAdvancedSettingsOpen, setIsAdvancedSettingsOpen] = useState(false);
  const [useSearch, setUseSearch] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [orchestrationConfigs, setOrchestrationConfigs] = useState<OrchestrationConfig[]>([]);
  const [selectedOrchestrationConfig, setSelectedOrchestrationConfig] = useState<OrchestrationConfig | null>(null);
  const recognitionRef = useRef<any>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    onUpdateMessages(messages);
  }, [messages]);

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Paperclip size={20} />;
    if (mimeType.startsWith('video/')) return <Video size={20} />;
    if (mimeType.startsWith('audio/')) return <Music size={20} />;
    if (mimeType === 'application/pdf') return <FileText size={20} />;
    return <File size={20} />;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 10MB for images, 1MB for others)
      const isImage = file.type.startsWith('image/');
      const maxSize = isImage ? 10 * 1024 * 1024 : 1024 * 1024;
      
      if (file.size > maxSize) {
        alert(isImage ? t('image_too_large') : t('file_too_large'));
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setSelectedFile(base64String);
        setFileMimeType(file.type);
        setSelectedFileName(file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && !selectedFile) || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      file: selectedFile ? `data:${fileMimeType};base64,${selectedFile}` : undefined,
      fileName: selectedFileName,
      fileMimeType: fileMimeType
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    const currentFile = selectedFile;
    const currentMime = fileMimeType;
    
    setInput('');
    setSelectedFile(null);
    setSelectedFileName('');
    
    await executeRequest(currentInput, currentFile, currentMime);
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
    if (userMsg.file && userMsg.file.startsWith('data:')) {
      const parts = userMsg.file.split(',');
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
    const getLanguageCode = () => {
      switch (i18n.language) {
        case 'es': return 'es-ES';
        case 'fr': return 'fr-FR';
        default: return 'en-US';
      }
    };

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getLanguageCode();
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
      alert(t('speech_not_supported'));
      return;
    }

    const getLanguageCode = () => {
      switch (i18n.language) {
        case 'es': return 'es-ES';
        case 'fr': return 'fr-FR';
        default: return 'en-US';
      }
    };

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = getLanguageCode();

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
      console.error(t('speech_error_console'), event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'orchestration_configs'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const configs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as OrchestrationConfig[];
      setOrchestrationConfigs(configs);
      
      const defaultConfig = configs.find(c => c.isDefault) || configs[0] || null;
      if (defaultConfig && !selectedOrchestrationConfig) {
        setSelectedOrchestrationConfig(defaultConfig);
      }
    });

    return () => unsubscribe();
  }, [auth.currentUser]);

  const executeRequest = async (text: string, file: string | null, mime: string) => {
    setIsLoading(true);

    try {
      let responseText = "";
      let editedFile: string | null = null;

      if (file) {
        responseText = await analyzeFile(file, text, mime);
      } else if (isOrchestrationMode) {
        const apiKey = process.env.GEMINI_API_KEY || (window as any).process?.env?.API_KEY;
        if (!apiKey) {
          throw new GeminiError(t('gemini_api_key_not_set'), "API_KEY_MISSING");
        }

        const orchestrationService = new OrchestrationService(apiKey);
        
        // Use custom config if available, otherwise use a default one
        const configToUse: OrchestrationConfig = selectedOrchestrationConfig || {
          id: 'default',
          userId: auth.currentUser?.uid || 'anonymous',
          name: 'Default',
          isDefault: true,
          globalContext: `SYSTEM ROLE: You are Mova AI Studio, a coordinated multi-agent system.`,
          agents: [
            { id: '1', name: 'Analyzer', responsibilities: 'Analyze request', outputFormat: 'Summary', model: 'gemini-3.1-pro-preview' },
            { id: '2', name: 'Generator', responsibilities: 'Generate content', outputFormat: 'Draft', model: 'gemini-3.1-pro-preview' },
            { id: '3', name: 'Verifier', responsibilities: 'Verify content', outputFormat: 'Final', model: 'gemini-3.1-pro-preview' }
          ]
        };

        const result = await orchestrationService.runOrchestration(text, configToUse);
        responseText = result.finalResult;
      } else {
        responseText = await chatWithGemini(text, messages, selectedChatModel);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText,
        file: editedFile ? `data:image/png;base64,${editedFile}` : undefined,
        fileMimeType: editedFile ? 'image/png' : undefined
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Don't automatically select the generated/edited file for the next request
      // to avoid cluttering the input area as requested by the user.
    } catch (error: any) {
      console.error(t('request_execution_error'), error);
      let errorMessage = t('unexpected_error');
      let errorCode = "UNKNOWN_ERROR";

      if (error instanceof GeminiError) {
        errorMessage = error.message;
        errorCode = error.code || "GEMINI_ERROR";
      } else if (error.message) {
        errorMessage = error.message;
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

      const assistantErrorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: errorMessage,
        isError: true,
        errorCode: errorCode
      };

      setMessages(prev => [...prev, assistantErrorMessage]);
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
          <span className="font-semibold text-sm text-zinc-100">{t('app_name')}</span>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Mode Switcher */}
          <div className="hidden md:flex items-center bg-zinc-900/50 rounded-full p-1 border border-white/5">
            <button
              onClick={() => {
                setIsOrchestrationMode(false);
              }}
              className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                !isOrchestrationMode 
                  ? 'bg-zinc-100 text-zinc-900 shadow-md' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t('chat')}
            </button>
            <button
              onClick={() => {
                setIsOrchestrationMode(true);
              }}
              className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                isOrchestrationMode 
                  ? 'bg-indigo-500 text-white shadow-md' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t('orchestrate')}
            </button>
          </div>
        </div>
      </div>

      {/* Chat History */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-hide"
      >
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
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
                    <div className={`${msg.role === 'user' ? 'max-w-[90%] md:max-w-[85%]' : 'max-w-full'} ${
                      msg.role === 'user' 
                        ? 'bg-zinc-800 p-3 rounded-2xl text-zinc-100' 
                        : 'text-zinc-100'
                    }`}>
                      {msg.isError ? (
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-2 text-red-600 font-bold text-[10px] uppercase tracking-wider">
                            <AlertCircle size={12} />
                            {t('system_error_code', { code: msg.errorCode })}
                          </div>
                          <div className="prose prose-sm max-w-none prose-zinc leading-relaxed text-red-400/80">
                            {msg.content.split('\n').map((line, i) => (
                              <p key={i} className="mb-3 last:mb-0">{line}</p>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleRetry(msg.id)}
                              disabled={isLoading}
                              className="flex items-center gap-2 self-start px-3 py-1.5 bg-red-950/30 border border-red-900/50 rounded-lg text-[10px] font-bold uppercase tracking-wider text-red-400 hover:bg-red-900/40 transition-all disabled:opacity-50"
                            >
                              <RefreshCcw size={12} className={isLoading ? "animate-spin" : ""} />
                              {t('retry')}
                            </button>

                            {msg.errorCode === 'AUTH_ERROR' && onOpenOrchestrationSettings && (
                              <button
                                onClick={onOpenOrchestrationSettings}
                                className="flex items-center gap-2 self-start px-3 py-1.5 bg-zinc-800 border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-wider text-zinc-100 hover:bg-zinc-700 transition-all"
                              >
                                <Settings2 size={12} />
                                {t('go_to_settings')}
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <>
                          {(msg.file || msg.fileId) && (
                            <div className="mb-3 relative group cursor-pointer">
                              <div onClick={() => {}}>
                                {msg.fileId ? (
                                  <div className="relative group">
                                    <FileImage 
                                      fileId={msg.fileId} 
                                      alt={t('stored_content')} 
                                      className="rounded-2xl w-full h-auto max-h-[800px] object-contain bg-zinc-950 border border-white/10 shadow-2xl transition-all group-hover:scale-[1.005]"
                                    />
                                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDownload(msg.fileId!, msg.fileName || t('image_filename'));
                                        }}
                                        className="p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white backdrop-blur-sm transition-colors"
                                        title={t('download')}
                                      >
                                        <Download size={14} />
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  msg.fileMimeType?.startsWith('image/') ? (
                                    <div className="relative group">
                                      <img 
                                        src={msg.file} 
                                        alt={t('uploaded_content')} 
                                        className="rounded-2xl w-full h-auto max-h-[800px] object-contain bg-zinc-950 border border-white/10 shadow-2xl transition-all group-hover:scale-[1.005]"
                                        referrerPolicy="no-referrer"
                                      />
                                      <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <a
                                          href={msg.file}
                                          download={msg.fileName || t('image_filename')}
                                          onClick={(e) => e.stopPropagation()}
                                          className="p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white backdrop-blur-sm transition-colors"
                                          title={t('download')}
                                        >
                                          <Download size={14} />
                                        </a>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-3 p-4 bg-zinc-900 border border-white/5 rounded-xl hover:bg-zinc-800 transition-colors">
                                      <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400">
                                        {getFileIcon(msg.fileMimeType || '')}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="text-xs font-bold text-zinc-100 truncate">{msg.fileName || t('uploaded_file')}</div>
                                        <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{msg.fileMimeType?.split('/')[1] || t('file')}</div>
                                      </div>
                                      <a 
                                        href={msg.file} 
                                        download={msg.fileName || t('file')}
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-2 text-zinc-500 hover:text-white transition-colors"
                                      >
                                        <Download size={16} />
                                      </a>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                          <div className="prose prose-sm max-w-none prose-zinc leading-relaxed">
                            {msg.content.split('\n').map((line, i, arr) => (
                              <p key={i} className="mb-3 last:mb-0">
                                {line}
                                {i === arr.length - 1 && msg.role === 'assistant' && !msg.isError && (
                                  <button
                                    onClick={() => handleSpeak(msg.content, msg.id)}
                                    className={`inline-flex items-center justify-center ml-2 p-1 rounded-md transition-all align-middle ${
                                      speakingMsgId === msg.id 
                                        ? 'bg-zinc-100 text-zinc-900' 
                                        : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                                    title={speakingMsgId === msg.id ? t('stop_speaking') : t('read_aloud')}
                                  >
                                    {speakingMsgId === msg.id ? <VolumeX size={12} /> : <Volume2 size={12} />}
                                  </button>
                                )}
                              </p>
                            ))}
                          </div>
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
      <div className="max-w-5xl w-full mx-auto px-4 pb-6 pt-2">
        <div className="relative">
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
              {/* Quick Actions Section */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = "image/*";
                      fileInputRef.current.click();
                    }
                    setIsMenuOpen(false);
                  }}
                  className="flex flex-col items-center gap-2 p-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-zinc-700 flex items-center justify-center text-zinc-300 group-hover:text-white transition-colors">
                    <Paperclip size={20} />
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] font-bold text-zinc-100 uppercase tracking-wider">{t('upload_image')}</div>
                    <div className="text-[8px] text-zinc-500 uppercase tracking-tighter mt-0.5 leading-none">{t('upload_image_desc')}</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = "video/*,audio/*,application/pdf,text/*";
                      fileInputRef.current.click();
                    }
                    setIsMenuOpen(false);
                  }}
                  className="flex flex-col items-center gap-2 p-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-zinc-700 flex items-center justify-center text-zinc-300 group-hover:text-white transition-colors">
                    <FileText size={20} />
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] font-bold text-zinc-100 uppercase tracking-wider">{t('upload_file')}</div>
                    <div className="text-[8px] text-zinc-500 uppercase tracking-tighter mt-0.5 leading-none">{t('upload_file_desc')}</div>
                  </div>
                </button>
              </div>

              {/* Chat Models */}
              <div>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <Cpu size={14} className="text-zinc-500" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{t('intelligence_engine')}</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: 'gemini-3.1-pro-preview', name: t('pro_3_1'), desc: t('pro_model_desc'), tag: t('smartest'), strength: t('pro_model_strength') },
                    { id: 'gemini-3-flash-preview', name: t('flash_3'), desc: t('flash_model_desc'), tag: t('popular'), strength: t('flash_model_strength') },
                    { id: 'gemini-3.1-flash-lite-preview', name: t('flash_lite'), desc: t('lite_model_desc'), tag: t('fastest'), strength: t('lite_model_strength') }
                  ].map(model => (
                    <div key={model.id} className="relative group/item">
                      <button
                        onClick={() => {
                          setSelectedChatModel(model.id);
                          setIsOrchestrationMode(false);
                          setIsMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                          selectedChatModel === model.id 
                            ? 'bg-zinc-100 border-zinc-100 text-zinc-900' 
                            : 'bg-zinc-800/30 border-white/5 text-zinc-400 hover:bg-zinc-800'
                        }`}
                      >
                        <div className="text-left flex items-center gap-2">
                          <div>
                            <div className="text-xs font-bold">{model.name}</div>
                            <div className={`text-[10px] ${selectedChatModel === model.id ? 'text-zinc-600' : 'text-zinc-500'}`}>{model.desc}</div>
                          </div>
                          <div className="relative group/info">
                            <Info size={12} className="text-zinc-500 hover:text-zinc-300 cursor-help" />
                            <div className="absolute left-0 bottom-full mb-2 w-48 p-2 bg-zinc-950 text-[10px] text-zinc-300 rounded-lg border border-white/10 opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all z-[60] shadow-2xl pointer-events-none">
                              {model.strength}
                            </div>
                          </div>
                        </div>
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          selectedChatModel === model.id ? 'bg-zinc-900/10 text-zinc-900' : 'bg-zinc-900 text-zinc-500'
                        }`}>
                          {model.tag}
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modes */}
              <div className="pt-2 border-t border-white/5 flex gap-2">
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
                  {t('orchestrate')}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File Preview */}
          <AnimatePresence>
            {selectedFile && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-full left-0 mb-3 p-2 bg-zinc-900 border border-white/5 rounded-xl shadow-lg flex items-center gap-3"
              >
                <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-white/5 bg-zinc-800 flex items-center justify-center">
                  {fileMimeType.startsWith('image/') ? (
                    <img 
                      src={`data:${fileMimeType};base64,${selectedFile}`} 
                      alt={t('preview')} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-zinc-400">
                      {getFileIcon(fileMimeType)}
                    </div>
                  )}
                  <button 
                    onClick={() => {
                      setSelectedFile(null);
                      setSelectedFileName('');
                    }}
                    className="absolute top-0 right-0 p-0.5 bg-black/50 text-white rounded-bl-lg hover:bg-black/70"
                  >
                    <X size={12} />
                  </button>
                </div>
                <div className="flex flex-col gap-1 pr-2 min-w-[120px] max-w-[200px]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 truncate">{selectedFileName || t('file_context')}</span>
                  <div className="flex gap-1">
                    <div className="px-2 py-1 bg-zinc-800 text-zinc-400 rounded-md text-[10px] font-bold uppercase">
                      {t('analysis_mode')}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mode Selector Bar (Mobile) */}
          <div className="md:hidden flex items-center justify-center gap-2 mb-3">
            <button
              onClick={() => {
                setIsOrchestrationMode(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                !isOrchestrationMode 
                  ? 'bg-zinc-100 text-zinc-900' 
                  : 'bg-zinc-900 text-zinc-500'
              }`}
            >
              <MessageSquare size={12} />
              {t('chat')}
            </button>
            <button
              onClick={() => {
                setIsOrchestrationMode(true);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                isOrchestrationMode 
                  ? 'bg-indigo-500 text-white' 
                  : 'bg-zinc-900 text-zinc-500'
              }`}
            >
              <Layers size={12} />
              {t('orch')}
            </button>
          </div>

          {/* Example Prompts */}
          <AnimatePresence>
            {!input && !selectedFile && !isOrchestrationMode && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-full left-0 w-full mb-3"
              >
                <div className="overflow-x-auto no-scrollbar flex items-center gap-2 pb-1 pr-12">
                  <div className="flex items-center gap-1 px-1">
                    <Bot size={10} className="text-zinc-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap">{t('try')}</span>
                  </div>
                  {[
                    t('prompt_explain_code'),
                    t('prompt_write_email'),
                    t('prompt_summarize_text')
                  ].map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => setInput(prompt)}
                      className="whitespace-nowrap px-3 py-1.5 bg-zinc-800/80 hover:bg-zinc-700 border border-white/5 rounded-full text-[11px] text-zinc-300 transition-all hover:scale-105 active:scale-95"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
                <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-zinc-950 to-transparent pointer-events-none" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Orchestration Config Selector */}
          <AnimatePresence>
            {isOrchestrationMode && orchestrationConfigs.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-full left-0 w-full mb-3 flex items-center gap-2"
              >
                <div className="flex-1 bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-2xl p-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
                  <div className="flex items-center gap-1.5 px-2 py-1 border-r border-white/10 shrink-0">
                    <Layers size={12} className="text-indigo-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{t('config')}</span>
                  </div>
                  {orchestrationConfigs.map(config => (
                    <button
                      key={config.id}
                      onClick={() => setSelectedOrchestrationConfig(config)}
                      className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-[11px] font-medium transition-all ${
                        selectedOrchestrationConfig?.id === config.id
                          ? 'bg-indigo-500 text-white shadow-lg'
                          : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {config.name}
                    </button>
                  ))}
                </div>
                <button
                  onClick={onOpenOrchestrationSettings}
                  className="p-2.5 bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-2xl text-zinc-400 hover:text-white transition-all shrink-0"
                  title={t('manage_configs')}
                >
                  <Settings2 size={16} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <form 
            onSubmit={handleSubmit}
            className={`relative flex items-end gap-2 p-1.5 border rounded-3xl transition-all ${
              isOrchestrationMode && !selectedFile
                ? 'bg-zinc-900 border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.1)]'
                : 'bg-zinc-900 border-white/5'
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
              onChange={handleFileUpload}
              accept="image/*,video/*,audio/*,application/pdf,text/*"
              className="hidden"
            />

            {/* Active Mode Indicator */}
            <div className="absolute -top-6 left-4 flex items-center gap-2">
              <AnimatePresence mode="wait">
                {isOrchestrationMode ? (
                  <motion.div
                    key="orch"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full"
                  >
                    <Layers size={10} className="text-indigo-500" />
                    <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider">
                      Orchestration Active
                    </span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="chat"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="flex items-center gap-1.5 px-2 py-0.5 bg-zinc-500/10 border border-zinc-500/20 rounded-full"
                  >
                    <Cpu size={10} className="text-zinc-500" />
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                      {selectedChatModel.includes('pro') ? 'Pro' : 'Flash'} Intelligence
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
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
                  ? t('listening')
                  : selectedFile 
                    ? t('ask_about_file')
                    : isOrchestrationMode ? t('describe_orchestration') : t('message_placeholder')
              }
              className={`flex-1 max-h-48 min-h-[40px] py-2 bg-transparent border-none focus:ring-0 text-sm resize-none text-zinc-100`}
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
                title={isRecording ? t('stop_recording') : t('voice_input')}
              >
                {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
              <button
                type="submit"
                disabled={(!input.trim() && !selectedFile) || isLoading}
                className={`p-2 rounded-full transition-all flex items-center gap-1.5 ${
                  (!input.trim() && !selectedFile) || isLoading
                    ? 'text-zinc-700'
                    : 'text-zinc-900 bg-zinc-100 hover:bg-white px-3'
                }`}
              >
                {isLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </div>
          </form>
          <div className="mt-2 flex justify-center">
            <span className="text-[10px] text-zinc-400 font-medium">
              {t('mistakes_warning')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
