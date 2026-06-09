import React, { useState, useEffect } from 'react';

interface MoodLog {
  date: string;
  mood: string;
  score: number;
}

export default function MindMitraUI() {
  const [moodHistory, setMoodHistory] = useState<MoodLog[]>(() => {
    const saved = localStorage.getItem('mindmitra_mood_history');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [selectedMood, setSelectedMood] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  const moods = [
    { emoji: '😢', label: 'Sad', score: 1 },
    { emoji: '😐', label: 'Neutral', score: 3 },
    { emoji: '🙂', label: 'Good', score: 4 },
    { emoji: '😀', label: 'Excellent', score: 5 }
  ];

  useEffect(() => {
    localStorage.setItem('mindmitra_mood_history', JSON.stringify(moodHistory));
  }, [moodHistory]);

  const handleLogMood = () => {
    if (!selectedMood) {
      setMessage('Please select an emoji first!');
      return;
    }

    const moodObj = moods.find(m => m.emoji === selectedMood);
    const newLog: MoodLog = {
      date: new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      mood: selectedMood,
      score: moodObj ? moodObj.score : 3
    };

    setMoodHistory([newLog, ...moodHistory]);
    setSelectedMood('');
    setMessage('Mood logged successfully for today! 🎉');
    
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-800">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 border-b pb-4">
          <h1 className="text-3xl font-bold text-indigo-600">MindMitra</h1>
          <p className="text-slate-500">Your personal mental health companion dashboard</p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-xl font-semibold">How are you feeling today?</h2>
            <p className="mb-6 text-sm text-slate-400">Log your daily mood to visualize your wellness journey</p>
            
            <div className="mb-6 grid grid-cols-4 gap-4">
              {moods.map((m) => (
                <button
                  key={m.label}
                  onClick={() => setSelectedMood(m.emoji)}
                  className={`flex flex-col items-center justify-center rounded-xl border p-4 transition-all ${
                    selectedMood === m.emoji 
                      ? 'border-indigo-500 bg-indigo-50 scale-105 shadow-sm' 
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-3xl mb-1">{m.emoji}</span>
                  <span className="text-xs font-medium text-slate-600">{m.label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={handleLogMood}
              className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white transition-colors hover:bg-indigo-700"
            >
              Log Daily Mood
            </button>

            {message && (
              <p className="mt-4 text-center text-sm font-medium text-emerald-600">{message}</p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-xl font-semibold">Weekly Mood Summary</h2>
            <p className="mb-6 text-sm text-slate-400">Overview of your logged entries</p>

            {moodHistory.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 text-slate-400">
                <p>No mood data logged yet.</p>
                <p className="text-xs">Your progress tracking will appear here!</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Mood History Trend</p>
                  <div className="flex items-end justify-start gap-3 h-24 pt-4 border-b border-slate-200">
                    {moodHistory.slice(0, 7).reverse().map((log, index) => (
                      <div key={index} className="flex flex-col items-center flex-1 group relative">
                        <span className="absolute -top-6 text-xs bg-slate-800 text-white rounded px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {log.mood}
                        </span>
                        <div 
                          className="w-full bg-indigo-400 rounded-t-md transition-all hover:bg-indigo-500" 
                          style={{ height: `${(log.score / 5) * 100}%`, minHeight: '15px' }}
                        />
                        <span className="text-[10px] text-slate-400 mt-2 truncate w-full text-center">{log.date.split(',')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="max-h-44 overflow-y-auto space-y-2 pr-1">
                  {moodHistory.slice(0, 5).map((log, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-slate-100 p-3 text-sm">
                      <span className="font-medium text-slate-500">{log.date}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{log.mood}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
