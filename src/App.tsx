import React, { useState, useRef, useEffect } from 'react';
import { DailyEngagement } from './components/DailyEngagement';
import { WhyUs } from './components/WhyUs';
import { Paywall } from './components/Paywall';
import { Feedback } from './components/Feedback';
import { AdminDashboard } from './components/AdminDashboard';
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
  Share2,
  Type,
  LogOut,
  Crown,
  User as UserIcon,
  Sparkles,
  Edit2,
  CopyPlus,
  BarChart2,
  Settings,
  AlertCircle,
  Save,
  Globe,
  Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { cn } from './lib/utils';
import { 
  Tone, 
  Language, 
  Platform, 
  CaptionRequest, 
  GeneratedCaptions,
  FavoriteCaption,
  Draft
} from './types';
import { generateCaptions, detectLanguage } from './services/gemini';
import { UI_TRANSLATIONS } from './translations';
import { CaptionSkeleton } from './components/Skeleton';
import { db, auth } from './firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, where } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';

const TONES: Tone[] = ['viral', 'casual', 'minimalist', 'witty', 'inspiring', 'informative', 'short', 'emotional', 'funny', 'luxury', 'aesthetic', 'romantic', 'savage', 'motivational', 'professional', 'travel'];
const LANGUAGES: Language[] = ['English', 'French', 'Spanish', 'Portuguese', 'Swahili', 'Arabic', 'Hindi', 'German', 'Amharic', 'Afaan Oromo', 'Portuguese (Brazil)'];
const PLATFORMS: Platform[] = ['Instagram', 'TikTok', 'Facebook', 'WhatsApp Status', 'Snapchat', 'LinkedIn', 'Pinterest', 'Twitter/X'];

// --- Error Handling & Robustness ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  toast.error(`Database error: ${errInfo.error}`);
  throw new Error(JSON.stringify(errInfo));
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0F1115] flex flex-col items-center justify-center p-6 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-black text-white mb-2">Something went wrong</h1>
          <p className="text-gray-400 mb-6 max-w-md">The application crashed. We've been notified and are working on a fix.</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-cyan-500 text-white rounded-xl font-bold hover:bg-cyan-600 transition-all"
          >
            Reload Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
      <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#00F0FF" />
        <stop offset="50%" stopColor="#7000FF" />
        <stop offset="100%" stopColor="#FF00D6" />
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    
    {/* Outer Ring */}
    <circle cx="50" cy="50" r="45" stroke="url(#logoGradient)" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
    
    {/* Main Shape: Stylized 'C' + Sparkle */}
    <path 
      d="M70 30C65 20 55 15 45 15C25 15 10 30 10 50C10 70 25 85 45 85C55 85 65 80 70 70" 
      stroke="url(#logoGradient)" 
      strokeWidth="8" 
      strokeLinecap="round" 
      filter="url(#glow)"
    />
    
    {/* Inner Globe / Core */}
    <circle cx="50" cy="50" r="18" fill="url(#logoGradient)" opacity="0.8" />
    <path d="M32 50H68" stroke="white" strokeWidth="0.5" opacity="0.5" />
    <path d="M50 32V68" stroke="white" strokeWidth="0.5" opacity="0.5" />
    
    {/* Dynamic Sparkle */}
    <path 
      d="M80 40L83 48L91 51L83 54L80 62L77 54L69 51L77 48L80 40Z" 
      fill="white"
    >
      <animate 
        attributeName="opacity" 
        values="0.4;1;0.4" 
        dur="1.5s" 
        repeatCount="indefinite" 
      />
      <animateTransform
        attributeName="transform"
        type="rotate"
        from="0 80 51"
        to="360 80 51"
        dur="10s"
        repeatCount="indefinite"
      />
    </path>
  </svg>
);

const LANGUAGE_MAP: Record<Language, string> = {
  'English': 'en-US',
  'French': 'fr-FR',
  'Spanish': 'es-ES',
  'Portuguese': 'pt-PT',
  'Swahili': 'sw-KE',
  'Arabic': 'ar-SA',
  'Hindi': 'hi-IN',
  'German': 'de-DE',
  'Amharic': 'am-ET',
  'Afaan Oromo': 'om-ET',
  'Portuguese (Brazil)': 'pt-BR'
};

export default function App() {
  const [images, setImages] = useState<{data: string, mimeType: string}[]>([]);
  const [description, setDescription] = useState('');
  const [selectedTone, setSelectedTone] = useState<Tone>('aesthetic');
  const [selectedLanguages, setSelectedLanguages] = useState<Language[]>([]);
  const [uiLanguage, setUiLanguage] = useState<Language>('English');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('Instagram');
  const [captionCount, setCaptionCount] = useState(5);
  const [linesPerCaption, setLinesPerCaption] = useState(2);
  const [emojiIntensity, setEmojiIntensity] = useState(1); // 0: None, 1: Low, 2: Medium, 3: Abundant
  const [isHashtagSettingsExpanded, setIsHashtagSettingsExpanded] = useState(false);
  const [hashtagCount, setHashtagCount] = useState(10);
  const [hashtagType, setHashtagType] = useState<'popular' | 'niche' | 'branded'>('popular');
  const [hashtagLength, setHashtagLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [showHashtags, setShowHashtags] = useState(true);
  const [captionFont, setCaptionFont] = useState<CaptionFont>('sans');
  
  const t = UI_TRANSLATIONS[uiLanguage] || UI_TRANSLATIONS['English'];
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingMore, setIsGeneratingMore] = useState(false);
  const [result, setResult] = useState<GeneratedCaptions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<FavoriteCaption[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [activeTab, setActiveTab] = useState<'results' | 'favorites' | 'stats' | 'drafts'>('results');
  const [user, setUser] = useState<any>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [dailyCaptionsGenerated, setDailyCaptionsGenerated] = useState(0);
  const [captionsSinceLastAd, setCaptionsSinceLastAd] = useState(0);
  const [lastResetDate, setLastResetDate] = useState(new Date().toDateString());
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReason, setPaywallReason] = useState('');
  const [appStyle, setAppStyle] = useState<AppStyle>('neon');
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedText, setEditedText] = useState('');
  const [usageStats, setUsageStats] = useState({ totalGenerated: 0, totalCopied: 0, totalSaved: 0 });
  const [history, setHistory] = useState<GeneratedCaptions[]>([]);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isCameraActive && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(e => console.error("Video play error:", e));
    }
  }, [isCameraActive, cameraStream]);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Load history, stats, and drafts from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('caption_history');
    const savedStats = localStorage.getItem('usage_stats');
    const savedDrafts = localStorage.getItem('caption_drafts');
    const savedDailyUsage = localStorage.getItem('daily_usage');
    const savedResetDate = localStorage.getItem('last_reset_date');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    if (savedStats) setUsageStats(JSON.parse(savedStats));
    if (savedDrafts) setDrafts(JSON.parse(savedDrafts));
    if (savedDailyUsage) setDailyCaptionsGenerated(parseInt(savedDailyUsage));
    if (savedResetDate) setLastResetDate(savedResetDate);
  }, []);

  // Persist history, stats, and drafts
  useEffect(() => {
    localStorage.setItem('caption_history', JSON.stringify(history.slice(0, 50))); // Keep last 50
    localStorage.setItem('usage_stats', JSON.stringify(usageStats));
    localStorage.setItem('caption_drafts', JSON.stringify(drafts));
    localStorage.setItem('daily_usage', dailyCaptionsGenerated.toString());
    localStorage.setItem('last_reset_date', lastResetDate);
  }, [history, usageStats, drafts, dailyCaptionsGenerated, lastResetDate]);

  // Reset daily usage if date has changed
  useEffect(() => {
    const today = new Date().toDateString();
    if (lastResetDate !== today) {
      setDailyCaptionsGenerated(0);
      setLastResetDate(today);
    }
  }, [lastResetDate]);

  // Sync with Firestore if logged in
  useEffect(() => {
    if (!user) return;
    const statsRef = doc(db, 'users', user.uid, 'data', 'stats');
    const unsubscribeStats = onSnapshot(statsRef, (doc) => {
      if (doc.exists()) {
        setUsageStats(doc.data() as any);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${user.uid}/data/stats`));

    const draftsRef = collection(db, 'users', user.uid, 'drafts');
    const unsubscribeDrafts = onSnapshot(draftsRef, (snapshot) => {
      const d: Draft[] = [];
      snapshot.forEach((doc) => d.push(doc.data() as Draft));
      setDrafts(d);
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${user.uid}/drafts`));

    return () => {
      unsubscribeStats();
      unsubscribeDrafts();
    };
  }, [user]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setUser(null);
      setIsPremium(false);
      toast.success("Logged out successfully");
    } catch (err) {
      console.error("Logout error:", err);
      toast.error("Failed to logout");
    }
  };

  const togglePremium = () => {
    setIsPremium(!isPremium);
    toast.success(isPremium ? "Switched to Free Plan" : "Premium Activated! Enjoy all features.");
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setUsageStats(prev => ({ ...prev, totalCopied: prev.totalCopied + 1 }));
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleShare = async (text: string) => {
    let fullText = text;
    if (showHashtags && result?.hashtags && result.hashtags.length > 0) {
      fullText += '\n\n' + result.hashtags.join(' ');
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'CaptionAI',
          text: fullText,
          url: window.location.href,
        });
        toast.success("Shared successfully!");
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Share error:', err);
          toast.error("Failed to share");
        }
      }
    } else {
      copyToClipboard(fullText, 'share');
    }
  };

  const startEditing = (id: string, text: string) => {
    setEditingId(id);
    setEditedText(text);
  };

  const saveEdit = (lang: string, idx: number) => {
    if (!result) return;
    const newResult = { ...result };
    if (newResult.captions[lang]) {
      newResult.captions[lang][idx] = editedText;
      setResult(newResult);
      setEditingId(null);
      toast.success("Caption updated!");
    }
  };

  const copyAllByLanguage = (lang: string) => {
    if (!result || !result.captions[lang]) return;
    let allText = result.captions[lang].join('\n\n');
    if (showHashtags && result?.hashtags && result.hashtags.length > 0) {
      allText += '\n\n' + result.hashtags.join(' ');
    }
    navigator.clipboard.writeText(allText);
    toast.success(`All ${lang} captions copied!`);
  };

  const getStyleColors = () => {
    switch (appStyle) {
      case 'neon': return { primary: 'cyan-500', secondary: 'violet-500', accent: 'cyan-400', bg: 'bg-gradient-to-br from-[#0F1115] to-[#1A1A2E]', radius: 'rounded-3xl', shadow: 'shadow-[0_0_20px_rgba(6,182,212,0.2)]' };
      case 'galaxy': return { primary: 'indigo-600', secondary: 'fuchsia-600', accent: 'indigo-400', bg: 'bg-gradient-to-br from-[#0B0E14] to-[#1E1B4B]', radius: 'rounded-full', shadow: 'shadow-xl' };
      case 'pop': return { primary: 'pink-500', secondary: 'yellow-400', accent: 'pink-400', bg: 'bg-gradient-to-br from-[#1A1A1A] to-[#2D1B2E]', radius: 'rounded-none', shadow: 'shadow-none' };
      case 'glass': return { primary: 'blue-400', secondary: 'emerald-400', accent: 'blue-300', bg: 'bg-gradient-to-br from-[#121212] to-[#1B2631]', radius: 'rounded-2xl', shadow: 'shadow-inner' };
      default: return { primary: 'cyan-500', secondary: 'violet-500', accent: 'cyan-400', bg: 'bg-gradient-to-br from-[#0F1115] to-[#1A1A2E]', radius: 'rounded-3xl', shadow: 'shadow-lg' };
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
      setUsageStats(prev => ({ ...prev, totalSaved: favs.length }));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/favorites`);
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

  const handleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast.success("Signed in successfully! ✨");
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        toast.info("Sign-in cancelled");
      } else {
        console.error("Sign-in error:", err);
        toast.error("Failed to sign in. Please try again.");
      }
    }
  };

  const toggleFavorite = async (id: string, text: string, language: Language) => {
    if (!user) {
      toast.info("Please sign in to save favorites");
      await handleSignIn();
      return;
    }

    const path = `users/${user.uid}/favorites/${id}`;
    const favRef = doc(db, 'users', user.uid, 'favorites', id);
    const exists = favorites.find(f => f.id === id);

    try {
      if (exists) {
        await deleteDoc(favRef);
        toast.success("Removed from favorites");
      } else {
        await setDoc(favRef, { id, text, language, userId: user.uid });
        toast.success("Saved to favorites!");
      }
    } catch (error) {
      handleFirestoreError(error, exists ? OperationType.DELETE : OperationType.WRITE, path);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    let files: FileList | null = null;
    
    if ('dataTransfer' in e) {
      files = e.dataTransfer.files;
    } else {
      files = e.target.files;
    }

    if (files) {
      const MAX_FREE_IMAGE = 5 * 1024 * 1024;
      const MAX_FREE_VIDEO = 10 * 1024 * 1024;
      const MAX_PREMIUM_IMAGE = 20 * 1024 * 1024;
      const MAX_PREMIUM_VIDEO = 100 * 1024 * 1024;

      const limit = isPremium ? 20 : 5;
      const remainingSlots = limit - images.length;
      const filesToProcess = Array.from(files).slice(0, remainingSlots);

      if (files.length > remainingSlots) {
        toast.info(`You can only upload up to ${limit} photos.`);
      }

      const readFiles = filesToProcess.map(file => {
        return new Promise<{data: string, mimeType: string}>((resolve, reject) => {
          const isVideo = file.type.startsWith('video/');
          const maxSize = isVideo 
            ? (isPremium ? MAX_PREMIUM_VIDEO : MAX_FREE_VIDEO)
            : (isPremium ? MAX_PREMIUM_IMAGE : MAX_FREE_IMAGE);

          if (file.size > maxSize) {
            toast.error(`File ${file.name} is too large!`);
            reject(new Error('File too large'));
            return;
          }

          const reader = new FileReader();
          reader.onloadend = () => {
            resolve({ data: reader.result as string, mimeType: file.type });
          };
          reader.onerror = () => reject(new Error('Read failed'));
          reader.readAsDataURL(file);
        });
      });

      Promise.allSettled(readFiles).then(results => {
        const successfulImages = results
          .filter((r): r is PromiseFulfilledResult<{data: string, mimeType: string}> => r.status === 'fulfilled')
          .map(r => r.value);
        
        if (successfulImages.length > 0) {
          setImages(prev => [...prev, ...successfulImages]);
        }
      });
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error("Camera not supported. Please ensure you are using a modern browser and a secure connection (HTTPS).");
        return;
      }
      
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      } catch (e: any) {
        // Fallback if facingMode is not supported
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      
      setCameraStream(stream);
      setIsCameraActive(true);
      // videoRef is handled by useEffect
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.message === 'Permission denied') {
        toast.error("Camera access denied. Please click the lock icon in your browser's address bar to allow camera access.");
      } else {
        toast.error("Could not access camera: " + err.message);
      }
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setImages(prev => [...prev, { data: dataUrl, mimeType: 'image/jpeg' }]);
        stopCamera();
        toast.success("Photo captured!");
      }
    }
  };

  const handleSaveDraft = async () => {
    if (images.length === 0 && !description) {
      toast.error("Nothing to save! Add images or description first.");
      return;
    }

    const newDraft: Draft = {
      id: `draft_${Date.now()}`,
      images: images,
      description,
      tone: selectedTone,
      languages: selectedLanguages,
      platform: selectedPlatform,
      count: captionCount,
      linesPerCaption: linesPerCaption,
      emojiIntensity: emojiIntensity,
      hashtagCount: hashtagCount,
      hashtagType: hashtagType,
      hashtagLength: hashtagLength,
      createdAt: Date.now()
    };

    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'drafts', newDraft.id), newDraft);
        toast.success("Draft saved to cloud! ☁️");
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/drafts/${newDraft.id}`);
      }
    } else {
      setDrafts(prev => [newDraft, ...prev]);
      toast.success("Draft saved locally! 💾");
    }
  };

  const loadDraft = (draft: Draft) => {
    setImages(draft.images || []);
    setDescription(draft.description);
    setSelectedTone(draft.tone);
    setSelectedLanguages(draft.languages);
    setSelectedPlatform(draft.platform);
    setCaptionCount(draft.count);
    setLinesPerCaption(draft.linesPerCaption);
    setEmojiIntensity(draft.emojiIntensity);
    setHashtagCount(draft.hashtagCount);
    setHashtagType(draft.hashtagType);
    setHashtagLength(draft.hashtagLength);
    setActiveTab('results');
    toast.success("Draft loaded! 📝");
    
    // Scroll to top to see loaded content
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteDraft = async (id: string) => {
    if (user) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'drafts', id));
        toast.success("Draft deleted from cloud");
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/drafts/${id}`);
      }
    } else {
      setDrafts(prev => prev.filter(d => d.id !== id));
      toast.success("Draft deleted");
    }
  };



  const handleGenerate = async () => {
    if (images.length === 0 && !description) {
      setError('Please provide images or a description.');
      toast.error("Input required: Please upload images or write a description.");
      return;
    }

    if (!user) {
      toast.info("Please sign in to generate captions");
      await handleSignIn();
      return;
    }

    if (!isPremium && dailyCaptionsGenerated >= 5) {
      setPaywallReason("You reached today’s limit 😅 Watch ad or upgrade to continue");
      setShowPaywall(true);
      return;
    }

    if (!isPremium && captionCount > 5) {
      toast.info("Free plan is limited to 5 captions. Upgrade to Premium for up to 10!");
      setCaptionCount(5);
    }

    if (selectedLanguages.length === 0) {
      setError('Please choose one or more languages.');
      toast.error("Language required: Please choose one or more languages.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);
    setActiveTab('results');
    
    try {
      const request: CaptionRequest = {
        images: images,
        description,
        tone: selectedTone,
        languages: selectedLanguages,
        platform: selectedPlatform,
        count: isPremium ? captionCount : Math.min(captionCount, 5),
        linesPerCaption: linesPerCaption,
        emojiIntensity: emojiIntensity,
        hashtagCount: hashtagCount,
        hashtagType: hashtagType,
        hashtagLength: hashtagLength,
      };
      
      const data = await generateCaptions(request, (partialResult) => {
        setResult(prev => {
          if (!prev) return partialResult as GeneratedCaptions;
          return {
            ...prev,
            ...partialResult,
            captions: {
              ...prev.captions,
              ...((partialResult as GeneratedCaptions).captions || {})
            }
          } as GeneratedCaptions;
        });
      }, false);
      
      setResult(data);
      setHistory(prev => [data, ...prev]);
      setUsageStats(prev => ({ ...prev, totalGenerated: prev.totalGenerated + (isPremium ? captionCount : Math.min(captionCount, 5)) }));
      
      if (!isPremium) {
        setDailyCaptionsGenerated(prev => prev + 1);
        setCaptionsSinceLastAd(prev => prev + 1);
        if (captionsSinceLastAd + 1 >= 2) {
          setPaywallReason("Watch ad → unlock more");
          setShowPaywall(true);
          setCaptionsSinceLastAd(0);
        }
      }
      
      toast.success("Captions generated successfully! ✨");
    } catch (err: any) {
      const errorMessage = err.message || 'Something went wrong during generation';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error("Generation error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateMore = async () => {
    if (images.length === 0 && !description) return;
    
    if (selectedLanguages.length === 0) {
      toast.error("Please choose one or more languages.");
      return;
    }

    if (!isPremium) {
      toast.info("Multi-language generation is a Premium feature!");
      togglePremium();
      return;
    }

    setIsGeneratingMore(true);
    setError(null);
    
    try {
      const request: CaptionRequest = {
        images: images,
        description,
        tone: selectedTone,
        languages: selectedLanguages,
        platform: selectedPlatform,
        count: captionCount,
        linesPerCaption: linesPerCaption,
        emojiIntensity: emojiIntensity,
        hashtagCount: hashtagCount,
        hashtagType: hashtagType,
        hashtagLength: hashtagLength,
      };
      
      const data = await generateCaptions(request, (partialResult) => {
        setResult(prev => {
          if (!prev) return partialResult as GeneratedCaptions;
          return {
            ...prev,
            ...partialResult,
            captions: {
              ...prev.captions,
              ...((partialResult as GeneratedCaptions).captions || {})
            }
          } as GeneratedCaptions;
        });
      }, false);
      
      setResult(prev => {
        if (!prev) return data;
        const newTotal = Object.values(data.captions || {}).reduce((acc, curr) => acc + (curr?.length || 0), 0);
        setUsageStats(s => ({ ...s, totalGenerated: s.totalGenerated + newTotal }));
        const newResult = {
          ...prev,
          ...data,
          captions: {
            ...prev.captions,
            ...(data.captions || {})
          }
        };
        setHistory(h => [newResult, ...h.filter(item => item !== prev)]);
        return newResult;
      });
      toast.success("Additional languages generated!");
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to generate more languages';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsGeneratingMore(false);
    }
  };

  const stylizeText = (text: string, font: CaptionFont): string => {
    if (font === 'sans') return text;
    
    const maps: Record<string, string> = {
      serif: "𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗",
      mono: "𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉𝟶𝟷𝟸𝟹𝟺𝟻𝟼𝟽𝟾𝟿",
      cursive: "𝒶𝒷𝒸𝒹𝑒𝒻𝑔𝒽𝒾𝒿𝓀𝓁𝓂𝓃𝑜𝓅𝓆𝓇𝓈𝓉𝓊𝓋𝓌𝓍𝓎𝓏𝒜𝐵𝒞𝒟𝐸𝐹𝒢𝐻𝐼𝒥𝒦𝐿𝑀𝒩𝒪𝒫𝒬𝑅𝒮𝒯𝒰𝒱𝒲𝒳𝒴𝒵𝟢𝟣𝟤𝟥𝟦𝟧𝟨𝟩𝟪𝟫",
      impact: "𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵"
    };

    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const map = maps[font];
    if (!map) return text;

    const mapArray = Array.from(map);
    return Array.from(text).map(char => {
      const idx = chars.indexOf(char);
      if (idx === -1) return char;
      return mapArray[idx];
    }).join('');
  };

  const copyStylized = (text: string, font: CaptionFont, id: string) => {
    let fullText = text;
    if (showHashtags && result?.hashtags && result.hashtags.length > 0) {
      fullText += '\n\n' + result.hashtags.join(' ');
    }
    const stylized = stylizeText(fullText, font);
    copyToClipboard(stylized, id);
    toast.success(`Copied in ${font} style!`);
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
    <ErrorBoundary>
      <div className={cn("min-h-screen pb-20 transition-all duration-500 relative overflow-hidden", colors.bg, colors.radius, colors.shadow, "text-white")}>
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
            <button className="md:hidden p-2 text-white" onClick={() => setShowMobileMenu(true)}>
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.engineBadge}</span>
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
            <div className="hidden md:flex items-center gap-3 ml-2 pl-4 border-l border-white/10">
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
                  onClick={handleSignIn}
                  className={cn("flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/30 active:scale-95")}
                >
                  <UserIcon className="w-4 h-4" />
                  <span>Sign In</span>
                </button>
              )}
            </div>

            <div className="hidden md:flex">
              <StyleSwitcher />
            </div>
          </div>
        </div>
      </header>
      
      <div className="max-w-5xl mx-auto">
        <DailyEngagement t={t} />
        {user?.email === 'obsagerba@gmail.com' && (
          <div className="mt-8 p-4">
            <AdminDashboard />
          </div>
        )}
      </div>

      <AnimatePresence>
        {showMobileMenu && (
          <>
            <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm" onClick={() => setShowMobileMenu(false)} />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed inset-y-0 right-0 z-[70] w-64 bg-[#1A1D23] border-l border-white/10 p-6"
            >
              <button className="absolute top-4 right-4 text-white" onClick={() => setShowMobileMenu(false)}>
                <X className="w-6 h-6" />
              </button>
              <div className="flex flex-col gap-6 mt-12">
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Theme</span>
                  <StyleSwitcher />
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Account</span>
                  {user ? (
                    <div className="flex flex-col gap-3">
                      <button 
                        onClick={togglePremium}
                        className={cn(
                          "flex items-center justify-center gap-2 px-3 py-2 rounded-xl border transition-all text-xs font-black uppercase tracking-widest",
                          isPremium 
                            ? "bg-gradient-to-r from-yellow-400 to-orange-500 border-transparent text-black" 
                            : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
                        )}
                      >
                        <Crown className={cn("w-4 h-4", isPremium ? "text-black" : "text-yellow-500")} />
                        {isPremium ? "Premium Active" : "Upgrade to Premium"}
                      </button>
                      <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white">{user.displayName}</span>
                          <span className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">{isPremium ? 'Pro Member' : 'Free Plan'}</span>
                        </div>
                        <button onClick={handleLogout} className="text-red-400 p-2">
                          <LogOut className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={handleSignIn}
                      className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all bg-white/5 border border-white/10 hover:bg-white/10"
                    >
                      <UserIcon className="w-4 h-4" />
                      <span>Sign In</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      
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
            Turn your photo into viral captions in seconds
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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-display font-semibold flex items-center gap-2 text-white">
                  <ImageIcon className={cn("w-5 h-5", `text-${colors.accent}`)} />
                  {t.uploadTitle}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => isCameraActive ? stopCamera() : startCamera()}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                      isCameraActive 
                        ? "bg-red-500/20 text-red-400 border border-red-500/30" 
                        : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    {isCameraActive ? "Close Camera" : "Open Camera"}
                  </button>
                </div>
              </div>
            
            <div 
              onClick={() => !isCameraActive && fileInputRef.current?.click()}
              onDrop={handleImageUpload}
              onDragOver={handleDragOver}
              className={cn(
                "relative aspect-video rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center gap-3",
                (images.length > 0 || isCameraActive) ? "border-transparent" : cn("border-white/10 hover:bg-white/5", `hover:border-${colors.accent}`)
              )}
            >
              {isCameraActive ? (
                <div className="relative w-full h-full">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4">
                    <button
                      onClick={(e) => { e.stopPropagation(); capturePhoto(); }}
                      className={cn("w-14 h-14 rounded-full border-4 border-white flex items-center justify-center transition-all hover:scale-110 active:scale-90", `bg-${colors.primary}`)}
                    >
                      <div className="w-10 h-10 rounded-full bg-white/20 border border-white/40" />
                    </button>
                  </div>
                </div>
              ) : images.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 w-full h-full p-2 overflow-y-auto">
                  {images.map((img, index) => (
                    <div key={index} className="relative aspect-square">
                      {img.mimeType.startsWith('video/') ? (
                        <video src={img.data} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <img src={img.data} alt={`Preview ${index}`} className="w-full h-full object-cover rounded-lg" referrerPolicy="no-referrer" />
                      )}
                      <button 
                        onClick={(e) => { e.stopPropagation(); setImages(prev => prev.filter((_, i) => i !== index)); }}
                        className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black text-white rounded-full backdrop-blur-sm transition-colors z-10"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
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
                multiple
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t.descriptionLabel || "Context & Feelings (Optional)"}
              </label>
              <div className="relative">
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t.descriptionPlaceholder || "Describe the vibe, feeling, or context (Optional)..."}
                  className={cn("w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:border-transparent transition-all resize-none h-24", `focus:ring-${colors.primary}`)}
                />
              </div>
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/10">
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

            {/* Hashtag Customization */}
            <div className="space-y-6 pt-6 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Hash className={cn("w-4 h-4", `text-${colors.primary}`)} />
                  <span className="text-sm font-black text-gray-400 uppercase tracking-widest">Include Hashtags</span>
                </div>
                <button 
                  onClick={() => setShowHashtags(!showHashtags)}
                  className={cn(
                    "w-12 h-6 rounded-full relative transition-all duration-300",
                    showHashtags ? `bg-${colors.primary}` : "bg-gray-700"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300",
                    showHashtags ? "right-1" : "left-1"
                  )} />
                </button>
              </div>

              <button 
                onClick={() => setIsHashtagSettingsExpanded(!isHashtagSettingsExpanded)}
                className="w-full flex items-center justify-between text-sm font-black text-gray-400 uppercase tracking-widest"
              >
                <div className="flex items-center gap-2">
                  <Hash className={cn("w-4 h-4", `text-${colors.primary}`)} />
                  Hashtag Settings
                </div>
                {isHashtagSettingsExpanded ? <ChevronDown className="w-4 h-4 rotate-180" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              
              {isHashtagSettingsExpanded && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-2">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Count</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="30" 
                      value={hashtagCount}
                      onChange={(e) => {
                        setHashtagCount(parseInt(e.target.value));
                        setIsHashtagSettingsExpanded(false);
                      }}
                      className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Type</label>
                    <select 
                      value={hashtagType}
                      onChange={(e) => {
                        setHashtagType(e.target.value as any);
                        setIsHashtagSettingsExpanded(false);
                      }}
                      className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="popular">Popular</option>
                      <option value="niche">Niche</option>
                      <option value="branded">Branded</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Length</label>
                    <select 
                      value={hashtagLength}
                      onChange={(e) => {
                        setHashtagLength(e.target.value as any);
                        setIsHashtagSettingsExpanded(false);
                      }}
                      className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="short">Short</option>
                      <option value="medium">Medium</option>
                      <option value="long">Long</option>
                    </select>
                  </div>
                </div>
              )}
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

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleSaveDraft}
                className={cn(
                  "flex-1 bg-white/5 border border-white/10 text-white py-4 rounded-2xl font-display font-bold text-lg flex items-center justify-center gap-2 hover:bg-white/10 transition-all",
                  `hover:border-${colors.primary}/50`
                )}
              >
                <Save className="w-5 h-5" />
                {t.saveDraft || "Save Draft"}
              </button>
              <button
                onClick={handleGenerate}
                disabled={isGenerating || (images.length === 0 && !description)}
                className={cn("flex-[2] text-white py-4 rounded-2xl font-display font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl bg-gradient-to-r", `from-${colors.primary} to-${colors.secondary} hover:from-${colors.accent} hover:to-${colors.primary} shadow-${colors.secondary}/25`)}
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
            </div>
            {error && <p className="text-red-400 text-sm text-center font-medium">{error}</p>}
          </section>
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-5" ref={resultsRef}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <button 
                onClick={() => setActiveTab('results')}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap",
                  activeTab === 'results' ? "bg-white text-black" : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
                )}
              >
                {t.resultsTab}
              </button>
              <button 
                onClick={() => setActiveTab('favorites')}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap",
                  activeTab === 'favorites' ? "bg-white text-black" : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
                )}
              >
                <Heart className="w-4 h-4" />
                {t.favoritesTab} ({favorites.length})
              </button>
              <button 
                onClick={() => setActiveTab('drafts')}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap",
                  activeTab === 'drafts' ? "bg-white text-black" : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
                )}
              >
                <Save className="w-4 h-4" />
                {t.draftsTab || "Drafts"} ({drafts.length})
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
                  <div className="text-center py-12">
                     <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                     <h3 className="text-xl font-display font-bold text-white">Generating...</h3>
                  </div>
                  <CaptionSkeleton />
                  <CaptionSkeleton />
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
                        <div className="flex items-center gap-2 mt-3">
                          <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Vibe:</span>
                          <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-500 text-xs font-bold border border-cyan-500/20">
                            {result.image_understanding.mood}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Captions by Language */}
                  {result?.captions && Object.entries(result.captions).map(([lang, captions]) => (
                    captions && captions.length > 0 && (
                      <motion.div variants={itemVariants} key={lang} className="bg-white rounded-3xl p-6 shadow-lg relative overflow-hidden">
                        {isGenerating && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite] z-0 pointer-events-none" />}
                        <div className="relative z-10">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                              <Languages className="w-4 h-4 text-pink-500" />
                              {lang} {LANGUAGE_FLAGS[lang as Language]}
                            </h3>
                            <button 
                              onClick={() => copyAllByLanguage(lang)}
                              className="text-[10px] font-black text-cyan-500 hover:text-cyan-400 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 transition-all"
                            >
                              <CopyPlus className="w-3.5 h-3.5" />
                              Copy All
                            </button>
                          </div>
                          <div className="space-y-3">
                            {captions?.map((cap, idx) => {
                              const captionText = typeof cap === 'string' ? cap : cap?.text;
                              if (!captionText) return null;
                              const id = `${lang}-${idx}`;
                              const isFav = favorites.some(f => f.id === id);
                              const isEditing = editingId === id;

                              return (
                                <motion.div 
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  key={id}
                                  className="group relative bg-white p-5 rounded-2xl shadow-lg hover:shadow-xl transition-all border border-transparent hover:border-gray-100"
                                >
                                  {isEditing ? (
                                    <div className="space-y-3">
                                      <textarea
                                        value={editedText}
                                        onChange={(e) => setEditedText(e.target.value)}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-black font-medium text-lg outline-none focus:ring-2 focus:ring-cyan-500 min-h-[100px]"
                                        autoFocus
                                      />
                                      <div className="flex justify-end gap-2">
                                        <button 
                                          onClick={() => setEditingId(null)}
                                          className="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100"
                                        >
                                          Cancel
                                        </button>
                                        <button 
                                          onClick={() => saveEdit(lang, idx)}
                                          className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 text-white hover:bg-cyan-600 flex items-center gap-2"
                                        >
                                          <Save className="w-3.5 h-3.5" />
                                          Save Changes
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <p className={cn(
                                        "text-black font-medium text-lg pr-16 leading-relaxed mb-4",
                                        FONT_STYLES.find(f => f.id === captionFont)?.class
                                      )}>
                                        {captionText}
                                        {showHashtags && result?.hashtags && result.hashtags.length > 0 && (
                                          <span className="block mt-4 text-cyan-600 font-bold text-sm">
                                            {result.hashtags.join(' ')}
                                          </span>
                                        )}
                                      </p>
                                      
                                      <div className="flex flex-col gap-4">
                                        {/* Prominent Style Selector */}
                                        <div className="flex flex-wrap items-center gap-2 p-2 bg-gray-50 rounded-2xl border border-gray-100">
                                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mr-2">Writing Style</span>
                                          {FONT_STYLES.map(font => (
                                            <button
                                              key={font.id}
                                              onClick={() => setCaptionFont(font.id)}
                                              className={cn(
                                                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                                                captionFont === font.id 
                                                  ? "bg-white text-black shadow-sm ring-1 ring-black/5" 
                                                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                                              )}
                                            >
                                              <span className={cn("text-sm", font.class)}>Aa</span>
                                              <span className="hidden sm:inline">{font.name}</span>
                                            </button>
                                          ))}
                                        </div>

                                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-50">
                                          <div className="flex items-center gap-2">
                                            <button 
                                              onClick={() => startEditing(id, captionText)}
                                              className="p-2 rounded-xl text-gray-400 hover:text-cyan-500 hover:bg-cyan-50 transition-colors"
                                              title="Edit Caption"
                                            >
                                              <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button 
                                              onClick={() => toggleFavorite(id, captionText, lang as Language)}
                                              className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all", isFav ? "text-red-500 bg-red-50" : "text-gray-400 bg-gray-50 hover:text-red-400 hover:bg-red-50")}
                                            >
                                              <Heart className={cn("w-4 h-4", isFav && "fill-current")} />
                                              <span>{isFav ? 'Saved' : 'Save'}</span>
                                            </button>
                                          </div>

                                          <div className="flex items-center gap-2">
                                            <button 
                                              onClick={() => handleShare(captionText)}
                                              className="p-2 rounded-xl bg-gray-50 text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"
                                              title="Share"
                                            >
                                              <Share2 className="w-4 h-4" />
                                            </button>
                                            <button 
                                              onClick={() => copyStylized(captionText, captionFont, id)}
                                              className={cn(
                                                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                                                captionFont !== 'sans' 
                                                  ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/20" 
                                                  : "bg-black text-white"
                                              )}
                                            >
                                              {copiedId === id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                              <span>{copiedId === id ? 'Copied' : captionFont !== 'sans' ? 'Copy Styled' : 'Copy Text'}</span>
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </>
                                  )}
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
            ) : activeTab === 'favorites' ? (
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
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-black text-white flex items-center gap-2">
                        <Heart className="w-6 h-6 text-red-500" />
                        Saved Captions
                      </h2>
                      <button 
                        onClick={() => {
                          const allText = favorites.map(f => `[${f.language}] ${f.text}`).join('\n\n---\n\n');
                          navigator.clipboard.writeText(allText);
                          toast.success("All favorites copied!");
                        }}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-2"
                      >
                        <CopyPlus className="w-4 h-4" />
                        Copy All
                      </button>
                    </div>
                    {favorites.map((fav) => (
                    <div key={fav.id} className="bg-white p-6 rounded-3xl shadow-lg hover:shadow-xl transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{fav.language} {LANGUAGE_FLAGS[fav.language as Language]}</span>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => toggleFavorite(fav.id, fav.text, fav.language)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all bg-red-50 text-red-500 hover:bg-red-100"
                          >
                            <Heart className="w-3.5 h-3.5 fill-current" />
                            <span>Saved</span>
                          </button>
                          <button 
                            onClick={() => handleShare(fav.text)}
                            className="p-2 rounded-xl bg-gray-50 text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className={cn(
                        "text-black font-medium text-lg leading-relaxed mb-4",
                        FONT_STYLES.find(f => f.id === captionFont)?.class
                      )}>{fav.text}</p>

                      <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap items-center gap-2 p-2 bg-gray-50 rounded-2xl border border-gray-100">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mr-2">Style</span>
                          {FONT_STYLES.map(font => (
                            <button
                              key={font.id}
                              onClick={() => setCaptionFont(font.id)}
                              className={cn(
                                "px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1.5",
                                captionFont === font.id 
                                  ? "bg-white text-black shadow-sm ring-1 ring-black/5" 
                                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                              )}
                            >
                              <span className={cn("text-xs", font.class)}>Aa</span>
                              <span className="hidden sm:inline">{font.name}</span>
                            </button>
                          ))}
                        </div>
                        <button 
                          onClick={() => copyStylized(fav.text, captionFont, fav.id)}
                          className={cn(
                            "w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                            captionFont !== 'sans' 
                              ? "bg-cyan-500 text-white shadow-lg" 
                              : "bg-black text-white"
                          )}
                        >
                          {copiedId === fav.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          <span>{copiedId === fav.id ? 'Copied' : captionFont !== 'sans' ? 'Copy Styled' : 'Copy Text'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </motion.div>
            ) : activeTab === 'drafts' ? (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {drafts.length === 0 ? (
                  <div className="h-full min-h-[400px] bg-white/5 backdrop-blur-md rounded-3xl border border-dashed border-white/20 flex flex-col items-center justify-center p-8 text-center">
                    <Save className="w-12 h-12 text-gray-500 mb-4" />
                    <h3 className="text-lg font-display font-semibold text-gray-300">No drafts saved</h3>
                    <p className="text-sm text-gray-400 max-w-[240px] mt-2">
                      Save your current work as a draft to finish it later!
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-black text-white flex items-center gap-2">
                        <Save className="w-6 h-6 text-cyan-500" />
                        Saved Drafts
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {drafts.map((draft) => (
                        <div key={draft.id} className="bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-xl transition-all border border-transparent hover:border-cyan-500/20 group">
                          {draft.images && draft.images.length > 0 ? (
                            <div className="aspect-video relative overflow-hidden bg-gray-100">
                              <img src={draft.images[0].data} alt="Draft" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                <button 
                                  onClick={() => loadDraft(draft)}
                                  className="px-4 py-2 bg-white text-black rounded-xl font-bold text-xs hover:bg-cyan-500 hover:text-white transition-all"
                                >
                                  Load Draft
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="aspect-video bg-gray-100 flex items-center justify-center p-6 text-center relative">
                              <p className="text-xs text-gray-400 line-clamp-3 italic">"{draft.description}"</p>
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                <button 
                                  onClick={() => loadDraft(draft)}
                                  className="px-4 py-2 bg-white text-black rounded-xl font-bold text-xs hover:bg-cyan-500 hover:text-white transition-all"
                                >
                                  Load Draft
                                </button>
                              </div>
                            </div>
                          )}
                          <div className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{draft.platform} • {draft.tone}</span>
                              <span className="text-[10px] text-gray-400">{new Date(draft.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-sm text-gray-800 font-medium line-clamp-2 mb-4">
                              {draft.description || "No description provided"}
                            </p>
                            <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                              <div className="flex gap-1">
                                {draft.languages.slice(0, 3).map(lang => (
                                  <span key={lang} className="text-xs" title={lang}>{LANGUAGE_FLAGS[lang]}</span>
                                ))}
                                {draft.languages.length > 3 && <span className="text-[10px] text-gray-400 font-bold">+{draft.languages.length - 3}</span>}
                              </div>
                              <button 
                                onClick={() => deleteDraft(draft.id)}
                                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                title="Delete Draft"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-8">
                  <div className="flex items-center gap-4 mb-8">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", `bg-${colors.primary}/20`)}>
                      <BarChart2 className={cn("w-6 h-6", `text-${colors.primary}`)} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-white">Usage Dashboard</h2>
                      <p className="text-sm text-gray-400">Track your AI creation journey</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Generated</span>
                      <span className="text-3xl font-black text-white">{usageStats.totalGenerated}</span>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Copied</span>
                      <span className="text-3xl font-black text-white">{usageStats.totalCopied}</span>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Saved</span>
                      <span className="text-3xl font-black text-white">{usageStats.totalSaved}</span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-cyan-500/10 to-violet-500/10 rounded-2xl p-6 border border-white/10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Crown className="w-5 h-5 text-yellow-500" />
                        <span className="text-sm font-bold text-white">Account Status</span>
                      </div>
                      <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest", isPremium ? "bg-yellow-500 text-black" : "bg-white/10 text-gray-400")}>
                        {isPremium ? 'Premium Pro' : 'Free Tier'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-6">
                      {isPremium 
                        ? "You have unlimited access to all AI models, languages, and styles. Thank you for supporting CaptionAI!" 
                        : "Upgrade to Premium to unlock unlimited generations, all 10+ languages, and exclusive font styles."}
                    </p>
                    {!isPremium && (
                      <button 
                        onClick={togglePremium}
                        className="w-full py-3 bg-white text-black rounded-xl font-black uppercase tracking-widest text-xs hover:bg-gray-200 transition-all"
                      >
                        Upgrade Now
                      </button>
                    )}
                  </div>

                  <div className="mt-8 pt-8 border-t border-white/5">
                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Recent History
                    </h3>
                    
                    <div className="space-y-4">
                      {history.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">No recent history found.</p>
                      ) : (
                        history.slice(0, 5).map((item, idx) => (
                          <div key={idx} className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all cursor-pointer" onClick={() => { setResult(item); setActiveTab('results'); }}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">
                                {Object.keys(item.captions).length} Languages
                              </span>
                              <span className="text-[10px] text-gray-500">
                                {new Date().toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 line-clamp-1">
                              {(() => {
                                const cap = Object.values(item.captions)[0]?.[0];
                                return typeof cap === 'string' ? cap : cap?.text;
                              })()}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="mt-8 pt-8 border-t border-white/5">
                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      App Settings
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                        <div>
                          <p className="text-sm font-bold text-white">Auto-detect Language</p>
                          <p className="text-xs text-gray-500">Automatically add detected language to targets</p>
                        </div>
                        <div className="w-12 h-6 bg-cyan-500 rounded-full relative cursor-pointer">
                          <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                        <div>
                          <p className="text-sm font-bold text-white">High Quality Analysis</p>
                          <p className="text-xs text-gray-500">Use advanced vision models for better captions</p>
                        </div>
                        <div className={cn("w-12 h-6 rounded-full relative cursor-pointer transition-colors", isPremium ? "bg-cyan-500" : "bg-gray-700")}>
                          <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all", isPremium ? "right-1" : "left-1")} />
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                        <div>
                          <p className="text-sm font-bold text-white">Export History</p>
                          <p className="text-xs text-gray-500">Download your generation history as CSV</p>
                        </div>
                        <button 
                          onClick={() => {
                            if (history.length === 0) return toast.error("No history to export");
                            const csvContent = "data:text/csv;charset=utf-8," 
                              + "Date,Languages,Captions\n"
                              + history.map(h => {
                                  const date = new Date().toLocaleDateString();
                                  const langs = Object.keys(h.captions).join('|');
                                  const caps = Object.values(h.captions).flat().map(c => {
                                    const text = typeof c === 'string' ? c : c?.text || '';
                                    return text.replace(/"/g, '""');
                                  }).join(' | ');
                                  return `"${date}","${langs}","${caps}"`;
                                }).join("\n");
                            const encodedUri = encodeURI(csvContent);
                            const link = document.createElement("a");
                            link.setAttribute("href", encodedUri);
                            link.setAttribute("download", "caption_history.csv");
                            document.body.appendChild(link);
                            link.click();
                            toast.success("History exported!");
                          }}
                          className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold text-white transition-all"
                        >
                          Export
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                        <div>
                          <p className="text-sm font-bold text-white">Clear All Data</p>
                          <p className="text-xs text-gray-500">Remove all history and saved captions</p>
                        </div>
                        <button 
                          onClick={() => {
                            if (confirm("Are you sure? This will delete all your history and saved captions locally.")) {
                              setHistory([]);
                              setFavorites([]);
                              localStorage.removeItem('caption_history');
                              toast.success("All data cleared!");
                            }
                          }}
                          className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 rounded-xl text-xs font-bold text-red-500 transition-all"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>

      <WhyUs t={t} />

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-6 mt-12 pt-8 border-t border-white/10 text-center text-gray-400 text-sm">
        <p>© 2026 CaptionAI. Powered by O'S</p>
      </footer>
    </div>
    </ErrorBoundary>
  );
}
