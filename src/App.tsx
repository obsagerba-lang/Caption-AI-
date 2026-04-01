import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  Image as ImageIcon, 
  Copy, 
  Check, 
  RefreshCw, 
  Languages, 
  Hash, 
  X,
  ChevronDown,
  Smartphone,
  MessageSquare,
  Heart,
  Zap,
  Trash2,
  Mic,
  Share2,
  Type,
  LogOut,
  Crown,
  User as UserIcon,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { 
  Tone, 
  Language, 
  Platform, 
  CaptionRequest, 
  GeneratedCaptions,
  FavoriteCaption
} from './types';
import { generateCaptions, detectLanguage } from './services/gemini';
import { UI_TRANSLATIONS } from './translations';
import { db, auth } from './firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, where } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';

const TONES: Tone[] = ['funny', 'romantic', 'savage', 'motivational', 'aesthetic', 'emotional', 'professional', 'luxury', 'travel'];
const LANGUAGES: Language[] = ['English', 'French', 'Spanish', 'Portuguese', 'Swahili', 'Arabic', 'Hindi', 'German', 'Amharic', 'Afaan Oromo', 'Portuguese (Brazil)'];
const PLATFORMS: Platform[] = ['Instagram', 'TikTok', 'Facebook', 'WhatsApp Status', 'Snapchat'];

type CaptionFont = 'sans' | 'serif' | 'mono' | 'cursive' | 'impact';

const FONT_STYLES: { id: CaptionFont; name: string; class: string }[] = [
  { id: 'sans', name: 'Modern', class: 'font-sans' },
  { id: 'serif', name: 'Classic', class: 'font-serif' },
  { id: 'mono', name: 'Technical', class: 'font-mono' },
  { id: 'cursive', name: 'Elegant', class: 'font-cursive' },
  { id: 'impact', name: 'Bold', class: 'font-impact' },
];

type AppStyle = 'neon' | 'galaxy' | 'pop' | 'glass';

const LANGUAGE_FLAGS: Record<Language, string> = {
  English: '🇬🇧',
  French: '🇫🇷',
  Spanish: '🇪🇸',
  Portuguese: '🇵🇹',
  Swahili: '🇰🇪',
  Arabic: '🇸🇦',
  Hindi: '🇮🇳',
  German: '🇩🇪',
  Amharic: '🇪🇹',
  'Afaan Oromo': '🇪🇹',
  'Portuguese (Brazil)': '🇧🇷'
};

const Logo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="globeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#00F0FF" />
        <stop offset="100%" stopColor="#0077FF" />
      </linearGradient>
      <linearGradient id="cGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#003366" />
        <stop offset="100%" stopColor="#001133" />
      </linearGradient>
    </defs>
    
    {/* Stylized 'C' wrapping the globe */}
    <path 
      d="M75 25C65 15 50 10 35 10C15 10 5 30 5 50C5 70 15 90 35 90C50 90 65 85 75 75" 
      stroke="#001133" 
      strokeWidth="10" 
      strokeLinecap="round" 
    />
    <path 
      d="M75 25C65 15 50 10 35 10C15 10 5 30 5 50C5 70 15 90 35 90C50 90 65 85 75 75" 
      stroke="#0077FF" 
      strokeWidth="4" 
      strokeLinecap="round"
      strokeDasharray="1 15"
      opacity="0.5"
    />

    {/* Globe */}
    <circle cx="45" cy="50" r="25" fill="url(#globeGradient)" />
    <circle cx="45" cy="50" r="25" stroke="#001133" strokeWidth="2" />
    
    {/* Globe Grid Lines */}
    <path d="M20 50H70" stroke="#001133" strokeWidth="1" opacity="0.5" />
    <path d="M45 25V75" stroke="#001133" strokeWidth="1" opacity="0.5" />
    <path d="M25 40C30 45 60 45 65 40" stroke="#001133" strokeWidth="1" opacity="0.3" fill="none" />
    <path d="M25 60C30 55 60 55 65 60" stroke="#001133" strokeWidth="1" opacity="0.3" fill="none" />
    <path d="M35 27C40 35 40 65 35 73" stroke="#001133" strokeWidth="1" opacity="0.3" fill="none" />
    <path d="M55 27C50 35 50 65 55 73" stroke="#001133" strokeWidth="1" opacity="0.3" fill="none" />

    {/* Sparkle */}
    <path 
      d="M85 75L88 83L96 86L88 89L85 97L82 89L74 86L82 83L85 75Z" 
      fill="#00F0FF"
    >
      <animate 
        attributeName="opacity" 
        values="0.6;1;0.6" 
        dur="2s" 
        repeatCount="indefinite" 
      />
    </path>
  </svg>
);

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [selectedTone, setSelectedTone] = useState<Tone>('aesthetic');
  const [selectedLanguages, setSelectedLanguages] = useState<Language[]>(['English']);
  const [uiLanguage, setUiLanguage] = useState<Language>('English');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('Instagram');
  const [captionCount, setCaptionCount] = useState(5);
  const [linesPerCaption, setLinesPerCaption] = useState(2);
  const [emojiIntensity, setEmojiIntensity] = useState(1); // 0: None, 1: Low, 2: Medium, 3: Abundant
  const [captionFont, setCaptionFont] = useState<CaptionFont>('sans');
  
  const t = UI_TRANSLATIONS[uiLanguage] || UI_TRANSLATIONS['English'];
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingMore, setIsGeneratingMore] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [result, setResult] = useState<GeneratedCaptions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<FavoriteCaption[]>([]);
  const [activeTab, setActiveTab] = useState<'results' | 'favorites'>('results');
  const [user, setUser] = useState<any>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [appStyle, setAppStyle] = useState<AppStyle>('neon');
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setUser(null);
      setIsPremium(false);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const togglePremium = () => {
    setIsPremium(!isPremium);
  };

  const getStyleColors = () => {
    switch (appStyle) {
      case 'neon': return { primary: 'cyan-500', secondary: 'violet-500', accent: 'cyan-400', bg: 'bg-[#0F1115]' };
      case 'galaxy': return { primary: 'indigo-600', secondary: 'fuchsia-600', accent: 'indigo-400', bg: 'bg-[#0B0E14]' };
      case 'pop': return { primary: 'pink-500', secondary: 'yellow-400', accent: 'pink-400', bg: 'bg-[#1A1A1A]' };
      case 'glass': return { primary: 'blue-400', secondary: 'emerald-400', accent: 'blue-300', bg: 'bg-[#121212]' };
      default: return { primary: 'cyan-500', secondary: 'violet-500', accent: 'cyan-400', bg: 'bg-[#0F1115]' };
    }
  };

  const colors = getStyleColors();

  const StyleSwitcher = () => (
    <div className="flex items-center gap-3">
      <span className="hidden md:block text-[10px] font-black text-gray-500 uppercase tracking-widest">Theme</span>
      <div className="flex gap-1 p-1 bg-white/5 rounded-full border border-white/10 backdrop-blur-md">
        {(['neon', 'galaxy', 'pop', 'glass'] as AppStyle[]).map((style) => (
          <button
            key={style}
            onClick={() => setAppStyle(style)}
            className={cn(
              "px-3 py-1.5 rounded-full text-[10px] font-black transition-all uppercase tracking-tighter",
              appStyle === style ? cn("text-white shadow-lg", `bg-${colors.primary}/40`) : "text-gray-500 hover:text-white"
            )}
          >
            {style}
          </button>
        ))}
      </div>
    </div>
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1, 
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setFavorites([]);
      return;
    }

    const favoritesRef = collection(db, 'users', user.uid, 'favorites');
    const q = query(favoritesRef);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const favs: FavoriteCaption[] = [];
      snapshot.forEach((doc) => {
        favs.push(doc.data() as FavoriteCaption);
      });
      setFavorites(favs);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (description.trim().length >= 5) {
        const detected = await detectLanguage(description);
        if (detected && !selectedLanguages.includes(detected)) {
          setSelectedLanguages(prev => {
            // If English is the only one and it's default, replace it
            if (prev.length === 1 && prev[0] === 'English' && description.trim().length > 0) {
              return [detected];
            }
            // Otherwise just add it if not present
            if (!prev.includes(detected)) {
              return [...prev, detected];
            }
            return prev;
          });
        }
      }
    }, 1000); // 1 second debounce

    return () => clearTimeout(timer);
  }, [description]);

  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isGenerating && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isGenerating]);

  const toggleFavorite = async (id: string, text: string, language: Language) => {
    if (!user) {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      return;
    }

    const favRef = doc(db, 'users', user.uid, 'favorites', id);
    const exists = favorites.find(f => f.id === id);

    if (exists) {
      await deleteDoc(favRef);
    } else {
      await setDoc(favRef, { id, text, language, userId: user.uid });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    let file: File | undefined;
    
    if ('dataTransfer' in e) {
      file = e.dataTransfer.files?.[0];
    } else {
      file = e.target.files?.[0];
    }

    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError("File is too large (max 10MB). High-quality uploads >10MB are reserved for Premium & Subscription users.");
        return;
      }
      setMimeType(file.type);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Your browser does not support voice input.");
        return;
      }
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setDescription(prev => prev + ' ' + transcript);
      };
      recognition.onend = () => setIsRecording(false);
      recognition.start();
      setIsRecording(true);
    }
  };

  const handleGenerate = async () => {
    if (!image && !description) {
      setError('Please provide an image, video, or a description.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);
    setActiveTab('results');
    
    try {
      const request: CaptionRequest = {
        image: image || undefined,
        mimeType: mimeType || undefined,
        description,
        tone: selectedTone,
        languages: selectedLanguages,
        platform: selectedPlatform,
        count: captionCount,
        linesPerCaption: linesPerCaption,
        emojiIntensity: emojiIntensity,
      };
      
      const data = await generateCaptions(request, (partialResult) => {
        setResult(partialResult as GeneratedCaptions);
      });
      
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateMore = async () => {
    if (!image && !description) return;

    setIsGeneratingMore(true);
    setError(null);
    
    try {
      const request: CaptionRequest = {
        image: image || undefined,
        mimeType: mimeType || undefined,
        description,
        tone: selectedTone,
        languages: selectedLanguages,
        platform: selectedPlatform,
        count: captionCount,
        linesPerCaption: linesPerCaption,
        emojiIntensity: emojiIntensity,
      };
      
      const data = await generateCaptions(request, (partialResult) => {
        setResult(prev => {
          if (!prev) return partialResult as GeneratedCaptions;
          // Merge partial result with previous result to avoid clearing UI
          return {
            ...prev,
            ...partialResult,
            captions: {
              ...prev.captions,
              ...((partialResult as GeneratedCaptions).captions || {})
            }
          } as GeneratedCaptions;
        });
      }, true); // generateAllLanguages = true
      
      setResult(prev => {
        if (!prev) return data;
        return {
          ...prev,
          ...data,
          captions: {
            ...prev.captions,
            ...(data.captions || {})
          }
        };
      });
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsGeneratingMore(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleShare = async (text: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Social Media Caption',
          text: text,
          url: window.location.href,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    } else {
      copyToClipboard(text, 'share-fallback');
    }
  };

  const toggleLanguage = (lang: Language) => {
    setSelectedLanguages(prev => 
      prev.includes(lang) 
        ? (prev.length > 1 ? prev.filter(l => l !== lang) : prev)
        : [...prev, lang]
    );
  };

  const hasCaptions = result?.captions && Object.values(result.captions).some(caps => caps && caps.length > 0);

  return (
    <div className={cn("min-h-screen pb-20 transition-colors duration-500 relative overflow-hidden", colors.bg, "text-white")}>
      {/* Background Glows */}
      <div className={cn("absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] pointer-events-none opacity-20", `bg-${colors.primary}`)} />
      <div className={cn("absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] pointer-events-none opacity-20", `bg-${colors.secondary}`)} />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/60 backdrop-blur-2xl border-b border-white/10 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className={cn("w-14 h-14 bg-gradient-to-br rounded-2xl flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110 group-hover:rotate-3 relative", `from-${colors.accent} to-${colors.secondary} shadow-${colors.secondary}/40`)}>
              <div className="absolute inset-0.5 bg-black/20 rounded-xl backdrop-blur-sm" />
              <div className="relative">
                <Logo className="text-white w-7 h-7 animate-pulse" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full blur-[2px] opacity-70" />
              </div>
            </div>
            <div className="flex flex-col">
              <h1 className="text-3xl font-display font-black tracking-tighter text-white leading-none">CAPTION<span className={cn(`text-${colors.accent}`)}>AI</span></h1>
              <div className="flex items-center gap-2 mt-1">
                <div className={cn("h-[2px] w-8 rounded-full", `bg-${colors.accent}`)} />
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Creative Studio</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Gemini AI Engine</span>
            </div>
            
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
              <Smartphone className="w-3 h-3 text-cyan-400" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Mobile Optimized</span>
            </div>
            
            {/* UI Language Selector */}
            <div className="relative">
              <button 
                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-xs font-bold text-white hover:bg-white/10 transition-all active:scale-95",
                  showLanguageMenu && "border-white/30 bg-white/10"
                )}
              >
                <Languages className={cn("w-4 h-4", `text-${colors.accent}`)} />
                <span>{LANGUAGE_FLAGS[uiLanguage]} {uiLanguage}</span>
                <ChevronDown className={cn("w-3 h-3 text-gray-400 transition-transform", showLanguageMenu && "rotate-180")} />
              </button>
              
              <AnimatePresence>
                {showLanguageMenu && (
                  <>
                    <div className="fixed inset-0 z-[55]" onClick={() => setShowLanguageMenu(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute top-full right-0 mt-2 w-56 bg-[#1A1D23] border border-white/10 rounded-2xl shadow-2xl z-[60] overflow-hidden backdrop-blur-xl"
                    >
                      <div className="max-h-80 overflow-y-auto py-2 scrollbar-hide">
                        <div className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5 mb-2">Select UI Language</div>
                        {LANGUAGES.map((lang) => (
                          <button
                            key={lang}
                            onClick={() => {
                              setUiLanguage(lang);
                              setShowLanguageMenu(false);
                            }}
                            className={cn(
                              "w-full flex items-center justify-between px-4 py-3 text-sm transition-all hover:bg-white/5",
                              uiLanguage === lang ? `text-${colors.accent} bg-${colors.accent}/5` : "text-gray-400"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-lg">{LANGUAGE_FLAGS[lang]}</span>
                              <span className="font-medium">{lang}</span>
                            </div>
                            {uiLanguage === lang && <Check className="w-4 h-4" />}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* User Profile & Premium */}
            <div className="flex items-center gap-3 ml-2 pl-4 border-l border-white/10">
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="relative group">
                    <button 
                      onClick={togglePremium}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest",
                        isPremium 
                          ? "bg-gradient-to-r from-yellow-400 to-orange-500 border-transparent text-black shadow-[0_0_15px_rgba(234,179,8,0.3)]" 
                          : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
                      )}
                    >
                      <Crown className={cn("w-3.5 h-3.5", isPremium ? "text-black" : "text-yellow-500")} />
                      {isPremium ? "Premium Active" : "Upgrade to Premium"}
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-3 pl-3 border-l border-white/5">
                    <div className="flex flex-col items-end hidden sm:flex">
                      <span className="text-[10px] font-bold text-white truncate max-w-[100px]">{user.displayName}</span>
                      <span className="text-[8px] font-black text-gray-500 uppercase tracking-tighter">{isPremium ? 'Pro Member' : 'Free Plan'}</span>
                    </div>
                    <div className="w-9 h-9 rounded-full border-2 border-white/10 overflow-hidden bg-white/5 flex items-center justify-center group relative cursor-pointer">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt="User" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <UserIcon className="w-5 h-5 text-gray-400" />
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button 
                          onClick={handleLogout}
                          className="text-white p-1 hover:text-red-400"
                          title="Logout"
                        >
                          <LogOut className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => signInWithPopup(auth, new GoogleAuthProvider())}
                  className={cn("flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/30 active:scale-95")}
                >
                  <UserIcon className="w-4 h-4" />
                  <span>Sign In</span>
                </button>
              )}
            </div>

            <StyleSwitcher />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-6 pt-16 md:pt-24 pb-20 relative z-10">
        {/* Hero Section */}
        <section className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className={cn("inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-bold mb-6", `text-${colors.accent}`)}
          >
            <Logo className="w-4 h-4" />
            {user ? `Welcome back, ${user.displayName || 'Creator'}! ✨` : "Your AI Creative Partner is ready."}
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("text-5xl md:text-7xl font-display font-black bg-clip-text text-transparent bg-gradient-to-r mb-6 leading-tight tracking-tighter", `from-${colors.accent} via-${colors.secondary} to-${colors.primary}`)}
          >
            {t.title}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-400 max-w-2xl mx-auto font-medium"
          >
            {t.subtitle}
            <span className="block mt-4 text-sm font-bold uppercase tracking-[0.3em] text-white/30">
              Transform your moments into stories
            </span>
          </motion.p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Inputs */}
          <div className="lg:col-span-7 space-y-8">
            {/* Image Upload Section */}
            <section className="bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10 shadow-xl">
              <h2 className="text-lg font-display font-semibold mb-4 flex items-center gap-2 text-white">
                <ImageIcon className={cn("w-5 h-5", `text-${colors.accent}`)} />
                {t.uploadTitle}
              </h2>
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleImageUpload}
              onDragOver={handleDragOver}
              className={cn(
                "relative aspect-video rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center gap-3",
                image ? "border-transparent" : cn("border-white/10 hover:bg-white/5", `hover:border-${colors.accent}`)
              )}
            >
              {image ? (
                <>
                  {mimeType?.startsWith('video/') ? (
                    <video src={image} controls autoPlay muted loop playsInline className="w-full h-full object-cover" />
                  ) : (
                    <img src={image} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  )}
                  <button 
                    onClick={(e) => { e.stopPropagation(); setImage(null); setMimeType(null); }}
                    className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black text-white rounded-full backdrop-blur-sm transition-colors z-10"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center">
                    <Upload className="w-6 h-6 text-gray-400" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-white">{t.uploadHint || "Click to upload or drag and drop"}</p>
                    <p className="text-sm text-gray-400">PNG, JPG, WEBP, or MP4 (max. 10MB)</p>
                    <p className="mt-2 text-[10px] text-gray-600 uppercase tracking-widest font-black">
                      Files &gt;10MB reserved for <span className={cn(`text-${colors.accent}`)}>Premium Users</span>
                    </p>
                  </div>
                </>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                className="hidden" 
                accept="image/*,video/*"
              />
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center justify-between">
                {t.describePlaceholder}
                <button
                  onClick={toggleRecording}
                  className={cn(
                    "p-2 rounded-full transition-colors",
                    isRecording ? "bg-red-500 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]" : "bg-white/10 text-gray-300 hover:bg-white/20"
                  )}
                >
                  <Mic className="w-5 h-5" />
                </button>
              </label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t.describePlaceholder}
                className={cn("w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:border-transparent transition-all resize-none h-24", `focus:ring-${colors.primary}`)}
              />
            </div>
          </section>

          {/* Tone & Style Section */}
          <section className="bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10 shadow-xl space-y-6">
            <div>
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Zap className={cn("w-4 h-4", `text-${colors.secondary}`)} />
                {t.toneLabel}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {TONES.map(tone => (
                  <button
                    key={tone}
                    onClick={() => setSelectedTone(tone)}
                    className={cn(
                      "px-4 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border active:scale-95 text-center",
                      selectedTone === tone 
                        ? cn("text-white border-transparent shadow-xl bg-gradient-to-r scale-[1.05] z-10", `from-${colors.primary} to-${colors.secondary} shadow-${colors.secondary}/30`) 
                        : "bg-white/5 text-gray-400 border-white/10 hover:border-white/30 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    {tone}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Smartphone className={cn("w-4 h-4", `text-${colors.accent}`)} />
                  {t.platformLabel}
                </h3>
                <div className="relative">
                  <select 
                    value={selectedPlatform}
                    onChange={(e) => setSelectedPlatform(e.target.value as Platform)}
                    className={cn("w-full appearance-none bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 pr-10 outline-none transition-all focus:ring-2", `focus:ring-${colors.primary}`)}
                  >
                    {PLATFORMS.map(p => <option key={p} value={p} className="bg-gray-900">{p}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <MessageSquare className={cn("w-4 h-4", `text-${colors.secondary}`)} />
                  {t.countLabel}
                </h3>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" 
                    min="1" 
                    max="10" 
                    value={captionCount}
                    onChange={(e) => setCaptionCount(parseInt(e.target.value))}
                    className={cn("flex-1", `accent-${colors.primary}`)}
                  />
                  <span className="font-display font-bold text-lg w-8 text-white">{captionCount}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Logo className={cn("w-4 h-4", `text-${colors.accent}`)} />
                  {t.emojiLabel}
                </h3>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" 
                    min="0" 
                    max="3" 
                    value={emojiIntensity}
                    onChange={(e) => setEmojiIntensity(parseInt(e.target.value))}
                    className={cn("flex-1", `accent-${colors.secondary}`)}
                  />
                  <span className="font-display font-bold text-lg w-24 text-right text-white">
                    {emojiIntensity === 0 ? t.none : emojiIntensity === 1 ? t.low : emojiIntensity === 2 ? t.medium : t.abundant}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Hash className={cn("w-4 h-4", `text-${colors.primary}`)} />
                  {t.linesLabel || "Lines per Caption"}
                </h3>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" 
                    min="1" 
                    max="5" 
                    value={linesPerCaption}
                    onChange={(e) => setLinesPerCaption(parseInt(e.target.value))}
                    className={cn("flex-1", `accent-${colors.accent}`)}
                  />
                  <span className="font-display font-bold text-lg w-8 text-white">{linesPerCaption}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Languages className={cn("w-4 h-4", `text-${colors.accent}`)} />
                {t.targetLanguagesLabel || "Target Languages"}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang}
                    onClick={() => toggleLanguage(lang)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border",
                      selectedLanguages.includes(lang)
                        ? cn("text-white scale-[1.02] bg-gradient-to-r shadow-lg", `from-${colors.primary}/20 to-${colors.secondary}/20 border-${colors.primary}/50 shadow-${colors.primary}/20`)
                        : "bg-white/5 text-gray-400 border-white/10 hover:border-white/30 hover:text-gray-200"
                    )}
                  >
                    <span className="text-lg">{LANGUAGE_FLAGS[lang]}</span>
                    <span className="truncate">{lang}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              {!user && (
                <button
                  onClick={() => signInWithPopup(auth, new GoogleAuthProvider())}
                  className="w-full bg-white/5 border border-white/10 text-white py-3 rounded-2xl font-medium flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
                >
                  <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
                  {t.signInToSave}
                </button>
              )}
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || (!image && !description)}
              className={cn("w-full text-white py-4 rounded-2xl font-display font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl bg-gradient-to-r", `from-${colors.primary} to-${colors.secondary} hover:from-${colors.accent} hover:to-${colors.primary} shadow-${colors.secondary}/25`)}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  {t.generatingBtn}
                </>
              ) : (
                <>
                  <Logo className="w-5 h-5" />
                  {t.generateBtn}
                </>
              )}
            </button>
            {error && <p className="text-red-400 text-sm text-center font-medium">{error}</p>}
          </section>
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-5" ref={resultsRef}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex gap-2">
              <button 
                onClick={() => setActiveTab('results')}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-bold transition-all",
                  activeTab === 'results' ? "bg-white text-black" : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
                )}
              >
                {t.resultsTab}
              </button>
              <button 
                onClick={() => setActiveTab('favorites')}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2",
                  activeTab === 'favorites' ? "bg-white text-black" : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
                )}
              >
                <Heart className="w-4 h-4" />
                {t.favoritesTab} ({favorites.length})
              </button>
            </div>
            {hasCaptions && activeTab === 'results' && (
              <button 
                onClick={() => setResult(null)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-red-400 transition-colors bg-white/5 rounded-lg border border-white/10"
              >
                <Trash2 className="w-3 h-3" />
                Clear All
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'results' ? (
              error ? (
                <motion.div 
                  key="error"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="h-full min-h-[400px] bg-red-500/10 backdrop-blur-md rounded-3xl border border-dashed border-red-500/30 flex flex-col items-center justify-center p-8 text-center"
                >
                  <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                    <X className="w-8 h-8 text-red-500" />
                  </div>
                  <h3 className="text-lg font-display font-semibold text-red-400">{t.generationFailed}</h3>
                  <p className="text-sm text-gray-400 max-w-[320px] mt-2 leading-relaxed">
                    {error}
                  </p>
                  <button 
                    onClick={handleGenerate}
                    className="mt-6 px-6 py-2 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors"
                  >
                    {t.tryAgain}
                  </button>
                </motion.div>
              ) : !result && !isGenerating ? (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="h-full min-h-[400px] bg-white/5 backdrop-blur-md rounded-3xl border border-dashed border-white/20 flex flex-col items-center justify-center p-8 text-center"
                >
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <Logo className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-display font-semibold text-gray-300">{t.readyToSparkle}</h3>
                  <p className="text-sm text-gray-400 max-w-[240px] mt-2">
                    {t.readyToSparkleSubtitle}
                  </p>
                </motion.div>
              ) : isGenerating && !hasCaptions ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="bg-white/5 backdrop-blur-md rounded-3xl p-8 shadow-lg border border-white/10 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite] z-10" />
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 bg-cyan-500/20 rounded-2xl flex items-center justify-center animate-pulse">
                        <Logo className="w-6 h-6 text-cyan-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-display font-bold text-white">Crafting your captions...</h3>
                        <p className="text-sm text-gray-400">Our AI is analyzing your inputs</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="h-24 bg-white/5 rounded-2xl animate-pulse" />
                      <div className="h-24 bg-white/5 rounded-2xl animate-pulse delay-75" />
                      <div className="h-24 bg-white/5 rounded-2xl animate-pulse delay-150" />
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="results"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-6"
                >
                  {/* Image Understanding */}
                  {result?.image_understanding && (
                    <motion.div variants={itemVariants} className="bg-white rounded-3xl p-6 shadow-lg relative overflow-hidden">
                      {isGenerating && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite] z-0 pointer-events-none" />}
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <Camera className="w-4 h-4 text-cyan-600" />
                            Image Analysis
                          </h3>
                          {!isGenerating && (
                            <button 
                              onClick={handleGenerate}
                              className="text-xs font-bold text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
                            >
                              <RefreshCw className="w-3 h-3" />
                              Generate Again
                            </button>
                          )}
                        </div>
                        <p className="text-gray-800 leading-relaxed italic font-medium">
                          "{result.image_understanding.description}"
                        </p>
                        <p className="text-sm text-cyan-600 mt-2 font-bold">
                          Mood: {result.image_understanding.mood}
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Captions by Language */}
                  {result?.captions && Object.entries(result.captions).map(([lang, captions]) => (
                    captions && captions.length > 0 && (
                      <motion.div variants={itemVariants} key={lang} className="bg-white rounded-3xl p-6 shadow-lg relative overflow-hidden">
                        {isGenerating && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite] z-0 pointer-events-none" />}
                        <div className="relative z-10">
                          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Languages className="w-4 h-4 text-pink-500" />
                            {lang} {LANGUAGE_FLAGS[lang as Language]}
                          </h3>
                          <div className="space-y-3">
                            {captions?.map((cap, idx) => {
                              const captionText = typeof cap === 'string' ? cap : cap?.text;
                              if (!captionText) return null;
                              const id = `${lang}-${idx}`;
                              const isFav = favorites.some(f => f.id === id);
                              return (
                                <motion.div 
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  key={id}
                                  className="group relative bg-white p-5 rounded-2xl shadow-lg hover:shadow-xl transition-all"
                                >
                                  <p className={cn(
                                    "text-black font-medium text-lg pr-16 leading-relaxed",
                                    FONT_STYLES.find(f => f.id === captionFont)?.class
                                  )}>{captionText}</p>
                                  <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                                    {/* Style Selector moved to individual caption */}
                                    <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl mb-1 shadow-inner">
                                      {FONT_STYLES.map(font => (
                                        <button
                                          key={font.id}
                                          onClick={() => setCaptionFont(font.id)}
                                          className={cn(
                                            "w-7 h-7 flex items-center justify-center rounded-lg text-[10px] transition-all",
                                            captionFont === font.id 
                                              ? "bg-white text-black shadow-md scale-110 ring-1 ring-black/5" 
                                              : "text-gray-400 hover:text-gray-600 hover:bg-gray-200"
                                          )}
                                          title={font.name}
                                        >
                                          <span className={font.class}>Aa</span>
                                        </button>
                                      ))}
                                    </div>
                                    
                                    <div className="flex items-center gap-1">
                                      <button 
                                        onClick={() => toggleFavorite(id, captionText, lang as Language)}
                                        className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all bg-gray-100", isFav ? "text-red-500 hover:bg-gray-200" : "text-gray-400 hover:text-red-400 hover:bg-gray-200")}
                                      >
                                        <Heart className={cn("w-3.5 h-3.5", isFav && "fill-current")} />
                                        <span>{isFav ? 'Saved' : 'Save'}</span>
                                      </button>
                                      <button 
                                        onClick={() => copyToClipboard(captionText, id)}
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold bg-gray-100 text-gray-400 hover:text-black hover:bg-gray-200 transition-colors"
                                      >
                                        {copiedId === id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                        <span>{copiedId === id ? 'Copied' : 'Copy'}</span>
                                      </button>
                                    </div>
                                    <button 
                                      onClick={() => handleShare(captionText)}
                                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold bg-gray-100 text-gray-400 hover:text-black hover:bg-gray-200 transition-colors w-full justify-center"
                                    >
                                      <Share2 className="w-3.5 h-3.5" />
                                      <span>Share</span>
                                    </button>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>
                      </motion.div>
                    )
                  ))}

                  {/* Hashtags */}
                  {result?.hashtags && result.hashtags.length > 0 && (
                    <motion.div variants={itemVariants} className="bg-white rounded-3xl p-6 shadow-lg relative overflow-hidden">
                      {isGenerating && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite] z-0 pointer-events-none" />}
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <Hash className="w-4 h-4 text-yellow-600" />
                            {t.hashtags}
                          </h3>
                          <button 
                            onClick={() => copyToClipboard(result.hashtags.join(' '), 'hashtags')}
                            className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {copiedId === 'hashtags' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {result.hashtags.map(tag => (
                            <motion.span 
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              key={tag} 
                              className="text-sm font-bold text-cyan-600 hover:text-cyan-700 hover:underline cursor-pointer"
                            >
                              {tag}
                            </motion.span>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Fallback if no content generated */}
                  {!hasCaptions && !isGenerating && (
                    <motion.div variants={itemVariants} className="bg-white rounded-3xl p-12 text-center shadow-lg">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <X className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-800">{t.noCaptions}</h3>
                      <p className="text-gray-500 mt-2">{t.noCaptionsSubtitle}</p>
                      <button 
                        onClick={handleGenerate}
                        className="mt-6 px-6 py-2 bg-cyan-500 text-white rounded-xl font-bold hover:bg-cyan-600 transition-colors"
                      >
                        {t.tryAgain}
                      </button>
                    </motion.div>
                  )}

                  {!isGenerating && result && (
                    <div className="flex flex-col sm:flex-row gap-4">
                      {Object.keys(result?.captions || {}).length < LANGUAGES.length && (
                        <motion.button 
                          variants={itemVariants}
                          onClick={handleGenerateMore}
                          disabled={isGeneratingMore}
                          className="flex-1 py-4 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 font-display font-bold text-cyan-400 flex items-center justify-center gap-2 hover:bg-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isGeneratingMore ? (
                            <>
                              <RefreshCw className="w-5 h-5 animate-spin" />
                              {t.generatingMore}
                            </>
                          ) : (
                            <>
                              <Languages className="w-5 h-5" />
                              {t.showMoreLanguages}
                            </>
                          )}
                        </motion.button>
                      )}
                      
                      <motion.button 
                        variants={itemVariants}
                        onClick={handleGenerate}
                        disabled={isGeneratingMore}
                        className="flex-1 py-4 rounded-2xl border border-white/20 bg-white/5 font-display font-bold text-white flex items-center justify-center gap-2 hover:bg-white/10 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                        {t.generateAgain}
                      </motion.button>
                    </div>
                  )}
                </motion.div>
              )
            ) : (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {favorites.length === 0 ? (
                  <div className="h-full min-h-[400px] bg-white/5 backdrop-blur-md rounded-3xl border border-dashed border-white/20 flex flex-col items-center justify-center p-8 text-center">
                    <Heart className="w-12 h-12 text-gray-500 mb-4" />
                    <h3 className="text-lg font-display font-semibold text-gray-300">No favorites yet</h3>
                    <p className="text-sm text-gray-400 max-w-[240px] mt-2">
                      Heart your favorite captions to see them here!
                    </p>
                  </div>
                ) : (
                  favorites.map((fav) => (
                    <div key={fav.id} className="bg-white p-6 rounded-3xl shadow-lg hover:shadow-xl transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{fav.language} {LANGUAGE_FLAGS[fav.language as Language]}</span>
                        <div className="flex items-center gap-2">
                          {/* Style Selector for Favorites */}
                          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl shadow-inner">
                            {FONT_STYLES.map(font => (
                              <button
                                key={font.id}
                                onClick={() => setCaptionFont(font.id)}
                                className={cn(
                                  "w-7 h-7 flex items-center justify-center rounded-lg text-[10px] transition-all",
                                  captionFont === font.id 
                                    ? "bg-white text-black shadow-md scale-110 ring-1 ring-black/5" 
                                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-200"
                                )}
                                title={font.name}
                              >
                                <span className={font.class}>Aa</span>
                              </button>
                            ))}
                          </div>
                          
                          <button 
                            onClick={() => toggleFavorite(fav.id, fav.text, fav.language)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all bg-gray-100 text-red-500 hover:bg-gray-200"
                          >
                            <Heart className="w-3.5 h-3.5 fill-current" />
                            <span>Saved</span>
                          </button>
                          <button 
                            onClick={() => copyToClipboard(fav.text, fav.id)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold bg-gray-100 text-gray-400 hover:text-black hover:bg-gray-200 transition-colors"
                          >
                            {copiedId === fav.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedId === fav.id ? 'Copied' : 'Copy'}</span>
                          </button>
                          <button 
                            onClick={() => handleShare(fav.text)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold bg-gray-100 text-gray-400 hover:text-black hover:bg-gray-200 transition-colors"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            <span>Share</span>
                          </button>
                        </div>
                      </div>
                      <p className={cn(
                        "text-black font-medium text-lg leading-relaxed",
                        FONT_STYLES.find(f => f.id === captionFont)?.class
                      )}>{fav.text}</p>
                    </div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-6 mt-12 pt-8 border-t border-white/10 text-center text-gray-400 text-sm">
        <p>© 2026 CaptionAI. Powered by O'S</p>
      </footer>
    </div>
  );
}
