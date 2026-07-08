import React from 'react';

const TrendsScreen: React.FC = () => {
  return (
    <div className={`min-h-screen bg-theme-bg text-theme-text-primary p-6`}>
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-theme-surface border border-theme-border rounded-full shadow-sm text-[10px] font-extrabold uppercase tracking-wider text-theme-orange mb-3">
            📊 Analytics
          </span>
          <h2 className="text-3xl font-extrabold text-theme-blue dark:text-white tracking-tight leading-tight">Mood Trends</h2>
        </div>

        <div className="app-card p-6 md:p-8 mb-6">
          <h3 className="text-lg font-bold mb-6 text-theme-blue dark:text-white">Activity Chart</h3>
          <div className="h-48 flex items-end space-x-2 mb-8 px-2 border-b border-theme-border pb-4">
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

          <button className="w-full app-btn-pill-primary py-3 px-6 text-sm font-bold">
            Export/Share
          </button>
        </div>

        <div className="app-card p-6 md:p-8">
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
  );
};

export default TrendsScreen; 