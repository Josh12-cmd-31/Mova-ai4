import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
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
  Hash,
  Square,
  RectangleHorizontal,
  RectangleVertical,
  Palette,
  Search,
  Dices,
  Share2,
  ZoomIn,
  ZoomOut,
  Globe
} from 'lucide-react';
import { chatWithGemini, analyzeFile, editImage, generateImage, GeminiError, ImageOptions } from '../services/gemini';
import { Message, SessionFile } from '../types';
import { db, handleFirestoreError, OperationType } from '../services/firebase';
import { getDoc, doc } from 'firebase/firestore';

function FileImage({ fileId, alt, className, onLoad }: { fileId: string; alt: string; className?: string; onLoad?: (dataUrl: string) => void }) {
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
          onLoad?.(url);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("Error loading file:", err);
        setError(true);
      }
    };
    loadFile();
  }, [fileId]);

  if (error) return <div className="flex items-center justify-center bg-zinc-800 rounded-lg aspect-square text-white/30 text-xs">Failed to load</div>;
  if (!dataUrl) return <div className="flex items-center justify-center bg-zinc-800 rounded-lg aspect-square"><Loader2 className="w-4 h-4 animate-spin text-white/30" /></div>;

  return <img src={dataUrl} alt={alt} className={className} referrerPolicy="no-referrer" />;
}

function FileComparison({ before, after, beforeId, afterId, onMaximize }: { before?: string; after?: string; beforeId?: string; afterId?: string; onMaximize?: (url: string) => void }) {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const [beforeUrl, setBeforeUrl] = useState<string | null>(before || null);
  const [afterUrl, setAfterUrl] = useState<string | null>(after || null);

  useEffect(() => {
    const loadFiles = async () => {
      if (!beforeUrl && beforeId) {
        try {
          const docSnap = await getDoc(doc(db, 'session_files', beforeId));
          if (docSnap.exists()) {
            const fileData = docSnap.data() as SessionFile;
            setBeforeUrl(`data:${fileData.mimeType};base64,${fileData.data}`);
          }
        } catch (e) { console.error(e); }
      }
      if (!afterUrl && afterId) {
        try {
          const docSnap = await getDoc(doc(db, 'session_files', afterId));
          if (docSnap.exists()) {
            const fileData = docSnap.data() as SessionFile;
            setAfterUrl(`data:${fileData.mimeType};base64,${fileData.data}`);
          }
        } catch (e) { console.error(e); }
      }
    };
    loadFiles();
  }, [beforeId, afterId, before, after]);

  const handleMove = (e: any) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const position = ((x - rect.left) / rect.width) * 100;
    setSliderPos(Math.min(Math.max(position, 0), 100));
  };

  if (!beforeUrl || !afterUrl) return <div className="flex items-center justify-center bg-zinc-900 rounded-xl aspect-square max-h-80 border border-white/5"><Loader2 className="w-6 h-6 animate-spin text-white/30" /></div>;

  return (
    <div 
      ref={containerRef}
      className="relative w-full aspect-square max-h-80 rounded-xl overflow-hidden cursor-ew-resize select-none bg-zinc-900 border border-white/5 group"
      onMouseMove={handleMove}
      onTouchMove={handleMove}
    >
      <img src={afterUrl} alt="After" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
      <img 
        src={beforeUrl} 
        alt="Before" 
        className="absolute inset-0 w-full h-full object-contain pointer-events-none" 
        style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
      />
      <div 
        className="absolute inset-y-0 w-0.5 bg-white/50 shadow-[0_0_10px_rgba(0,0,0,0.5)] pointer-events-none"
        style={{ left: `${sliderPos}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex gap-0.5">
            <div className="w-0.5 h-3 bg-white/50 rounded-full" />
            <div className="w-0.5 h-3 bg-white/50 rounded-full" />
          </div>
        </div>
      </div>
      <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/40 backdrop-blur-md rounded text-[8px] font-bold uppercase tracking-widest text-white/70 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">Original</div>
      <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/40 backdrop-blur-md rounded text-[8px] font-bold uppercase tracking-widest text-white/70 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">Edited</div>
      {onMaximize && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onMaximize(afterUrl!);
          }}
          className="absolute bottom-3 right-3 p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
          title="Maximize"
        >
          <Maximize2 size={16} />
        </button>
      )}
    </div>
  );
}

const IMAGE_PROMPTS: Record<string, string[]> = {
  'gemini-3-pro-image-preview': [
    "A hyper-realistic close-up of a dragon's eye with intricate scales and fiery reflections",
    "A futuristic city with neon lights and flying cars, cinematic lighting, 8k resolution",
    "A serene landscape with a crystal clear lake and snow-capped mountains, National Geographic style",
    "A detailed steampunk airship sailing through a sunset sky with golden hour lighting"
  ],
  'gemini-3.1-flash-image-preview': [
    "A cute robot painting a masterpiece on a canvas in a sunlit studio",
    "A cyberpunk cat wearing high-tech goggles on a rainy Tokyo street",
    "A magical forest with glowing plants and floating islands, ethereal atmosphere",
    "A minimalist portrait of a woman with flowers in her hair, soft pastel colors"
  ],
  'gemini-2.5-flash-image': [
    "A simple sketch of a futuristic car concept",
    "A vibrant abstract painting with bold brushstrokes and primary colors",
    "A 3D render of a glass sphere floating over a desert landscape",
    "A whimsical illustration of a house made of candy"
  ],
  'imagen-4.0-generate-001': [
    "A photorealistic portrait of an elderly man with deep wrinkles and kind eyes",
    "An oil painting of a stormy sea in the style of William Turner",
    "A macro photograph of a dewdrop on a leaf, reflecting the entire forest",
    "A surrealist landscape where the sky is made of clockwork gears"
  ],
  'default': [
    "A futuristic city with neon lights and flying cars",
    "A cute robot painting a masterpiece on a canvas",
    "A serene landscape with a crystal clear lake and snow-capped mountains",
    "A cyberpunk cat wearing high-tech goggles",
    "A magical forest with glowing plants and floating islands",
    "A steampunk airship sailing through a sunset sky",
    "A minimalist portrait of a woman with flowers in her hair",
    "A hyper-realistic close-up of a dragon's eye"
  ]
};

interface ChatInterfaceProps {
  initialMessages: Message[];
  onUpdateMessages: (messages: Message[]) => void;
}

export default function ChatInterface({ initialMessages, onUpdateMessages }: ChatInterfaceProps): React.JSX.Element {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileMimeType, setFileMimeType] = useState<string>('');
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [isGenerationMode, setIsGenerationMode] = useState(false);
  const [isOrchestrationMode, setIsOrchestrationMode] = useState(false);
  const [selectedImageModel, setSelectedImageModel] = useState('gemini-2.5-flash-image');

  const handleShare = async (dataUrl: string) => {
    try {
      if (navigator.share) {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], 'mova-ai-image.png', { type: blob.type });
        await navigator.share({
          files: [file],
          title: 'Shared from Mova AI',
          text: 'Check out this image I generated with Mova AI!'
        });
      } else {
        const blob = await (await fetch(dataUrl)).blob();
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type]: blob })
        ]);
        // No alert, just log or let the user see it's copied if we had a toast
        console.log('Image copied to clipboard');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

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
      console.error('Error downloading file:', err);
    }
  };
  const [selectedChatModel, setSelectedChatModel] = useState('gemini-3.1-pro-preview');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [isAdvancedSettingsOpen, setIsAdvancedSettingsOpen] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<ImageOptions['aspectRatio']>('1:1');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [seed, setSeed] = useState<number | undefined>(undefined);
  const [selectedStyle, setSelectedStyle] = useState('');
  const [useSearch, setUseSearch] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [fullscreenDataUrl, setFullscreenDataUrl] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isKeyRequired, setIsKeyRequired] = useState(false);
  const recognitionRef = useRef<any>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkKey = async () => {
      if (['gemini-3-pro-image-preview', 'gemini-3.1-flash-image-preview'].includes(selectedImageModel)) {
        const hasKey = await (window as any).aistudio?.hasSelectedApiKey();
        if (!hasKey) {
          setIsKeyRequired(true);
        }
      } else {
        setIsKeyRequired(false);
      }
    };
    checkKey();
  }, [selectedImageModel]);

  const handleSelectKey = async () => {
    await (window as any).aistudio?.openSelectKey();
    setIsKeyRequired(false);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    onUpdateMessages(messages);
  }, [messages]);

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon size={20} />;
    if (mimeType.startsWith('video/')) return <Video size={20} />;
    if (mimeType.startsWith('audio/')) return <Music size={20} />;
    if (mimeType === 'application/pdf') return <FileText size={20} />;
    return <File size={20} />;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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
    if (!isEditingMode) {
      setSelectedFile(null);
      setSelectedFileName('');
    }
    
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

  const executeRequest = async (text: string, file: string | null, mime: string) => {
    setIsLoading(true);

    try {
      let responseText = "";
      let editedFile: string | null = null;

      if (file) {
        if (isEditingMode && mime.startsWith('image/')) {
          try {
            const result = await editImage(file, text || "Enhance this image", selectedImageModel);
            if (!result || !result.editedImageB64) {
              throw new GeminiError("The model was unable to generate an edited version of this image. This can happen if the prompt is too complex or if the image content is restricted.", "IMAGE_EDIT_FAILED");
            }
            responseText = result.textResponse || "I've processed your image edit request.";
            editedFile = result.editedImageB64;
          } catch (err: any) {
            console.error("Image edit error:", err);
            throw err instanceof GeminiError ? err : new GeminiError("Failed to edit image. The model might be busy or the request was blocked.", "IMAGE_EDIT_ERROR");
          }
        } else {
          responseText = await analyzeFile(file, text, mime);
        }
      } else if (isGenerationMode) {
        try {
          const options: ImageOptions = {
            aspectRatio,
            negativePrompt: negativePrompt.trim() || undefined,
            seed: seed || undefined,
            style: selectedStyle || undefined,
            useSearch: useSearch && (selectedImageModel === 'gemini-3-pro-image-preview' || selectedImageModel === 'gemini-3.1-flash-image-preview')
          };
          const result = await generateImage(text, selectedImageModel, options);
          if (!result || !result.generatedImageB64) {
            throw new GeminiError("I couldn't generate an image for that prompt. It might have been blocked by safety filters or the model is currently unavailable.", "IMAGE_GEN_FAILED");
          }
          responseText = result.textResponse || "I've generated an image for you.";
          editedFile = result.generatedImageB64;
        } catch (err: any) {
          console.error("Image generation error:", err);
          throw err instanceof GeminiError ? err : new GeminiError("Failed to generate image. Please try a different prompt or check your connection.", "IMAGE_GEN_ERROR");
        }
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
        file: editedFile ? `data:image/png;base64,${editedFile}` : undefined,
        beforeFile: (isEditingMode && file) ? `data:${mime};base64,${file}` : undefined
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      if (editedFile) {
        setSelectedFile(editedFile);
        setFileMimeType('image/png');
      }
    } catch (error: any) {
      console.error("Request execution error:", error);
      let errorMessage = "I encountered an unexpected error processing your request.";
      let errorCode = "UNKNOWN_ERROR";

      if (error instanceof GeminiError) {
        errorMessage = error.message;
        errorCode = error.code || "GEMINI_ERROR";
        
        // Specific feedback for safety blocks in image context
        if (errorCode === "SAFETY_ERROR" || errorMessage.toLowerCase().includes("safety") || errorMessage.toLowerCase().includes("blocked")) {
          if (isGenerationMode) {
            errorMessage = "Your image generation prompt was blocked by safety filters. Please try a more neutral description.";
          } else if (isEditingMode) {
            errorMessage = "The image edit request was blocked by safety filters. This could be due to the original image content or your edit instructions.";
          }
        }
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

  const currentPrompts = IMAGE_PROMPTS[selectedImageModel] || IMAGE_PROMPTS.default;

  const IMAGE_MODELS = [
    { id: 'gemini-3-pro-image-preview', name: 'Pro Image', desc: 'Highest detail & quality', tag: 'Best', strength: 'High-quality image generation for professional use' },
    { id: 'gemini-3.1-flash-image-preview', name: 'Flash HQ', desc: 'High quality & flexible', tag: 'HQ', strength: 'Great balance of speed and high-resolution detail' },
    { id: 'gemini-2.5-flash-image', name: 'Flash Image', desc: 'Fast generation', tag: 'Fast', strength: 'Rapid generation for quick concepts and ideation' },
    { id: 'imagen-4.0-generate-001', name: 'Imagen 4', desc: 'Photorealistic results', tag: 'New', strength: 'Advanced photorealism and artistic texture control' }
  ];

  const activeImageModel = IMAGE_MODELS.find(m => m.id === selectedImageModel) || IMAGE_MODELS[2];

  return (
    <div className="flex flex-col h-full bg-brand-bg text-brand-ink">
      <AnimatePresence>
        {isKeyRequired && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-zinc-900 border border-white/10 p-8 rounded-3xl max-w-md w-full text-center space-y-6 shadow-2xl"
            >
              <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto">
                <Cpu size={32} className="text-emerald-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white">Advanced Model Access</h2>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  To use <span className="text-zinc-100 font-semibold">{selectedImageModel.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')}</span>, you must select your own API key.
                </p>
              </div>
              <div className="space-y-4">
                <button
                  onClick={handleSelectKey}
                  className="w-full py-3 bg-zinc-100 hover:bg-white text-zinc-900 rounded-xl font-bold transition-all shadow-lg"
                >
                  Select API Key
                </button>
                <p className="text-[10px] text-zinc-500">
                  A paid Google Cloud project is required. See the <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-zinc-300">billing documentation</a> for details.
                </p>
                <button
                  onClick={() => {
                    setSelectedImageModel('gemini-2.5-flash-image');
                    setIsKeyRequired(false);
                  }}
                  className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Switch to Standard Model
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                setIsGenerationMode(false);
                setIsOrchestrationMode(false);
              }}
              className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                !isGenerationMode && !isOrchestrationMode 
                  ? 'bg-zinc-100 text-zinc-900 shadow-md' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t('chat')}
            </button>
            <button
              onClick={() => {
                setIsGenerationMode(true);
                setIsOrchestrationMode(false);
              }}
              className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                isGenerationMode 
                  ? 'bg-emerald-500 text-white shadow-md' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t('generate')}
            </button>
            <button
              onClick={() => {
                setIsOrchestrationMode(true);
                setIsGenerationMode(false);
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

          {/* Gallery Button */}
          <button 
            onClick={() => setIsGalleryOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 rounded-full border border-white/5 text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <ImageIcon size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{t('gallery')}</span>
          </button>
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
                          {(msg.file || msg.fileId) && (
                            <div className="mb-3 relative group cursor-pointer">
                              {msg.beforeFile || msg.beforeFileId ? (
                                <FileComparison 
                                  before={msg.beforeFile} 
                                  after={msg.file} 
                                  beforeId={msg.beforeFileId} 
                                  afterId={msg.fileId} 
                                  onMaximize={(url) => setFullscreenImage(url)}
                                />
                              ) : (
                                <div onClick={() => (msg.fileMimeType?.startsWith('image/') || msg.fileId) ? setFullscreenImage(msg.file || msg.fileId || null) : null}>
                                  {msg.fileId ? (
                                    <div className="relative group">
                                      <FileImage 
                                        fileId={msg.fileId} 
                                        alt="Stored content" 
                                        className="rounded-xl max-h-80 object-contain bg-zinc-900 border border-white/5 shadow-sm transition-transform group-hover:scale-[1.01]"
                                      />
                                      <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDownload(msg.fileId!, msg.fileName || 'image.png');
                                          }}
                                          className="p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white backdrop-blur-sm transition-colors"
                                          title="Download"
                                        >
                                          <Download size={14} />
                                        </button>
                                        <button
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            const docRef = doc(db, 'session_files', msg.fileId!);
                                            const docSnap = await getDoc(docRef);
                                            if (docSnap.exists()) {
                                              const fileData = docSnap.data() as SessionFile;
                                              handleShare(`data:${fileData.mimeType};base64,${fileData.data}`);
                                            }
                                          }}
                                          className="p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white backdrop-blur-sm transition-colors"
                                          title="Share"
                                        >
                                          <Share2 size={14} />
                                        </button>
                                      </div>
                                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl pointer-events-none">
                                        <Maximize2 size={24} className="text-white" />
                                      </div>
                                    </div>
                                  ) : (
                                    msg.fileMimeType?.startsWith('image/') ? (
                                      <div className="relative group">
                                        <img 
                                          src={msg.file} 
                                          alt="Uploaded content" 
                                          className="rounded-xl max-h-80 object-contain bg-zinc-900 border border-white/5 shadow-sm transition-transform group-hover:scale-[1.01]"
                                          referrerPolicy="no-referrer"
                                        />
                                        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <a
                                            href={msg.file}
                                            download={msg.fileName || 'image.png'}
                                            onClick={(e) => e.stopPropagation()}
                                            className="p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white backdrop-blur-sm transition-colors"
                                            title="Download"
                                          >
                                            <Download size={14} />
                                          </a>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleShare(msg.file!);
                                            }}
                                            className="p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white backdrop-blur-sm transition-colors"
                                            title="Share"
                                          >
                                            <Share2 size={14} />
                                          </button>
                                        </div>
                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl pointer-events-none">
                                          <Maximize2 size={24} className="text-white" />
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-3 p-4 bg-zinc-900 border border-white/5 rounded-xl hover:bg-zinc-800 transition-colors">
                                        <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400">
                                          {getFileIcon(msg.fileMimeType || '')}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="text-xs font-bold text-zinc-100 truncate">{msg.fileName || 'Uploaded File'}</div>
                                          <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{msg.fileMimeType?.split('/')[1] || 'File'}</div>
                                        </div>
                                        <a 
                                          href={msg.file} 
                                          download={msg.fileName || 'file'}
                                          onClick={(e) => e.stopPropagation()}
                                          className="p-2 text-zinc-500 hover:text-white transition-colors"
                                        >
                                          <Download size={16} />
                                        </a>
                                      </div>
                                    )
                                  )}
                                </div>
                              )}
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
                                    title={speakingMsgId === msg.id ? "Stop Speaking" : "Read Aloud"}
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
              {messages.filter(m => m.file || m.fileId).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-4">
                  <ImageIcon size={48} strokeWidth={1} />
                  <p className="text-xs font-medium">No images in this session yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {messages.filter(m => m.file || m.fileId).map((msg, idx) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="relative aspect-square rounded-xl overflow-hidden bg-zinc-900 border border-white/5 group cursor-pointer"
                      onClick={() => setFullscreenImage(msg.file || msg.fileId || null)}
                    >
                      {msg.fileId ? (
                        <FileImage 
                          fileId={msg.fileId} 
                          alt="Gallery item" 
                          className="w-full h-full object-cover transition-transform group-hover:scale-110"
                        />
                      ) : (
                        <img 
                          src={msg.file} 
                          alt="Gallery item" 
                          className="w-full h-full object-cover transition-transform group-hover:scale-110"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                        <Maximize2 size={18} className="text-white" />
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (msg.fileId) {
                                handleDownload(msg.fileId, msg.fileName || 'image.png');
                              } else if (msg.file) {
                                const link = document.createElement('a');
                                link.href = msg.file;
                                link.download = msg.fileName || 'image.png';
                                link.click();
                              }
                            }}
                            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white backdrop-blur-md transition-all"
                            title="Download"
                          >
                            <Download size={14} />
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (msg.fileId) {
                                const docRef = doc(db, 'session_files', msg.fileId);
                                const docSnap = await getDoc(docRef);
                                if (docSnap.exists()) {
                                  const fileData = docSnap.data() as SessionFile;
                                  handleShare(`data:${fileData.mimeType};base64,${fileData.data}`);
                                }
                              } else if (msg.file) {
                                handleShare(msg.file);
                              }
                            }}
                            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white backdrop-blur-md transition-all"
                            title="Share"
                          >
                            <Share2 size={14} />
                          </button>
                        </div>
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
            className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-4 md:p-12 overflow-auto"
          >
            <div className="absolute top-4 right-4 flex items-center gap-2 z-[70]">
              {(fullscreenImage?.startsWith('data:') || fullscreenDataUrl) && (
                <>
                  <button 
                    onClick={() => setZoomScale(prev => Math.min(prev + 0.5, 4))}
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all backdrop-blur-md"
                    title="Zoom In"
                  >
                    <ZoomIn size={20} />
                  </button>
                  <button 
                    onClick={() => setZoomScale(prev => Math.max(prev - 0.5, 0.5))}
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all backdrop-blur-md"
                    title="Zoom Out"
                  >
                    <ZoomOut size={20} />
                  </button>
                  <a 
                    href={fullscreenDataUrl || fullscreenImage!} 
                    download="mova-ai-export.png"
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all backdrop-blur-md"
                    title="Download Image"
                  >
                    <Download size={20} />
                  </a>
                  <button 
                    onClick={() => handleShare(fullscreenDataUrl || fullscreenImage!)}
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all backdrop-blur-md"
                    title="Share Image"
                  >
                    <Share2 size={20} />
                  </button>
                </>
              )}
              <button 
                onClick={() => {
                  setFullscreenImage(null);
                  setFullscreenDataUrl(null);
                  setZoomScale(1);
                }}
                className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all backdrop-blur-md"
              >
                <X size={20} />
              </button>
            </div>
            
            <div 
              className="w-full h-full flex items-center justify-center transition-transform duration-200"
              style={{ transform: `scale(${zoomScale})` }}
            >
              {fullscreenImage?.startsWith('data:') ? (
              <motion.img
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                src={fullscreenImage}
                alt="Fullscreen view"
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                referrerPolicy="no-referrer"
              />
            ) : (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="max-w-full max-h-full"
              >
                {fullscreenImage && (
                  <FileImage 
                    fileId={fullscreenImage} 
                    alt="Fullscreen view" 
                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                    onLoad={setFullscreenDataUrl}
                  />
                )}
              </motion.div>
            )}
          </div>
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
                        <ImageIcon size={20} />
                      </div>
                      <div className="text-[10px] font-bold text-zinc-100 uppercase tracking-wider">Upload Image</div>
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
                      <div className="text-[10px] font-bold text-zinc-100 uppercase tracking-wider">Upload File</div>
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
                        { id: 'gemini-3.1-pro-preview', name: 'Pro 3.1', desc: 'Best for complex reasoning', tag: 'Smartest', strength: 'Best for creative writing & deep analysis' },
                        { id: 'gemini-3-flash-preview', name: 'Flash 3', desc: 'Balanced speed & intelligence', tag: 'Popular', strength: 'Fastest for chat & everyday tasks' },
                        { id: 'gemini-flash-lite-latest', name: 'Flash Lite', desc: 'Lightweight & ultra-fast', tag: 'Fastest', strength: 'Ultra-low latency for simple queries' }
                      ].map(model => (
                        <div key={model.id} className="relative group/item">
                          <button
                            onClick={() => {
                              setSelectedChatModel(model.id);
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

                  {/* Visual Models */}
                  <div>
                    <div className="flex items-center justify-between mb-3 px-1">
                      <div className="flex items-center gap-2">
                        <ImageIcon size={14} className="text-zinc-500" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Visual Engine</span>
                      </div>
                      <button
                        onClick={() => setIsGenerationMode(!isGenerationMode)}
                        className={`text-[9px] font-bold uppercase px-2 py-1 rounded-full transition-all ${
                          isGenerationMode 
                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                            : 'bg-zinc-800 text-zinc-500'
                        }`}
                      >
                        {isGenerationMode ? 'Gen Mode ON' : 'Gen Mode OFF'}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { id: 'gemini-3-pro-image-preview', name: 'Pro Image', desc: 'Highest detail & quality', tag: 'Best', strength: 'High-quality image generation for professional use' },
                        { id: 'gemini-3.1-flash-image-preview', name: 'Flash HQ', desc: 'High quality & flexible', tag: 'HQ', strength: 'Great balance of speed and high-resolution detail' },
                        { id: 'gemini-2.5-flash-image', name: 'Flash Image', desc: 'Fast generation', tag: 'Fast', strength: 'Rapid generation for quick concepts and ideation' },
                        { id: 'imagen-4.0-generate-001', name: 'Imagen 4', desc: 'Photorealistic results', tag: 'New', strength: 'Advanced photorealism and artistic texture control' }
                      ].map(model => (
                        <div key={model.id} className="relative group/item">
                          <button
                            onClick={() => {
                              setSelectedImageModel(model.id);
                              setIsMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                              selectedImageModel === model.id 
                                ? 'bg-zinc-100 border-zinc-100 text-zinc-900' 
                                : 'bg-zinc-800/30 border-white/5 text-zinc-400 hover:bg-zinc-800'
                            }`}
                          >
                            <div className="text-left flex items-center gap-2">
                              <div>
                                <div className="text-xs font-bold">{model.name}</div>
                                <div className={`text-[10px] ${selectedImageModel === model.id ? 'text-zinc-600' : 'text-zinc-500'}`}>{model.desc}</div>
                              </div>
                              <div className="relative group/info">
                                <Info size={12} className="text-zinc-500 hover:text-zinc-300 cursor-help" />
                                <div className="absolute left-0 bottom-full mb-2 w-48 p-2 bg-zinc-950 text-[10px] text-zinc-300 rounded-lg border border-white/10 opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all z-[60] shadow-2xl pointer-events-none">
                                  {model.strength}
                                </div>
                              </div>
                            </div>
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                              selectedImageModel === model.id ? 'bg-zinc-900/10 text-zinc-900' : 'bg-zinc-900 text-zinc-500'
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
                      alt="Preview" 
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
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 truncate">{selectedFileName || 'File Context'}</span>
                  <div className="flex gap-1">
                    {fileMimeType.startsWith('image/') ? (
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
                    ) : (
                      <div className="px-2 py-1 bg-zinc-800 text-zinc-400 rounded-md text-[10px] font-bold uppercase">
                        Analysis Mode
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mode Selector Bar (Mobile) */}
          <div className="md:hidden flex items-center justify-center gap-2 mb-3">
            <button
              onClick={() => {
                setIsGenerationMode(false);
                setIsOrchestrationMode(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                !isGenerationMode && !isOrchestrationMode 
                  ? 'bg-zinc-100 text-zinc-900' 
                  : 'bg-zinc-900 text-zinc-500'
              }`}
            >
              <MessageSquare size={12} />
              Chat
            </button>
            <button
              onClick={() => {
                setIsGenerationMode(true);
                setIsOrchestrationMode(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                isGenerationMode 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-zinc-900 text-zinc-500'
              }`}
            >
              <Sparkles size={12} />
              Gen
            </button>
            <button
              onClick={() => {
                setIsOrchestrationMode(true);
                setIsGenerationMode(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                isOrchestrationMode 
                  ? 'bg-indigo-500 text-white' 
                  : 'bg-zinc-900 text-zinc-500'
              }`}
            >
              <Layers size={12} />
              Orch
            </button>
          </div>

          {/* Example Prompts */}
          <AnimatePresence>
            {isGenerationMode && !input && !selectedFile && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-full left-0 w-full mb-3"
              >
                <div className="overflow-x-auto no-scrollbar flex items-center gap-2 pb-1 pr-12">
                  <div className="flex items-center gap-1 px-1">
                    <Sparkles size={10} className="text-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap">Try:</span>
                  </div>
                  {currentPrompts.map((prompt, index) => (
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

          <form 
            onSubmit={handleSubmit}
            className={`relative flex items-end gap-2 p-1.5 border rounded-3xl transition-all ${
              (isGenerationMode || isOrchestrationMode) && !selectedFile
                ? 'bg-zinc-900 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                : 'bg-zinc-900 border-white/5'
            }`}
          >
            <div className="flex items-center">
              {isGenerationMode && !selectedFile ? (
                <div className="flex items-center gap-1">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setIsModelSelectorOpen(!isModelSelectorOpen);
                        setIsAdvancedSettingsOpen(false);
                      }}
                      className="flex items-center gap-1.5 p-2 px-3 rounded-2xl bg-zinc-800 text-zinc-300 hover:text-white transition-all border border-white/5"
                    >
                      <ImageIcon size={16} className="text-emerald-500" />
                      <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">{activeImageModel.name}</span>
                      <ChevronDown size={12} className={`transition-transform ${isModelSelectorOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {isModelSelectorOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          className="absolute bottom-full left-0 mb-3 w-64 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
                        >
                          <div className="p-2 space-y-1">
                            {IMAGE_MODELS.map(model => (
                              <button
                                key={model.id}
                                type="button"
                                onClick={() => {
                                  setSelectedImageModel(model.id);
                                  setIsModelSelectorOpen(false);
                                }}
                                className={`w-full flex flex-col p-2.5 rounded-xl text-left transition-all ${
                                  selectedImageModel === model.id 
                                    ? 'bg-emerald-500 text-white' 
                                    : 'hover:bg-zinc-800 text-zinc-400'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="text-[11px] font-bold uppercase tracking-wider">{model.name}</span>
                                  <span className={`text-[8px] font-bold uppercase px-1 rounded ${
                                    selectedImageModel === model.id ? 'bg-white/20' : 'bg-zinc-800'
                                  }`}>{model.tag}</span>
                                </div>
                                <span className={`text-[9px] ${selectedImageModel === model.id ? 'text-white/80' : 'text-zinc-500'}`}>{model.desc}</span>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAdvancedSettingsOpen(!isAdvancedSettingsOpen);
                        setIsModelSelectorOpen(false);
                      }}
                      className={`p-2 rounded-xl transition-all border ${
                        isAdvancedSettingsOpen 
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                          : 'bg-zinc-800 border-white/5 text-zinc-400 hover:text-white'
                      }`}
                      title="Advanced Settings"
                    >
                      <Settings2 size={16} />
                    </button>

                    <AnimatePresence>
                      {isAdvancedSettingsOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          className="absolute bottom-full left-0 mb-3 w-72 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl p-4 z-50 space-y-4"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{t('advanced_parameters')}</span>
                            <button 
                              onClick={() => {
                                setAspectRatio('1:1');
                                setNegativePrompt('');
                                setSeed(undefined);
                                setSelectedStyle('');
                                setUseSearch(false);
                              }}
                              className="text-[9px] font-bold uppercase text-zinc-600 hover:text-zinc-400 transition-colors"
                            >
                              {t('reset')}
                            </button>
                          </div>

                          {/* Search Grounding */}
                          {(selectedImageModel === 'gemini-3-pro-image-preview' || selectedImageModel === 'gemini-3.1-flash-image-preview') && (
                            <div className="flex items-center justify-between p-2 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                              <div className="flex items-center gap-2">
                                <Search size={12} className="text-emerald-500" />
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-300">{t('search_grounding')}</span>
                                  <span className="text-[8px] text-zinc-500">{t('search_grounding_desc')}</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setUseSearch(!useSearch)}
                                className={`w-8 h-4 rounded-full transition-all relative ${
                                  useSearch ? 'bg-emerald-500' : 'bg-zinc-700'
                                }`}
                              >
                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${
                                  useSearch ? 'left-4.5' : 'left-0.5'
                                }`} />
                              </button>
                            </div>
                          )}

                          {/* Aspect Ratio */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                              <Square size={10} />
                              Aspect Ratio
                            </div>
                            <div className="grid grid-cols-5 gap-1">
                              {(['1:1', '3:4', '4:3', '9:16', '16:9'] as const).map(ratio => (
                                <button
                                  key={ratio}
                                  type="button"
                                  onClick={() => setAspectRatio(ratio)}
                                  className={`py-1.5 rounded-md text-[9px] font-bold transition-all border ${
                                    aspectRatio === ratio 
                                      ? 'bg-emerald-500 border-emerald-500 text-white' 
                                      : 'bg-zinc-800 border-white/5 text-zinc-500 hover:bg-zinc-700'
                                  }`}
                                >
                                  {ratio}
                                </button>
                              ))}
                              {selectedImageModel === 'gemini-3.1-flash-image-preview' && (['1:4', '1:8', '4:1', '8:1'] as const).map(ratio => (
                                <button
                                  key={ratio}
                                  type="button"
                                  onClick={() => setAspectRatio(ratio)}
                                  className={`py-1.5 rounded-md text-[9px] font-bold transition-all border ${
                                    aspectRatio === ratio 
                                      ? 'bg-emerald-500 border-emerald-500 text-white' 
                                      : 'bg-zinc-800 border-white/5 text-zinc-500 hover:bg-zinc-700'
                                  }`}
                                >
                                  {ratio}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Artistic Style */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                              <Palette size={10} />
                              Artistic Style
                            </div>
                            <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto pr-1 scrollbar-hide">
                              {[
                                { id: '', name: 'None' },
                                { id: 'watercolor', name: 'Watercolor' },
                                { id: 'oil painting', name: 'Oil Painting' },
                                { id: '3d render', name: '3D Render' },
                                { id: 'cyberpunk', name: 'Cyberpunk' },
                                { id: 'minimalist', name: 'Minimalist' },
                                { id: 'anime', name: 'Anime' },
                                { id: 'pop art', name: 'Pop Art' },
                                { id: 'sketch', name: 'Sketch' },
                                { id: 'pixel art', name: 'Pixel Art' },
                                { id: 'vaporwave', name: 'Vaporwave' },
                                { id: 'synthwave', name: 'Synthwave' }
                              ].map(style => (
                                <button
                                  key={style.id}
                                  type="button"
                                  onClick={() => setSelectedStyle(style.id)}
                                  className={`py-1.5 px-2 rounded-md text-[9px] font-bold text-left transition-all border ${
                                    selectedStyle === style.id 
                                      ? 'bg-emerald-500 border-emerald-500 text-white' 
                                      : 'bg-zinc-800 border-white/5 text-zinc-500 hover:bg-zinc-700'
                                  }`}
                                >
                                  {style.name}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Negative Prompt */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                              <X size={10} />
                              Negative Prompt
                            </div>
                            <input 
                              type="text"
                              value={negativePrompt}
                              onChange={(e) => setNegativePrompt(e.target.value)}
                              placeholder="Elements to exclude..."
                              className="w-full bg-zinc-800 border border-white/5 rounded-lg px-3 py-2 text-[11px] text-zinc-100 placeholder-zinc-600 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all"
                            />
                          </div>

                          {/* Seed */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                <Hash size={10} />
                                Seed (Optional)
                              </div>
                              <button
                                type="button"
                                onClick={() => setSeed(Math.floor(Math.random() * 1000000))}
                                className="p-1 text-zinc-500 hover:text-emerald-500 transition-colors"
                                title="Randomize Seed"
                              >
                                <Dices size={12} />
                              </button>
                            </div>
                            <input 
                              type="number"
                              value={seed || ''}
                              onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : undefined)}
                              placeholder="Random by default"
                              className="w-full bg-zinc-800 border border-white/5 rounded-lg px-3 py-2 text-[11px] text-zinc-100 placeholder-zinc-600 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className={`p-2 transition-all ${
                    isMenuOpen ? 'text-white rotate-45' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Plus size={20} />
                </button>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*,video/*,audio/*,application/pdf,text/*"
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
                  ? t('listening')
                  : selectedFile 
                    ? (isEditingMode ? t('describe_edits') : t('ask_about_file')) 
                    : (isGenerationMode ? t('describe_image') : isOrchestrationMode ? t('describe_orchestration') : t('message_placeholder'))
              }
              className={`flex-1 max-h-48 min-h-[40px] py-2 bg-transparent border-none focus:ring-0 text-sm resize-none ${
                (isGenerationMode || isOrchestrationMode) && !selectedFile ? 'placeholder-zinc-500 text-zinc-100' : 'text-zinc-100'
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
                disabled={(!input.trim() && !selectedFile) || isLoading}
                className={`p-2 rounded-full transition-all flex items-center gap-1.5 ${
                  (!input.trim() && !selectedFile) || isLoading
                    ? 'text-zinc-700'
                    : isGenerationMode && !selectedFile
                      ? 'text-white bg-emerald-500 hover:bg-emerald-400 px-3'
                      : 'text-zinc-900 bg-zinc-100 hover:bg-white px-3'
                }`}
              >
                {isLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : isGenerationMode && !selectedFile ? (
                  <>
                    <Sparkles size={18} />
                    <span className="text-[11px] font-bold uppercase tracking-wider">{t('generate')}</span>
                  </>
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
