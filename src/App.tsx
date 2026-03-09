/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Minus, 
  RotateCcw, 
  History, 
  Trash2, 
  Hash,
  Settings2,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Palette,
  Check,
  Image as ImageIcon,
  X,
  Clock,
  Target,
  Shield,
  Download,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TallySession {
  id: string;
  count: number;
  timestamp: number;
  label: string;
}

interface Theme {
  id: string;
  name: string;
  bg: string;
  card: string;
  accent: string;
  text: string;
  secondaryText: string;
  buttonText: string;
  border: string;
}

const THEMES: Theme[] = [
  {
    id: 'saffron',
    name: 'Saffron',
    bg: 'bg-[#FFF5E6]',
    card: 'bg-white',
    accent: 'bg-[#FF6B00]',
    text: 'text-[#4A2C00]',
    secondaryText: 'text-[#4A2C00]/60',
    buttonText: 'text-white',
    border: 'border-[#FF6B00]/10'
  },
  {
    id: 'dark',
    name: 'Midnight',
    bg: 'bg-[#0A0A0A]',
    card: 'bg-[#151619]',
    accent: 'bg-[#FF6B00]',
    text: 'text-white',
    secondaryText: 'text-white/60',
    buttonText: 'text-white',
    border: 'border-white/10'
  },
  {
    id: 'minimalist',
    name: 'Minimal',
    bg: 'bg-white',
    card: 'bg-[#F5F5F5]',
    accent: 'bg-[#FF6B00]',
    text: 'text-black',
    secondaryText: 'text-black/40',
    buttonText: 'text-white',
    border: 'border-black/5'
  }
];

export default function App() {
  const [count, setCount] = useState(0);
  const [label, setLabel] = useState('Japa Counter');
  const [history, setHistory] = useState<TallySession[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [currentThemeId, setCurrentThemeId] = useState('saffron');
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [goal, setGoal] = useState<number | null>(null);
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [swipePosition, setSwipePosition] = useState<'center' | 'left' | 'right'>('center');
  const [customGoalInput, setCustomGoalInput] = useState('');
  const [buttonRadius, setButtonRadius] = useState<string>('rounded-3xl');
  const [mantra, setMantra] = useState<string>('Om Namah Shivaya');
  const [isEditingMantra, setIsEditingMantra] = useState(false);
  const [showUpdateToast, setShowUpdateToast] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  const theme = THEMES.find(t => t.id === currentThemeId) || THEMES[0];
  const GOALS = [108, 1008, 10000];

  // Load from local storage
  useEffect(() => {
    const savedCount = localStorage.getItem('tally_count');
    const savedHistory = localStorage.getItem('tally_history');
    const savedLabel = localStorage.getItem('tally_label');
    const savedTheme = localStorage.getItem('tally_theme');
    const savedBg = localStorage.getItem('tally_bg');
    const savedGoal = localStorage.getItem('tally_goal');
    const savedSwipe = localStorage.getItem('tally_swipe') as 'center' | 'left' | 'right' | null;
    const savedRadius = localStorage.getItem('tally_radius');
    const savedMantra = localStorage.getItem('tally_mantra');
    
    if (savedCount) setCount(parseInt(savedCount, 10));
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
    if (savedLabel) setLabel(savedLabel);
    if (savedTheme) setCurrentThemeId(savedTheme);
    if (savedBg) setBgImage(savedBg);
    if (savedGoal) {
      const g = parseInt(savedGoal, 10);
      setGoal(g);
      setCustomGoalInput(g.toString());
    }
    if (savedSwipe) setSwipePosition(savedSwipe);
    if (savedRadius) setButtonRadius(savedRadius);
    if (savedMantra) setMantra(savedMantra);
  }, []);

  // Service Worker Registration & Update Detection
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setWaitingWorker(newWorker);
                setShowUpdateToast(true);
              }
            });
          }
        });
      });

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          window.location.reload();
          refreshing = true;
        }
      });
    }
  }, []);

  const onUpdateApp = () => {
    waitingWorker?.postMessage({ type: 'SKIP_WAITING' });
    setShowUpdateToast(false);
  };

  // Save to local storage
  const saveToLocalStorage = useCallback(() => {
    localStorage.setItem('tally_count', count.toString());
    localStorage.setItem('tally_history', JSON.stringify(history));
    localStorage.setItem('tally_label', label);
    localStorage.setItem('tally_theme', currentThemeId);
    localStorage.setItem('tally_swipe', swipePosition);
    localStorage.setItem('tally_radius', buttonRadius);
    localStorage.setItem('tally_mantra', mantra);
    if (bgImage) {
      localStorage.setItem('tally_bg', bgImage);
    } else {
      localStorage.removeItem('tally_bg');
    }
    if (goal) {
      localStorage.setItem('tally_goal', goal.toString());
    } else {
      localStorage.removeItem('tally_goal');
    }
    setLastSaved(Date.now());
  }, [count, history, label, currentThemeId, bgImage, goal, swipePosition, buttonRadius, mantra]);

  useEffect(() => {
    saveToLocalStorage();
  }, [saveToLocalStorage]);

  // Extra safety: save on app close or backgrounding
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveToLocalStorage();
      }
    };

    const handleBeforeUnload = () => {
      saveToLocalStorage();
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [saveToLocalStorage]);

  // Periodic auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(saveToLocalStorage, 30000);
    return () => clearInterval(interval);
  }, [saveToLocalStorage]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBgImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const increment = useCallback(() => {
    setCount(prev => {
      if (goal && prev >= goal) return prev;
      
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(10);
      }
      
      const next = prev + 1;
      
      // Milestone vibration every 100
      if (next % 100 === 0 && next !== goal) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([50, 30, 50]);
        }
      }

      if (goal && next === goal) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([100, 50, 100, 50, 100]);
        }
      }
      return next;
    });
  }, [goal]);

  const decrement = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
    setCount(prev => Math.max(0, prev - 1));
  }, []);

  const reset = useCallback(() => {
    if (count > 0) {
      const newSession: TallySession = {
        id: Math.random().toString(36).substr(2, 9),
        count,
        timestamp: Date.now(),
        label
      };
      setHistory(prev => [newSession, ...prev].slice(0, 50));
    }
    setCount(0);
  }, [count, label]);

  const deleteHistoryItem = useCallback((id: string) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(5);
    }
    setHistory(prev => prev.filter(item => item.id !== id));
  }, []);

  const clearHistory = () => {
    if (window.confirm('Clear all history?')) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([10, 50, 10]);
      }
      setHistory([]);
    }
  };

  const formatTimeGap = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  };

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.text} font-sans transition-colors duration-500 selection:bg-opacity-30 selection:bg-current relative overflow-hidden`}>
      {/* Persistent OM Background */}
      <div className="fixed inset-0 z-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <motion.div
          key={`om-bg-${count}`}
          initial={{ scale: 0.95, opacity: 0.05 }}
          animate={{ scale: 1, opacity: 0.07 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="flex flex-col items-center justify-center"
        >
          <h1 className={`text-[40vh] font-serif italic ${theme.id === 'dark' ? 'text-white' : 'text-[#FF6B00]'}`}>ॐ</h1>
        </motion.div>
      </div>

      {/* Background Image */}
      <AnimatePresence>
        {bgImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-0"
          >
            <img 
              src={bgImage} 
              alt="Background" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className={`absolute inset-0 ${theme.id === 'dark' ? 'bg-black/60' : 'bg-white/40'} backdrop-blur-[2px]`} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Update Toast */}
      <AnimatePresence>
        {showUpdateToast && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm"
          >
            <div className={`${theme.id === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-100'} border shadow-2xl rounded-2xl p-4 flex items-center gap-4`}>
              <div className={`w-12 h-12 rounded-xl ${theme.accent} ${theme.buttonText} flex items-center justify-center shrink-0`}>
                <Sparkles size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold">New Features Ready!</p>
                <p className="text-xs opacity-50 truncate">Update to get the latest version.</p>
              </div>
              <button
                onClick={onUpdateApp}
                className={`px-4 py-2 rounded-xl text-xs font-bold ${theme.accent} ${theme.buttonText} hover:opacity-90 transition-opacity flex items-center gap-2`}
              >
                <RefreshCw size={14} />
                Update
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 h-16 flex items-center justify-between px-6 ${theme.id === 'midnight' ? 'bg-black/80' : 'bg-white/80'} backdrop-blur-md border-b ${theme.border} z-50`}>
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 ${theme.accent} rounded-lg flex items-center justify-center ${theme.buttonText}`}>
            <Hash size={18} />
          </div>
          <span className="font-semibold tracking-tight">Japa Master</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowThemes(!showThemes)}
            className={`p-2 hover:bg-current/5 rounded-full transition-colors`}
            title="Themes"
          >
            <Palette size={20} />
          </button>
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 hover:bg-current/5 rounded-full transition-colors relative"
            title="History"
          >
            <History size={20} />
            {history.length > 0 && (
              <span className={`absolute top-1 right-1 w-2 h-2 ${theme.accent.replace('bg-', 'bg-')} rounded-full`} />
            )}
          </button>
        </div>
      </header>

      <main className="pt-16 min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          
          {/* Label Section */}
          <div className="text-center space-y-4">
            <div className="flex flex-col items-center gap-1">
              {isEditingMantra ? (
                <input
                  autoFocus
                  type="text"
                  value={mantra}
                  onChange={(e) => setMantra(e.target.value)}
                  onBlur={() => setIsEditingMantra(false)}
                  onKeyDown={(e) => e.key === 'Enter' && setIsEditingMantra(false)}
                  className={`text-2xl font-serif italic text-center bg-transparent border-b-2 ${theme.accent.replace('bg-', 'border-')} outline-none w-full max-w-[300px] mb-2`}
                />
              ) : (
                <button 
                  onClick={() => setIsEditingMantra(true)}
                  className={`group flex items-center gap-2 mx-auto text-2xl font-serif italic ${theme.text} hover:opacity-80 transition-all`}
                >
                  "{mantra}"
                  <Settings2 size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}

              {isEditingLabel ? (
                <input
                  autoFocus
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  onBlur={() => setIsEditingLabel(false)}
                  onKeyDown={(e) => e.key === 'Enter' && setIsEditingLabel(false)}
                  className={`text-sm font-bold uppercase tracking-[0.2em] text-center bg-transparent border-b ${theme.accent.replace('bg-', 'border-')} outline-none w-full max-w-[150px] opacity-60`}
                />
              ) : (
                <button 
                  onClick={() => setIsEditingLabel(true)}
                  className={`group flex items-center gap-2 mx-auto text-[10px] font-bold uppercase tracking-[0.2em] ${theme.secondaryText} hover:${theme.text} transition-colors opacity-60`}
                >
                  {label}
                  <Settings2 size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
            </div>

            {/* Goal Presets */}
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest opacity-40">
                <Target size={12} />
                <span>Daily Goal</span>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => {
                    setGoal(null);
                    setCustomGoalInput('');
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    goal === null 
                      ? `${theme.accent} ${theme.buttonText}` 
                      : `bg-current/5 ${theme.secondaryText} hover:bg-current/10`
                  }`}
                >
                  None
                </button>
                {GOALS.map(g => (
                  <button
                    key={g}
                    onClick={() => {
                      setGoal(g);
                      setCustomGoalInput(g.toString());
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      goal === g 
                        ? `${theme.accent} ${theme.buttonText}` 
                        : `bg-current/5 ${theme.secondaryText} hover:bg-current/10`
                    }`}
                  >
                    {g}
                  </button>
                ))}
                
                {/* Custom Goal Input */}
                <div className="relative flex items-center">
                  <input
                    type="number"
                    placeholder="Custom"
                    value={customGoalInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomGoalInput(val);
                      const parsed = parseInt(val, 10);
                      if (!isNaN(parsed) && parsed > 0) {
                        setGoal(parsed);
                      } else if (val === '') {
                        setGoal(null);
                      }
                    }}
                    className={`w-24 px-3 py-1 rounded-full text-xs font-semibold transition-all placeholder:text-current/30 border-2 ${
                      goal !== null && !GOALS.includes(goal) 
                        ? `${theme.accent} ${theme.buttonText} border-transparent` 
                        : `bg-current/5 ${theme.secondaryText} border-transparent hover:bg-current/10 focus:bg-current/10`
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Main Counter Display */}
          <div className={`flex-1 flex items-center w-full px-6 ${
            swipePosition === 'left' ? 'justify-start' : swipePosition === 'right' ? 'justify-end' : 'justify-center'
          }`}>
            <motion.div 
              onPanEnd={(_e, info) => {
                if (info.offset.y < -30) {
                  increment();
                } else if (info.offset.y > 30) {
                  decrement();
                }
              }}
              whileTap={{ scale: goal !== null && count >= goal ? 1 : 0.98 }}
              whileHover={{ scale: goal !== null && count >= goal ? 1 : 1.01 }}
              className={`relative aspect-square w-full max-w-[min(80vw,400px)] flex flex-col items-center justify-center overflow-hidden transition-all duration-500 touch-none select-none ${goal !== null && count >= goal ? 'cursor-default' : 'cursor-ns-resize'}`}
            >
            {/* Swipe Hint */}
            {!(goal !== null && count >= goal) && (
              <div className="absolute top-8 flex flex-col items-center gap-1 opacity-20 pointer-events-none">
                <ChevronUp size={16} className="animate-bounce" />
                <span className="text-[10px] font-semibold uppercase tracking-widest">Swipe to Count</span>
                <ChevronDown size={16} className="animate-bounce" />
              </div>
            )}

            {/* Progress Ring */}
            {goal && (
              <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                <circle
                  cx="50%"
                  cy="50%"
                  r="48%"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  className="opacity-5"
                />
                <motion.circle
                  cx="50%"
                  cy="50%"
                  r="48%"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  pathLength="100"
                  strokeDasharray="100"
                  initial={{ strokeDashoffset: 100 }}
                  animate={{ strokeDashoffset: 100 - Math.min(100, (count / goal) * 100) }}
                  className={theme.accent.replace('bg-', 'text-')}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              </svg>
            )}
            
            <AnimatePresence mode="popLayout">
              <motion.div
                key={count}
                initial={{ scale: 0.8, opacity: 0, filter: "blur(8px)" }}
                animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
                exit={{ scale: 1.1, opacity: 0, filter: "blur(8px)" }}
                transition={{ 
                  duration: 0.5, 
                  ease: [0.23, 1, 0.32, 1] // Meditative easing
                }}
                className="text-[120px] font-bold tracking-tighter tabular-nums leading-none drop-shadow-[0_0_15px_rgba(255,107,0,0.2)] pointer-events-none"
              >
                {count}
              </motion.div>
            </AnimatePresence>

            {goal && count >= goal && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`absolute mt-32 text-[10px] font-bold uppercase tracking-[0.3em] ${theme.accent.replace('bg-', 'text-')} drop-shadow-sm pointer-events-none`}
              >
                Goal Reached
              </motion.div>
            )}
            
            <div className="absolute bottom-8 flex gap-4">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  reset();
                }}
                className={`p-4 hover:bg-current/5 rounded-2xl transition-all active:scale-95 z-20`}
                title="Reset & Save to History"
              >
                <RotateCcw size={24} />
              </button>
            </div>
          </motion.div>
          </div>

          {/* Controls */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={decrement}
              className={`h-24 bg-current/5 backdrop-blur-xl border ${theme.border} ${buttonRadius} flex items-center justify-center hover:bg-current/10 transition-all active:scale-95 shadow-sm relative overflow-hidden`}
            >
              <div className="absolute inset-x-0 top-0 h-px bg-white/20" />
              <Minus size={32} />
            </button>
            <button
              onClick={increment}
              disabled={goal !== null && count >= goal}
              className={`h-24 ${theme.accent} ${theme.buttonText} ${buttonRadius} flex items-center justify-center transition-all shadow-lg shadow-current/20 relative overflow-hidden backdrop-blur-xl border border-white/20 ${
                goal !== null && count >= goal 
                  ? 'opacity-30 grayscale cursor-not-allowed' 
                  : 'hover:opacity-90 active:scale-95'
              }`}
            >
              <div className="absolute inset-x-0 top-0 h-px bg-white/40" />
              <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none" />
              <Plus size={32} className="relative z-10" />
            </button>
          </div>
        </div>
      </main>

      {/* Themes Sidebar */}
      <AnimatePresence>
        {showThemes && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowThemes(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className={`fixed top-0 right-0 bottom-0 w-full max-w-sm ${theme.id === 'dark' ? 'bg-[#151619]' : 'bg-white'} shadow-2xl z-[70] flex flex-col`}
            >
              <div className={`p-6 border-b ${theme.border} flex items-center justify-between`}>
                <h2 className="text-xl font-semibold">Themes</h2>
                <button 
                  onClick={() => setShowThemes(false)}
                  className="p-2 hover:bg-current/5 rounded-lg transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Custom Background Upload */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider opacity-50 px-1">Custom Background</p>
                  <div className="flex gap-2">
                    <label className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed ${theme.border} hover:bg-current/5 cursor-pointer transition-all`}>
                      <ImageIcon size={20} />
                      <span className="font-medium">Upload Photo</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleImageUpload}
                      />
                    </label>
                    {bgImage && (
                      <button 
                        onClick={() => setBgImage(null)}
                        className="p-4 rounded-2xl bg-red-50 text-red-500 hover:bg-red-100 transition-all"
                        title="Remove background"
                      >
                        <X size={20} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <p className="text-xs font-semibold uppercase tracking-wider opacity-50 px-1">Swipe Controls Position</p>
                  <div className="flex gap-2">
                    {(['left', 'center', 'right'] as const).map((pos) => (
                      <button
                        key={pos}
                        onClick={() => setSwipePosition(pos)}
                        className={`flex-1 p-3 rounded-2xl border-2 transition-all text-xs font-bold uppercase tracking-widest ${
                          swipePosition === pos 
                            ? theme.accent.replace('bg-', 'border-') + ' ' + theme.accent.replace('bg-', 'text-')
                            : 'border-transparent bg-current/5 opacity-50'
                        }`}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <p className="text-xs font-semibold uppercase tracking-wider opacity-50 px-1">Button Shape</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'rounded-none', label: 'Sharp' },
                      { id: 'rounded-xl', label: 'Rounded' },
                      { id: 'rounded-3xl', label: 'Squircle' },
                      { id: 'rounded-full', label: 'Pill' },
                    ].map((style) => (
                      <button
                        key={style.id}
                        onClick={() => setButtonRadius(style.id)}
                        className={`p-3 rounded-xl border-2 transition-all text-xs font-bold uppercase tracking-widest ${
                          buttonRadius === style.id 
                            ? theme.accent.replace('bg-', 'border-') + ' ' + theme.accent.replace('bg-', 'text-')
                            : 'border-transparent bg-current/5 opacity-50'
                        }`}
                      >
                        {style.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <p className="text-xs font-semibold uppercase tracking-wider opacity-50 px-1">Presets</p>
                  {THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setCurrentThemeId(t.id)}
                    className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${
                      currentThemeId === t.id 
                        ? t.accent.replace('bg-', 'border-') 
                        : 'border-transparent bg-current/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full ${t.bg} border ${t.border}`} />
                      <div className={`w-8 h-8 rounded-full ${t.accent}`} />
                      <span className="font-medium">{t.name}</span>
                    </div>
                    {currentThemeId === t.id && <Check size={20} className={t.accent.replace('bg-', 'text-')} />}
                  </button>
                ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* History Sidebar */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className={`fixed top-0 right-0 bottom-0 w-full max-w-sm ${theme.id === 'dark' ? 'bg-[#151619]' : 'bg-white'} shadow-2xl z-[70] flex flex-col`}
            >
              <div className={`p-6 border-b ${theme.border} flex items-center justify-between`}>
                <div>
                  <h2 className="text-xl font-semibold">History</h2>
                  {lastSaved && (
                    <p className="text-[10px] opacity-30 mt-0.5">Auto-saved at {new Date(lastSaved).toLocaleTimeString()}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={clearHistory}
                    className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                    title="Clear History"
                  >
                    <Trash2 size={20} />
                  </button>
                  <button 
                    onClick={() => setShowHistory(false)}
                    className="p-2 hover:bg-current/5 rounded-lg transition-colors"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-0">
                {history.length === 0 ? (
                  <div className={`h-full flex flex-col items-center justify-center ${theme.secondaryText} space-y-2`}>
                    <History size={48} strokeWidth={1} />
                    <p>No history yet</p>
                  </div>
                ) : (
                  history.map((session, index) => {
                    const nextSession = history[index + 1];
                    const timeGap = nextSession ? session.timestamp - nextSession.timestamp : null;

                    return (
                      <React.Fragment key={session.id}>
                        <div 
                          className={`p-4 ${theme.id === 'dark' ? 'bg-white/5' : 'bg-[#F5F5F0]'} rounded-2xl flex items-center justify-between group relative z-10`}
                        >
                          <div>
                            <p className={`font-medium text-sm ${theme.secondaryText} uppercase tracking-wider`}>
                              {session.label}
                            </p>
                            <p className="text-2xl font-bold tabular-nums">{session.count}</p>
                            <p className={`text-xs ${theme.secondaryText}`}>
                              {new Date(session.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteHistoryItem(session.id);
                            }}
                            className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-all"
                            title="Delete entry"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        
                        {timeGap !== null && (
                          <div className="relative h-12 flex items-center ml-8">
                            <div className={`absolute left-0 top-0 bottom-0 w-px ${theme.border} border-dashed`} />
                            <div className={`flex items-center gap-1.5 text-[10px] font-medium ${theme.secondaryText} bg-current/5 px-2 py-0.5 rounded-full ml-4`}>
                              <Clock size={10} />
                              <span>Gap: {formatTimeGap(timeGap)}</span>
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </div>

              <div className={`p-6 border-t ${theme.border} bg-current/5 space-y-3`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${theme.accent} ${theme.buttonText}`}>
                    <Shield size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider">Privacy First</p>
                    <p className="text-[10px] opacity-50">All data stays on your device. No cloud sync, no tracking.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-current/10 ${theme.text}`}>
                    <Download size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider">Installable App</p>
                    <p className="text-[10px] opacity-50">Add to Home Screen to use offline like a real app.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
