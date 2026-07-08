import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun, BookOpen, MessageCircle, AlertCircle } from 'lucide-react';
import { AppContext } from '../../context/AppContext';

const HomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const { darkMode, setDarkMode, userName } = useContext(AppContext);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className={`min-h-screen bg-theme-bg text-theme-text-primary transition-colors duration-300`}>
      <div className="p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-theme-surface border border-theme-border rounded-full shadow-sm text-[10px] font-extrabold uppercase tracking-wider text-theme-orange mb-3">
              ✨ Wellness Dashboard
            </span>
            <h1 className="text-3xl font-extrabold text-theme-blue dark:text-white tracking-tight leading-tight">
              Hi, {userName} 👋
            </h1>
            <p className="text-theme-text-secondary mt-1.5 text-base font-medium">😊 You seem calm today</p>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2.5 rounded-full transition-colors duration-300 ${darkMode ? 'bg-slate-800 text-yellow-450 hover:bg-slate-700' : 'bg-orange-50 text-theme-orange hover:bg-orange-100'}`}
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <button
            onClick={() => navigate('/journal')}
            className="app-card bg-theme-card-blue border-none p-6 md:p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group"
          >
            <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 shadow-sm text-theme-blue group-hover:scale-115 transition-all duration-300">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
              New Journal Entry
            </h3>
            <p className="text-xs text-theme-text-secondary hidden sm:block">
              Write down your feelings
            </p>
          </button>
          <button
            onClick={() => navigate('/chat')}
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

        <div className="app-card p-6 md:p-8 mb-6">
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

      <div className="fixed bottom-6 right-6">
        <button
          onClick={() => navigate('/sos')}
          className="bg-red-500 hover:bg-red-655 text-white w-16 h-16 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 animate-pulse"
        >
          <AlertCircle className="w-8 h-8" />
        </button>
      </div>
    </div>
  );
};

export default HomeScreen; 