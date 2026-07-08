import React, { useState, useEffect, useCallback } from 'react';
import { Camera, Send, Home, User, MessageCircle, BookOpen, AlertCircle, Settings, BarChart3, Heart, Moon, Sun, Loader2, RefreshCw, Trash2, Leaf } from 'lucide-react';
import { sendChatMessage } from '../api/chat';
import AuthScreen from './screens/AuthScreen';
import { useAppContext } from '../context/AppContext';
import {
  fetchJournalEntries,
  saveJournalEntry,
  deleteJournalEntry,
  getEmotionConfig,
  formatConfidence,
  type JournalEntryResponse,
} from '../api/journal';

// Redesigned theme constants matching the landing page design language
const bgClass = "bg-theme-bg text-theme-text-primary transition-colors duration-300";
const cardClass = "app-card transition-all duration-300";
const primaryBtnClass = "app-btn-pill-primary py-3 px-6 text-sm font-bold disabled:opacity-50 disabled:pointer-events-none";
const successBtnClass = "app-btn-pill-primary py-3 px-6 text-sm font-bold disabled:opacity-50 disabled:pointer-events-none";
const secondaryBtnClass = "app-btn-pill-secondary py-3 px-6 text-sm font-semibold transition-all duration-200";
const headingClass = "text-3xl font-extrabold text-theme-blue dark:text-white tracking-tight leading-tight";
const bodyTextClass = "text-theme-text-secondary leading-relaxed";
const inputClass = "w-full p-4 rounded-2xl border border-theme-border focus:ring-2 focus:ring-theme-blue focus:border-transparent transition-all duration-200 bg-theme-surface text-theme-text-primary placeholder-gray-400";

const MindMitraApp = () => {
  const [currentScreen, setCurrentScreen] = useState('splash');
  const { darkMode, setDarkMode } = useAppContext();
  const [currentMood, setCurrentMood] = useState(3);
  const [journalText, setJournalText] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { type: 'bot', message: "Hi! I'm here to support you. How are you feeling today?" }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [userName] = useState('Alex');
  const [isRecording, setIsRecording] = useState(false);
  const [, setIsAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [journalEntries, setJournalEntries] = useState<JournalEntryResponse[]>([]);
  const [journalSaving, setJournalSaving] = useState(false);
  const [journalSaveSuccess, setJournalSaveSuccess] = useState(false);
  const [journalError, setJournalError] = useState<string | null>(null);
  const [journalLoading, setJournalLoading] = useState(false);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };


  useEffect(() => {
    if (currentScreen === 'splash') {
      const timer = setTimeout(() => setCurrentScreen('login'), 3000);
      return () => clearTimeout(timer);
    }
  }, [currentScreen]);

  const addChatMessage = async (message: string, type = 'user') => {
    setChatMessages(prev => [...prev, { type, message }]);
    if (type === 'user' && authToken) {
      try {
        setLoading(true);
        const response = await sendChatMessage(message, authToken);
        setChatMessages(prev => [...prev, {
          type: 'bot',
          message: response.data.response || "I'm here to help you. Can you tell me more about how you're feeling?"
        }]);
      } catch (error) {
        console.error('Chat error:', error);
        // Fallback to mock responses
        const responses = [
          "I understand how you're feeling. Can you tell me more about what's troubling you?",
          "That sounds challenging. Let's work through this together. What thoughts are going through your mind?",
          "Thank you for sharing. Have you noticed any patterns in when these feelings occur?",
          "I'm here to support you. What coping strategies have helped you in the past?"
        ];
        setChatMessages(prev => [...prev, {
          type: 'bot',
          message: responses[Math.floor(Math.random() * responses.length)]
        }]);
      } finally {
        setLoading(false);
      }
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleLogin = async (_email: string, _password: string) => {
    try {
      setLoading(true);
      // Mock login for now - integrate with your auth API
      setAuthToken('mock-token');
      setIsAuthenticated(true);
      setCurrentScreen('home');
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadJournalEntries = useCallback(async () => {
    if (!authToken) return;
    setJournalLoading(true);
    try {
      const res = await fetchJournalEntries(authToken);
      setJournalEntries(res.data);
    } catch (err) {
      console.error('Failed to fetch journal entries:', err);
    } finally {
      setJournalLoading(false);
    }
  }, [authToken]);

  const handleJournalSave = async () => {
    if (!journalText.trim() || !authToken) return;

    setJournalSaving(true);
    setJournalError(null);
    setJournalSaveSuccess(false);

    try {
      const res = await saveJournalEntry({ mood: currentMood, text: journalText }, authToken);
      setJournalEntries(prev => [res.data, ...prev]);
      setJournalText('');
      setCurrentMood(3);
      setJournalSaveSuccess(true);
      setTimeout(() => setJournalSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Journal save error:', error);
      const err = error as { response?: { data?: { detail?: string } } };
      setJournalError(err?.response?.data?.detail || 'Failed to save entry');
    } finally {
      setJournalSaving(false);
    }
  };

  const handleJournalDelete = async (entryId: string) => {
    if (!authToken) return;
    try {
      await deleteJournalEntry(entryId, authToken);
      setJournalEntries(prev => prev.filter(e => e.id !== entryId));
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleEmotionAnalysis = async () => {
    if (!authToken) return;

    try {
      setLoading(true);
      setIsRecording(true);
      // Mock emotion analysis - integrate with your emotion API
      setTimeout(() => {
        setIsRecording(false);
        setLoading(false);
      }, 3000);
    } catch (error) {
      console.error('Emotion analysis error:', error);
      setIsRecording(false);
      setLoading(false);
    }
  };

  const SplashScreen = () => (
    <div className={`min-h-screen flex items-center justify-center ${bgClass}`}>
      <div className="text-center">
        <div className="mb-8 relative">
          <div className="text-6xl mb-4 animate-pulse">🌊</div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">MindMitra</h1>
          <p className="text-slate-600 dark:text-slate-300 text-lg font-medium">"Your companion for emotional wellness"</p>
        </div>
        <div className="flex space-x-2 justify-center mb-6">
          <div className="w-3 h-3 bg-sky-600 rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-sky-400 rounded-full animate-bounce delay-100"></div>
          <div className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce delay-200"></div>
        </div>
      </div>
    </div>
  );

  const LoginScreen = () => (
    <AuthScreen
      onSignIn={handleLogin}
      onRegister={(email, password) => handleLogin(email, password)}
      loading={loading}
    />
  );

  const HomeScreen = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return (
      <div className={`w-full min-h-screen pb-28 lg:pb-8 ${bgClass}`}>
        <div className="p-6 lg:p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-theme-surface border border-theme-border rounded-full shadow-sm text-[10px] font-extrabold uppercase tracking-wider text-theme-orange mb-3">
                ✨ Wellness Dashboard
              </span>
              <h1 className={headingClass}>
                Hi, {userName} 👋
              </h1>
              <p className={`${bodyTextClass} mt-1.5 text-base font-medium`}>
                😊 You seem calm today
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8">
            <button
              onClick={() => setCurrentScreen('journal')}
              className="app-card bg-theme-card-blue border-none p-6 md:p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group"
            >
              <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 shadow-sm text-theme-blue group-hover:scale-115 transition-all duration-300">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                Journal
              </h3>
              <p className="text-xs text-theme-text-secondary hidden sm:block">
                Write down your feelings
              </p>
            </button>
            <button
              onClick={() => setCurrentScreen('chat')}
              className="app-card bg-theme-card-orange border-none p-6 md:p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group"
            >
              <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 shadow-sm text-theme-orange group-hover:scale-115 transition-all duration-300">
                <MessageCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                AI Chatbot
              </h3>
              <p className="text-xs text-theme-text-secondary hidden sm:block">
                Warm, guided support
              </p>
            </button>
          </div>

          <div className={`${cardClass} p-6 md:p-8 mb-6`}>
            <h3 className="text-xl font-bold text-theme-blue dark:text-white mb-6">Mood Trend</h3>
            <div className="h-36 flex items-end space-x-3 md:space-x-4 px-2">
              {[4, 3, 5, 2, 4, 5, 3].map((height, i) => (
                <div key={i} className="flex-1 flex flex-col items-center h-full justify-end">
                  <div
                    className="bg-gradient-to-t from-theme-blue to-theme-orange rounded-t-full w-full max-w-[24px] shadow-sm hover:opacity-90 transition-opacity"
                    style={{ height: `${height * 20}%` }}
                  />
                  <span className="text-xs text-theme-text-secondary mt-3 font-semibold">{days[i]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={() => setCurrentScreen('sos')}
            className="bg-red-500 hover:bg-red-650 text-white w-16 h-16 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 animate-pulse"
          >
            <AlertCircle className="w-8 h-8" />
          </button>
        </div>

        <BottomNav />
      </div>
    );
  };

  const EmotionDetectionScreen = () => (
    <div className={`w-full min-h-screen pb-28 lg:pb-8 p-6 ${bgClass}`}>
      <div className="max-w-md mx-auto lg:max-w-none lg:mx-0 w-full">
        <h2 className={headingClass + " mb-6 text-center lg:text-left"}>
          Emotion Detection
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Column 1: Detector Card */}
          <div className={`${cardClass} p-6`}>
            <div className="aspect-square bg-sky-100/50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-center mb-6 relative overflow-hidden">
              {isRecording ? (
                <div className="absolute inset-0 bg-sky-500 opacity-20 animate-pulse" />
              ) : null}
              <Camera className="w-16 h-16 text-sky-400 dark:text-slate-500" />
            </div>

            <button
              onClick={handleEmotionAnalysis}
              disabled={loading}
              className={`w-full py-3.5 rounded-xl font-medium transition-all duration-200 active:scale-[0.98] ${isRecording
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-md'
                  : primaryBtnClass
                }`}
            >
              {loading ? 'Analyzing...' : isRecording ? 'Stop Analysis' : 'Start Analysis'}
            </button>
          </div>

          {/* Column 2: Results Card */}
          {isRecording ? (
            <div className={`${cardClass} p-6 text-center flex flex-col justify-center items-center`}>
              <div className="animate-bounce mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-sky-400 to-sky-600 rounded-full mx-auto flex items-center justify-center shadow-md">
                  <Heart className="w-8 h-8 text-white animate-pulse" />
                </div>
              </div>
              <p className="text-lg font-bold mb-6">
                Detected Emotion: Anxious 😟
              </p>
              <div className="flex space-x-3 w-full">
                <button
                  onClick={() => setIsRecording(false)}
                  className={secondaryBtnClass + " flex-1"}
                >
                  Try Again
                </button>
                <button className={successBtnClass + " flex-1"}>
                  Save Result
                </button>
              </div>
            </div>
          ) : (
            <div className={`${cardClass} p-6 flex items-center justify-center text-center`}>
              <p className={bodyTextClass}>Start emotion detection to view analyzed wellness results here.</p>
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );

  const JournalScreen = () => {
    // Load entries when journal screen mounts
    useEffect(() => {
      if (journalEntries.length === 0) loadJournalEntries();
    }, []);

    const moodEmoji = (mood: number) => {
      const map: Record<number, string> = { 1: '😢', 2: '😕', 3: '😐', 4: '🙂', 5: '😊' };
      return map[mood] ?? '😐';
    };

    const formatDate = (dateStr: string): string => {
      try {
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } catch { return ''; }
    };

    return (
      <div className={`w-full min-h-screen pb-28 lg:pb-8 p-6 ${bgClass}`}>
        <div className="max-w-md mx-auto lg:max-w-none lg:mx-0 w-full">
          <div className="text-center lg:text-left mb-8">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-theme-surface border border-theme-border rounded-full shadow-sm text-[10px] font-extrabold uppercase tracking-wider text-theme-orange mb-3">
              📝 Private Thoughts
            </span>
            <h2 className={headingClass}>
              How are you feeling?
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Column 1: Compose Card */}
            <div className={`${cardClass} p-6 md:p-8`}>
              <h3 className="text-lg font-bold mb-4 text-theme-blue dark:text-white">Compose Entry</h3>
              
              <div className="flex justify-center items-center space-x-4 mb-6">
                <span className="text-2xl">😢</span>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={currentMood}
                  onChange={(e) => setCurrentMood(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-theme-border rounded-lg appearance-none cursor-pointer accent-theme-orange"
                  id="mood-slider-main"
                />
                <span className="text-2xl">😊</span>
              </div>

              <div className="text-center mb-6">
                <span className="text-5xl transition-all duration-200 inline-block hover:scale-110">{moodEmoji(currentMood)}</span>
              </div>

              <textarea
                value={journalText}
                onChange={(e) => setJournalText(e.target.value)}
                placeholder="Write about your mood, experiences, or reflections..."
                id="journal-text-main"
                className={inputClass + " h-36 resize-none"}
              />

              {/* Error */}
              {journalError && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 text-sm rounded-xl border border-red-100/30 dark:border-red-900/30">{journalError}</div>
              )}

              {/* Success with emotion badge */}
              {journalSaveSuccess && journalEntries[0]?.emotion_analyzed && (
                <div className={`mt-4 p-3 rounded-2xl flex items-center gap-2 ${darkMode ? 'bg-emerald-950/30 text-emerald-300' : 'bg-emerald-50 text-emerald-700'
                  }`}>
                  <span className="text-sm font-semibold">✨ Saved! Detected:</span>
                  {(() => {
                    const e = journalEntries[0];
                    const cfg = getEmotionConfig(e.emotion_label);
                    const bg = darkMode ? cfg.bgDark : cfg.bg;
                    const text = darkMode ? cfg.textDark : cfg.text;
                    return (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${bg} ${text}`}>
                        <span className="text-sm">{cfg.emoji}</span>
                        <span className="capitalize">{e.emotion_label}</span>
                        <span className="opacity-70">· {formatConfidence(e.emotion_confidence)}</span>
                      </span>
                    );
                  })()}
                </div>
              )}

              <button
                onClick={handleJournalSave}
                disabled={journalSaving || !journalText.trim()}
                id="journal-save-main"
                className={`w-full mt-6 ${successBtnClass}`}
              >
                {journalSaving ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Analyzing emotion...</>
                ) : (
                  'Save Entry'
                )}
              </button>
            </div>

            {/* Column 2: Recent Entries */}
            <div className={`${cardClass} p-6 md:p-8 flex flex-col`}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-theme-blue dark:text-white">Recent Entries</h3>
                <button
                  onClick={loadJournalEntries}
                  disabled={journalLoading}
                  className={`p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-orange-50 text-theme-orange'}`}
                  title="Refresh entries"
                >
                  <RefreshCw className={`w-4 h-4 ${journalLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Loading */}
              {journalLoading && journalEntries.length === 0 && (
                <div className="space-y-4">
                  {[0, 1, 2].map(i => (
                    <div key={i} className={`p-4 rounded-2xl animate-pulse ${darkMode ? 'bg-slate-800' : 'bg-orange-50/50'}`}>
                      <div className={`h-4 w-24 rounded ${darkMode ? 'bg-slate-700' : 'bg-orange-100/50'}`} />
                      <div className={`h-3 w-full rounded mt-2 ${darkMode ? 'bg-slate-700' : 'bg-orange-100/50'}`} />
                    </div>
                  ))}
                </div>
              )}

              {/* Empty */}
              {!journalLoading && journalEntries.length === 0 && (
                <div className="text-center py-12 flex-1 flex flex-col justify-center items-center">
                  <span className="text-4xl block mb-3">📝</span>
                  <p className={bodyTextClass + " text-sm font-medium"}>No entries yet. Start journaling on the left!</p>
                </div>
              )}

              {/* Entries list */}
              {journalEntries.length > 0 && (
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                  {journalEntries.slice(0, 20).map(entry => {
                    const cfg = getEmotionConfig(entry.emotion_label);
                    const badgeBg = darkMode ? cfg.bgDark : cfg.bg;
                    const badgeText = darkMode ? cfg.textDark : cfg.text;
                    return (
                      <div
                        key={entry.id}
                        className={`p-4 rounded-2xl transition-all duration-200 group border border-theme-border/50 ${darkMode ? 'bg-slate-800/40 hover:bg-slate-800/70' : 'bg-orange-50/30 hover:bg-orange-50/60'
                          }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl" title={`Mood: ${entry.mood}/5`}>{moodEmoji(entry.mood)}</span>
                            <span className="text-xs font-semibold text-theme-text-secondary">
                              {formatDate(entry.created_at || entry.date)}
                            </span>
                          </div>
                          {entry.emotion_analyzed ? (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${badgeBg} ${badgeText}`}>
                              <span className="text-sm">{cfg.emoji}</span>
                              <span className="capitalize">{entry.emotion_label}</span>
                              <span className="opacity-70">· {formatConfidence(entry.emotion_confidence)}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-theme-border text-theme-text-secondary">—</span>
                          )}
                        </div>
                        <p className="text-sm leading-relaxed text-theme-text-secondary line-clamp-2">{entry.text}</p>
                        <div className="flex justify-end mt-2">
                          <button
                            onClick={() => handleJournalDelete(entry.id)}
                            className={`p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all ${darkMode ? 'hover:bg-red-950/40 text-red-400' : 'hover:bg-red-50 text-red-500'}`}
                            title="Delete entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  };

  const ChatScreen = () => (
    <div className={`w-full min-h-screen flex flex-col ${bgClass}`}>
      <div className="flex-1 p-6 pb-36 max-w-2xl mx-auto lg:max-w-none lg:mx-0 w-full">
        <h2 className={headingClass + " mb-6 text-center lg:text-left"}>
          AI Therapist
        </h2>

        <div className="space-y-4 mb-6">
          {chatMessages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-md px-4 py-2.5 rounded-2xl shadow-sm text-sm ${msg.type === 'user'
                    ? 'bg-sky-600 text-white rounded-tr-none'
                    : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-tl-none border border-sky-100/30 dark:border-slate-800/50'
                  }`}
              >
                <p className="text-sm">{msg.message}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="max-w-xs px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 rounded-tl-none border border-sky-100/30 dark:border-slate-800/50 shadow-sm">
                <div className="flex space-x-1.5 py-1">
                  <div className="w-2 h-2 bg-sky-550 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-sky-550 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-sky-550 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-20 lg:bottom-4 left-0 lg:left-auto right-0 lg:right-4 p-4 lg:w-[calc(100%-17rem)] z-40 bg-gradient-to-t from-sky-50 dark:from-slate-950 via-sky-50/90 dark:via-slate-950/90 to-transparent">
        <div className="flex space-x-3 max-w-xl mx-auto lg:max-w-none lg:mx-0 w-full bg-white dark:bg-slate-900 p-2 rounded-full shadow-lg border border-sky-100/50 dark:border-slate-800">
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 bg-transparent border-0 outline-none focus:ring-0 text-slate-900 dark:text-white placeholder-slate-400"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && newMessage.trim() && !loading) {
                addChatMessage(newMessage);
                setNewMessage('');
              }
            }}
          />
          <button
            onClick={() => {
              if (newMessage.trim() && !loading) {
                addChatMessage(newMessage);
                setNewMessage('');
              }
            }}
            disabled={loading || !newMessage.trim()}
            className="bg-sky-600 hover:bg-sky-700 text-white p-3 rounded-full transition-colors duration-200 disabled:opacity-50 flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );

  const SOSScreen = () => (
    <div className="w-full min-h-screen bg-red-50/80 dark:bg-red-950/20 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6 animate-pulse">🚨</div>
        <h2 className="text-3xl font-bold text-red-650 dark:text-red-400 mb-8">EMERGENCY SOS</h2>

        <button
          className="w-44 h-44 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-2xl flex items-center justify-center font-bold text-xl mb-10 mx-auto transition-all duration-300 hover:scale-105 active:scale-95 animate-pulse border-8 border-red-200 dark:border-red-900/50"
          onTouchStart={() => { }}
        >
          Hold to Alert
        </button>

        <button
          onClick={() => setCurrentScreen('home')}
          className={secondaryBtnClass + " px-10"}
        >
          Cancel
        </button>
      </div>
    </div>
  );

  const ProfileScreen = () => (
    <div className={`w-full min-h-screen pb-28 lg:pb-8 p-6 ${bgClass}`}>
      <div className="max-w-md mx-auto lg:max-w-none lg:mx-0 w-full">
        <div className="text-center lg:text-left mb-8">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-theme-surface border border-theme-border rounded-full shadow-sm text-[10px] font-extrabold uppercase tracking-wider text-theme-orange mb-3">
            👤 Account Settings
          </span>
          <h2 className={headingClass}>
            Profile Settings
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Column 1: Profile Details */}
          <div className={`${cardClass} p-8 text-center flex flex-col items-center justify-center`}>
            <div className="w-24 h-24 bg-gradient-to-br from-theme-blue to-theme-orange rounded-full flex items-center justify-center text-white text-3xl font-extrabold mb-5 shadow-md">
              {userName[0]}
            </div>
            <h3 className="text-2xl font-extrabold mb-1 tracking-tight text-theme-blue dark:text-white">
              {userName} Doe
            </h3>
            <p className={bodyTextClass + " font-medium"}>alex@email.com</p>
          </div>

          {/* Column 2: Actions */}
          <div className="space-y-4 flex flex-col justify-center">
            <button className="w-full flex items-center justify-start gap-4 p-5 rounded-2xl bg-theme-surface border border-theme-border text-theme-text-primary hover:border-theme-orange hover:-translate-y-0.5 shadow-sm hover:shadow-md transition-all duration-300 font-bold text-sm">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span>Edit Emergency Contacts</span>
            </button>

            <button
              onClick={toggleDarkMode}
              className="w-full flex items-center justify-start gap-4 p-5 rounded-2xl bg-theme-surface border border-theme-border text-theme-text-primary hover:border-theme-orange hover:-translate-y-0.5 shadow-sm hover:shadow-md transition-all duration-300 font-bold text-sm"
            >
              {darkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-theme-blue" />}
              <span>Theme: {darkMode ? 'Dark' : 'Light'}</span>
            </button>

            <button
              onClick={() => {
                setIsAuthenticated(false);
                setAuthToken('');
                setCurrentScreen('login');
              }}
              className="w-full flex items-center justify-start gap-4 p-5 rounded-2xl bg-theme-surface border border-theme-border text-theme-text-primary hover:border-red-400 hover:text-red-500 hover:-translate-y-0.5 shadow-sm hover:shadow-md transition-all duration-300 font-bold text-sm"
            >
              <Settings className="w-5 h-5 text-gray-400" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );

  const TrendsScreen = () => (
    <div className={`w-full min-h-screen pb-28 lg:pb-8 p-6 ${bgClass}`}>
      <div className="max-w-md mx-auto lg:max-w-none lg:mx-0 w-full">
        <div className="text-center lg:text-left mb-8">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-theme-surface border border-theme-border rounded-full shadow-sm text-[10px] font-extrabold uppercase tracking-wider text-theme-orange mb-3">
            📊 Analytics
          </span>
          <h2 className={headingClass}>
            Mood Trends
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Column 1: Mood Chart */}
          <div className={`${cardClass} p-6 md:p-8 flex flex-col`}>
            <h3 className="text-lg font-bold mb-6 text-theme-blue dark:text-white">Activity Chart</h3>
            <div className="h-48 flex items-end space-x-2 md:space-x-3 mb-8 px-2 border-b border-theme-border pb-4">
              {[4, 3, 5, 2, 4, 5, 3, 4, 2, 5, 4, 3, 5].map((height, i) => (
                <div key={i} className="flex-1 flex flex-col items-center h-full justify-end">
                  <div
                    className="bg-gradient-to-t from-theme-blue to-theme-orange rounded-t-full w-full max-w-[12px] shadow-sm hover:opacity-90 transition-opacity"
                    style={{ height: `${height * 20}%` }}
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-center space-x-3 mb-6">
              <button className="px-5 py-2 bg-theme-orange text-white rounded-full text-xs font-bold shadow-sm hover:bg-theme-orange-hover hover:scale-105 transition-all">Week</button>
              <button className="px-5 py-2 bg-theme-surface border border-theme-border text-theme-text-primary rounded-full text-xs font-semibold hover:border-theme-orange hover:text-theme-orange transition-all">Month</button>
              <button className="px-5 py-2 bg-theme-surface border border-theme-border text-theme-text-primary rounded-full text-xs font-semibold hover:border-theme-orange hover:text-theme-orange transition-all">Custom</button>
            </div>

            <button className={successBtnClass + " w-full rounded-full"}>
              Export/Share
            </button>
          </div>

          {/* Column 2: Insights */}
          <div className={`${cardClass} p-6 md:p-8`}>
            <h3 className="text-lg font-bold mb-6 text-theme-blue dark:text-white">Insights</h3>
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100/30 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300 text-sm font-semibold flex items-center gap-2.5">
                <span className="text-lg">📈</span>
                <p>Your mood has improved 15% this week!</p>
              </div>
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-slate-800/40 border border-blue-100/30 dark:border-slate-700/30 text-blue-800 dark:text-blue-300 text-sm font-semibold flex items-center gap-2.5">
                <span className="text-lg">🌅</span>
                <p>You feel best in the mornings</p>
              </div>
              <div className="p-4 rounded-2xl bg-orange-50 dark:bg-amber-950/20 border border-orange-100/30 dark:border-amber-900/30 text-orange-850 dark:text-orange-300 text-sm font-semibold flex items-center gap-2.5">
                <span className="text-lg">💭</span>
                <p>Journaling helps boost your mood</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );

  const BottomNav = () => (
    <div className={`lg:hidden fixed bottom-0 left-0 right-0 bg-theme-surface border-t border-theme-border px-6 py-3 z-50 transition-colors duration-300`}>
      <div className="flex justify-around max-w-md mx-auto">
        {[
          { icon: Home, screen: 'home', label: 'Home' },
          { icon: Camera, screen: 'emotion', label: 'Detect' },
          { icon: BookOpen, screen: 'journal', label: 'Journal' },
          { icon: BarChart3, screen: 'trends', label: 'Trends' },
          { icon: User, screen: 'profile', label: 'Profile' }
        ].map(({ icon: Icon, screen, label }) => (
          <button
            key={screen}
            onClick={() => setCurrentScreen(screen)}
            className={`flex flex-col items-center space-y-1 p-2 rounded-xl transition-all duration-300 ${currentScreen === screen
                ? 'text-theme-orange font-bold scale-105'
                : 'text-theme-text-secondary hover:text-theme-text-primary'
              }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const showNavbar = currentScreen !== 'splash' && currentScreen !== 'login' && currentScreen !== 'sos';

  const Navbar = () => (
    <header className={`w-full border-b border-theme-border px-6 py-4 flex justify-between items-center transition-colors duration-300 z-50 bg-theme-surface/90 backdrop-blur-md`}>
      <div className="flex items-center space-x-2.5">
        <div className="w-8 h-8 bg-theme-orange rounded-full flex items-center justify-center text-white -rotate-12 hover:rotate-0 transition-transform duration-300">
          <Leaf size={16} strokeWidth={2.5} />
        </div>
        <span className="text-xl font-extrabold tracking-tight text-theme-text-primary">MindMitra</span>
      </div>
      <button
        onClick={toggleDarkMode}
        className={`p-2.5 rounded-full transition-colors duration-300 ${darkMode ? 'bg-slate-800 text-yellow-450 hover:bg-slate-700' : 'bg-orange-50 text-theme-orange hover:bg-orange-100'}`}
      >
        {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>
    </header>
  );

  const Sidebar = () => {
    const navItems = [
      { icon: Home, screen: 'home', label: 'Home' },
      { icon: Camera, screen: 'emotion', label: 'Detect' },
      { icon: BookOpen, screen: 'journal', label: 'Journal' },
      { icon: BarChart3, screen: 'trends', label: 'Trends' },
      { icon: User, screen: 'profile', label: 'Profile' }
    ];

    return (
      <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 border-r border-theme-border bg-theme-surface transition-colors duration-300">
        <nav className="flex-1 flex flex-col pt-4">
          {navItems.map(({ icon: Icon, screen, label }) => {
            const isActive = currentScreen === screen;
            return (
              <button
                key={screen}
                onClick={() => setCurrentScreen(screen)}
                className={`flex items-center space-x-3 px-6 py-4 text-left font-bold transition-all duration-200 border-l-4 text-sm ${isActive
                    ? 'border-theme-orange bg-theme-card-orange/30 dark:bg-orange-950/20 text-theme-orange'
                    : 'border-transparent text-theme-text-secondary hover:bg-theme-card-orange/10 dark:hover:bg-slate-800/30 hover:text-theme-text-primary'
                  }`}
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
    );
  };

  const screens: Record<string, React.ReactElement> = {
    splash: <SplashScreen />,
    login: <LoginScreen />,
    home: <HomeScreen />,
    emotion: <EmotionDetectionScreen />,
    journal: <JournalScreen />,
    chat: <ChatScreen />,
    sos: <SOSScreen />,
    profile: <ProfileScreen />,
    trends: <TrendsScreen />
  };

  if (currentScreen === 'login') {
    return <LoginScreen />;
  }

  return (
    <div className={`w-screen min-h-screen flex flex-col overflow-x-hidden ${darkMode ? 'bg-slate-950 text-white' : 'bg-sky-50 text-slate-900'} transition-colors duration-300`}>
      {showNavbar && <Navbar />}
      <div className="flex flex-1 w-full overflow-hidden">
        {showNavbar && <Sidebar />}
        <main className="flex-1 overflow-y-auto">
          {screens[currentScreen]}
        </main>
      </div>
    </div>
  );
};

export default MindMitraApp;
