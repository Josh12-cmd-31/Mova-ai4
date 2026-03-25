import React, { useState, useRef, useEffect } from 'react';
import { useTranslation, Trans } from 'react-i18next';
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
import { OrchestrationService, OrchestrationConfig } from '../services/orchestrationService';
import { Message, SessionFile } from '../types';
import { db, handleFirestoreError, OperationType, auth } from '../services/firebase';
import { getDoc, doc, collection, query, where, onSnapshot } from 'firebase/firestore';

function FileImage({ fileId, alt, className, onLoad }: { fileId: string; alt: string; className?: string; onLoad?: (dataUrl: string) => void }) {
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
          onLoad?.(url);
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

function FileComparison({ before, after, beforeId, afterId, onMaximize }: { before?: string; after?: string; beforeId?: string; afterId?: string; onMaximize?: (url: string) => void }) {
  const { t } = useTranslation();
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

  if (!beforeUrl || !afterUrl) return <div className="flex items-center justify-center bg-zinc-900 rounded-2xl w-full aspect-video max-h-[600px] border border-white/5"><Loader2 className="w-6 h-6 animate-spin text-white/30" /></div>;

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-auto max-h-[800px] rounded-2xl overflow-hidden cursor-ew-resize select-none bg-zinc-950 border border-white/10 group shadow-2xl"
      onMouseMove={handleMove}
      onTouchMove={handleMove}
    >
      <img src={afterUrl} alt={t('after')} className="w-full h-auto block pointer-events-none" />
      <img 
        src={beforeUrl} 
        alt={t('before')} 
        className="absolute inset-0 w-full h-full object-cover pointer-events-none" 
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
      <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/40 backdrop-blur-md rounded text-[8px] font-bold uppercase tracking-widest text-white/70 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">{t('original')}</div>
      <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/40 backdrop-blur-md rounded text-[8px] font-bold uppercase tracking-widest text-white/70 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">{t('edited')}</div>
      {onMaximize && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onMaximize(afterUrl!);
          }}
          className="absolute bottom-3 right-3 p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
          title={t('maximize')}
        >
          <Maximize2 size={16} />
        </button>
      )}
    </div>
  );
}

const IMAGE_PROMPTS: Record<string, string[]> = {
  'gemini-3-pro-image-preview': [
    'prompt_dragon_eye',
    'prompt_futuristic_city',
    'prompt_serene_landscape',
    'prompt_steampunk_airship'
  ],
  'gemini-3.1-flash-image-preview': [
    'prompt_cute_robot',
    'prompt_cyberpunk_cat',
    'prompt_magical_forest',
    'prompt_minimalist_portrait'
  ],
  'gemini-2.5-flash-image': [
    'prompt_futuristic_car',
    'prompt_abstract_painting',
    'prompt_glass_sphere',
    'prompt_candy_house'
  ],
  'imagen-4.0-generate-001': [
    'prompt_elderly_man',
    'prompt_stormy_sea',
    'prompt_macro_dewdrop',
    'prompt_surrealist_landscape'
  ],
  'default': [
    'prompt_futuristic_city',
    'prompt_cute_robot',
    'prompt_serene_landscape',
    'prompt_cyberpunk_cat',
    'prompt_magical_forest',
    'prompt_steampunk_airship',
    'prompt_minimalist_portrait',
    'prompt_dragon_eye'
  ]
};

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
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [isGenerationMode, setIsGenerationMode] = useState(false);
  const [isOrchestrationMode, setIsOrchestrationMode] = useState(false);
  const [selectedImageModel, setSelectedImageModel] = useState('gemini-2.5-flash-image');
  const [isMagicEditPending, setIsMagicEditPending] = useState(false);

  const handleShare = async (dataUrl: string) => {
    try {
      if (navigator.share) {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], `${t('app_name').toLowerCase().replace(/\s+/g, '-')}-image.png`, { type: blob.type });
        await navigator.share({
          files: [file],
          title: t('share_title'),
          text: t('share_text')
        });
      } else {
        const blob = await (await fetch(dataUrl)).blob();
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type]: blob })
        ]);
        // No alert, just log or let the user see it's copied if we had a toast
        console.log(t('image_copied'));
      }
    } catch (err) {
      console.error(t('error_sharing'), err);
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
      console.error(t('download_failed_console'), err);
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
  const [orchestrationConfigs, setOrchestrationConfigs] = useState<OrchestrationConfig[]>([]);
  const [selectedOrchestrationConfig, setSelectedOrchestrationConfig] = useState<OrchestrationConfig | null>(null);
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
        
        if (isMagicEditPending && isImage) {
          setIsEditingMode(true);
          setIsGenerationMode(false);
          setIsOrchestrationMode(false);
          setIsMagicEditPending(false);
        }
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
        if (isEditingMode && mime.startsWith('image/')) {
          try {
            const result = await editImage(file, text || t('default_edit_prompt'), selectedImageModel);
            if (!result || !result.editedImageB64) {
              throw new GeminiError(t('image_edit_failed_desc'), "IMAGE_EDIT_FAILED");
            }
            responseText = result.textResponse || t('image_edit_processed');
            editedFile = result.editedImageB64;
          } catch (err: any) {
            console.error(t('request_execution_error'), err);
            throw err instanceof GeminiError ? err : new GeminiError(t('image_edit_error_desc'), "IMAGE_EDIT_ERROR");
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
          const result = await generateImage(text || t('default_gen_prompt'), selectedImageModel, options);
          if (!result || !result.generatedImageB64) {
            throw new GeminiError(t('image_gen_error_desc'), "IMAGE_GEN_FAILED");
          }
          responseText = result.textResponse || t('image_gen_processed');
          editedFile = result.generatedImageB64;
        } catch (err: any) {
          console.error(t('request_execution_error'), err);
          throw err instanceof GeminiError ? err : new GeminiError(t('image_gen_error_desc'), "IMAGE_GEN_ERROR");
        }
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
          globalContext: `SYSTEM ROLE: You are Mova AI, a coordinated multi-agent system.`,
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
        fileMimeType: editedFile ? 'image/png' : undefined,
        beforeFile: (isEditingMode && file) ? `data:${mime};base64,${file}` : undefined
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
        
        // Specific feedback for safety blocks in image context
        if (errorCode === "SAFETY_ERROR" || errorMessage.toLowerCase().includes("safety") || errorMessage.toLowerCase().includes("blocked")) {
          if (isGenerationMode) {
            errorMessage = t('safety_block_gen');
          } else if (isEditingMode) {
            errorMessage = t('safety_block_edit');
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
    { id: 'gemini-3-pro-image-preview', name: t('pro_image'), desc: t('highest_detail_quality'), tag: t('best'), strength: t('pro_image_strength') },
    { id: 'gemini-3.1-flash-image-preview', name: t('flash_hq'), desc: t('high_quality_flexible'), tag: t('hq'), strength: t('flash_hq_strength') },
    { id: 'gemini-2.5-flash-image', name: t('flash_image'), desc: t('fast_generation'), tag: t('fast'), strength: t('flash_image_strength') },
    { id: 'imagen-4.0-generate-001', name: t('imagen_4'), desc: t('photorealistic_results'), tag: t('new'), strength: t('imagen_4_strength') }
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
                <h2 className="text-xl font-bold text-white">{t('advanced_model_access')}</h2>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  <Trans 
                    i18nKey="api_key_selection_desc" 
                    values={{ modelName: activeImageModel.name }}
                    components={{ span: <span className="text-zinc-100 font-semibold" /> }}
                  />
                </p>
              </div>
              <div className="space-y-4">
                <button
                  onClick={handleSelectKey}
                  className="w-full py-3 bg-zinc-100 hover:bg-white text-zinc-900 rounded-xl font-bold transition-all shadow-lg"
                >
                  {t('select_api_key')}
                </button>
                <p className="text-[10px] text-zinc-500">
                  <Trans 
                    i18nKey="paid_project_required" 
                    components={{ 
                      billingLink: <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-zinc-300" /> 
                    }} 
                  />
                </p>
                <button
                  onClick={() => {
                    setSelectedImageModel('gemini-2.5-flash-image');
                    setIsKeyRequired(false);
                  }}
                  className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {t('switch_to_standard')}
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
                                          title={t('share')}
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
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleShare(msg.file!);
                                            }}
                                            className="p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white backdrop-blur-sm transition-colors"
                                            title={t('share')}
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
                <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-100">{t('image_gallery')}</h2>
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
                  <p className="text-xs font-medium">{t('no_images_yet')}</p>
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
                          alt={t('gallery_item')} 
                          className="w-full h-full object-cover transition-transform group-hover:scale-110"
                        />
                      ) : (
                        <img 
                          src={msg.file} 
                          alt={t('gallery_item')} 
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
                                handleDownload(msg.fileId, msg.fileName || t('image_filename'));
                              } else if (msg.file) {
                                const link = document.createElement('a');
                                link.href = msg.file;
                                link.download = msg.fileName || t('image_filename');
                                link.click();
                              }
                            }}
                            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white backdrop-blur-md transition-all"
                            title={t('download')}
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
                            title={t('share')}
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
                    title={t('zoom_in')}
                  >
                    <ZoomIn size={20} />
                  </button>
                  <button 
                    onClick={() => setZoomScale(prev => Math.max(prev - 0.5, 0.5))}
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all backdrop-blur-md"
                    title={t('zoom_out')}
                  >
                    <ZoomOut size={20} />
                  </button>
                  <a 
                    href={fullscreenDataUrl || fullscreenImage!} 
                    download={`${t('app_name').toLowerCase().replace(/\s+/g, '-')}-export.png`}
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all backdrop-blur-md"
                    title={t('download_image')}
                  >
                    <Download size={20} />
                  </a>
                  <button 
                    onClick={() => handleShare(fullscreenDataUrl || fullscreenImage!)}
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all backdrop-blur-md"
                    title={t('share_image')}
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
                alt={t('fullscreen_view')}
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
                    alt={t('fullscreen_view')} 
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
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => {
                        setIsMagicEditPending(false);
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
                      <div className="text-center">
                        <div className="text-[10px] font-bold text-zinc-100 uppercase tracking-wider">{t('upload_image')}</div>
                        <div className="text-[8px] text-zinc-500 uppercase tracking-tighter mt-0.5 leading-none">{t('upload_image_desc')}</div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setIsMagicEditPending(true);
                        if (fileInputRef.current) {
                          fileInputRef.current.accept = "image/*";
                          fileInputRef.current.click();
                        }
                        setIsMenuOpen(false);
                      }}
                      className="flex flex-col items-center gap-2 p-3 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-xl transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:text-indigo-300 transition-colors">
                        <Sparkles size={20} />
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] font-bold text-indigo-100 uppercase tracking-wider">{t('magic_edit')}</div>
                        <div className="text-[8px] text-indigo-300/60 uppercase tracking-tighter mt-0.5 leading-none">{t('magic_edit_desc')}</div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setIsMagicEditPending(false);
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
                              setIsGenerationMode(false);
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

                  {/* Visual Models */}
                  <div>
                    <div className="flex items-center justify-between mb-3 px-1">
                      <div className="flex items-center gap-2">
                        <ImageIcon size={14} className="text-zinc-500" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{t('visual_engine')}</span>
                      </div>
                      <button
                        onClick={() => setIsGenerationMode(!isGenerationMode)}
                        className={`text-[9px] font-bold uppercase px-2 py-1 rounded-full transition-all ${
                          isGenerationMode 
                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                            : 'bg-zinc-800 text-zinc-500'
                        }`}
                      >
                        {isGenerationMode ? t('gen_mode_on', { mode: t('gen') }) : t('gen_mode_off', { mode: t('gen') })}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { id: 'gemini-3-pro-image-preview', name: t('pro_image'), desc: t('highest_detail_quality'), tag: t('best'), strength: t('pro_image_strength') },
                        { id: 'gemini-3.1-flash-image-preview', name: t('flash_hq'), desc: t('high_quality_flexible'), tag: t('hq'), strength: t('flash_hq_strength') },
                        { id: 'gemini-2.5-flash-image', name: t('flash_image'), desc: t('fast_generation'), tag: t('fast'), strength: t('flash_image_strength') },
                        { id: 'imagen-4.0-generate-001', name: t('imagen_4'), desc: t('photorealistic_results'), tag: t('new'), strength: t('imagen_4_strength') }
                      ].map(model => (
                        <div key={model.id} className="relative group/item">
                          <button
                            onClick={() => {
                              setSelectedImageModel(model.id);
                              setIsGenerationMode(true);
                              setIsOrchestrationMode(false);
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
                      {t('generate')}
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
                        {isEditingMode ? t('editing') : t('analysis')}
                      </button>
                    ) : (
                      <div className="px-2 py-1 bg-zinc-800 text-zinc-400 rounded-md text-[10px] font-bold uppercase">
                        {t('analysis_mode')}
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
              {t('chat')}
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
              {t('gen')}
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
              {t('orch')}
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
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap">{t('try')}</span>
                  </div>
                  {currentPrompts.map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => setInput(t(prompt))}
                      className="whitespace-nowrap px-3 py-1.5 bg-zinc-800/80 hover:bg-zinc-700 border border-white/5 rounded-full text-[11px] text-zinc-300 transition-all hover:scale-105 active:scale-95"
                    >
                      {t(prompt)}
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
                      title={t('advanced_settings')}
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
                              {t('aspect_ratio')}
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
                              {t('artistic_style')}
                            </div>
                            <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto pr-1 scrollbar-hide">
                              {[
                                { id: '', name: t('none') },
                                { id: 'watercolor', name: t('watercolor') },
                                { id: 'oil painting', name: t('oil_painting') },
                                { id: '3d render', name: t('3d_render') },
                                { id: 'cyberpunk', name: t('cyberpunk') },
                                { id: 'minimalist', name: t('minimalist') },
                                { id: 'anime', name: t('anime') },
                                { id: 'pop art', name: t('pop_art') },
                                { id: 'sketch', name: t('sketch') },
                                { id: 'pixel art', name: t('pixel_art') },
                                { id: 'vaporwave', name: t('vaporwave') },
                                { id: 'synthwave', name: t('synthwave') }
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
                              {t('negative_prompt')}
                            </div>
                            <input 
                              type="text"
                              value={negativePrompt}
                              onChange={(e) => setNegativePrompt(e.target.value)}
                              placeholder={t('exclude_elements')}
                              className="w-full bg-zinc-800 border border-white/5 rounded-lg px-3 py-2 text-[11px] text-zinc-100 placeholder-zinc-600 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all"
                            />
                          </div>

                          {/* Seed */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                <Hash size={10} />
                                {t('seed_optional')}
                              </div>
                              <button
                                type="button"
                                onClick={() => setSeed(Math.floor(Math.random() * 1000000))}
                                className="p-1 text-zinc-500 hover:text-emerald-500 transition-colors"
                                title={t('randomize_seed')}
                              >
                                <Dices size={12} />
                              </button>
                            </div>
                            <input 
                              type="number"
                              value={seed || ''}
                              onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : undefined)}
                              placeholder={t('random_by_default')}
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

            {/* Active Mode Indicator */}
            <div className="absolute -top-6 left-4 flex items-center gap-2">
              <AnimatePresence mode="wait">
                {isGenerationMode ? (
                  <motion.div
                    key="gen"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full"
                  >
                    <Sparkles size={10} className="text-emerald-500" />
                    <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider">
                      {selectedImageModel.split('-')[0]} Visual Engine
                    </span>
                  </motion.div>
                ) : isOrchestrationMode ? (
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
