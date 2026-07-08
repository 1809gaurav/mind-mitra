import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AppContext } from '../../context/AppContext';
import { Loader2, Trash2, RefreshCw, Edit2, Calendar, X } from 'lucide-react';
import {
  saveJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
  getEmotionConfig,
  formatConfidence,
  type JournalEntryResponse,
} from '../../api/journal';
import { Pagination } from '../../components/Pagination';
import { RichTextEditor } from '../shared/RichTextEditor';
import toast from 'react-hot-toast';

// Pagination interface matching upstream
interface PaginationMeta {
  limit: number;
  offset: number;
  total_count: number;
  has_next: boolean;
  has_prev: boolean;
  current_page: number;
  total_pages: number;
}

/** Emotion badge component — renders a colored pill with emoji + label + confidence */
const EmotionBadge: React.FC<{
  label?: string | null;
  confidence?: number | null;
  analyzed: boolean;
  darkMode: boolean;
}> = ({ label, confidence, analyzed, darkMode }) => {
  if (!analyzed) {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        darkMode ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-100 text-gray-500'
      }`}>
        —
      </span>
    );
  }

  const config = getEmotionConfig(label);
  const bg = darkMode ? config.bgDark : config.bg;
  const text = darkMode ? config.textDark : config.text;
  const confStr = formatConfidence(confidence);

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-200 ${bg} ${text}`}
      title={`Detected emotion: ${label} (${confStr})`}
    >
      <span className="text-sm">{config.emoji}</span>
      <span className="capitalize">{label}</span>
      {confStr && <span className="opacity-70">· {confStr}</span>}
    </span>
  );
};

/** Loading skeleton for journal entries */
const EntrySkeleton: React.FC<{ darkMode: boolean }> = ({ darkMode }) => (
  <div className={`p-4 rounded-xl animate-pulse ${darkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
    <div className="flex justify-between items-start mb-2">
      <div className={`h-4 w-24 rounded ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`} />
      <div className={`h-5 w-20 rounded-full ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`} />
    </div>
    <div className={`h-3 w-full rounded mt-2 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`} />
    <div className={`h-3 w-2/3 rounded mt-1.5 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`} />
  </div>
);

const JournalScreen: React.FC = () => {
  const { darkMode } = useContext(AppContext);

  // ── State ──────────────────────────────────────────────────────────────────
  const [currentMood, setCurrentMood] = useState(3);
  const [journalText, setJournalText] = useState('');
  const [entryDate, setEntryDate] = useState('');
  const [entries, setEntries] = useState<JournalEntryResponse[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Token helper
  const getToken = useCallback((): string | null => {
    return localStorage.getItem('token') || null;
  }, []);

  // ── Helper: Extract pagination from headers ────────────────────────────────
  const extractPaginationFromHeaders = (response: Response, limit: number, offset: number): PaginationMeta => {
    const totalCount = parseInt(response.headers.get('X-Total-Count') || '0', 10);
    const hasNext = response.headers.get('X-Has-Next') === 'True';
    const currentPageVal = Math.floor(offset / limit) + 1;
    const totalPages = Math.ceil(totalCount / limit) || 1;

    return {
      limit,
      offset,
      total_count: totalCount,
      has_next: hasNext,
      has_prev: offset > 0,
      current_page: currentPageVal,
      total_pages: totalPages,
    };
  };

  // ── Fetch entries on mount & when page/filters change ──────────────────────
  const loadEntries = useCallback(async (page: number = 1, limit: number = 20) => {
    const token = getToken();
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const offset = (page - 1) * limit;
      let url = `/api/v1/journal?limit=${limit}&offset=${offset}`;
      if (startDate) url += `&start_date=${startDate}`;
      if (endDate) url += `&end_date=${endDate}`;

      const response = await fetch(
        url,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch journal entries');
      }

      const data = await response.json();
      setEntries(data);
      
      const paginationMeta = extractPaginationFromHeaders(response, limit, offset);
      setPagination(paginationMeta);
      
      setCurrentPage(page);
      setItemsPerPage(limit);
    } catch (err) {
      console.error('Failed to fetch journal entries:', err);
      setError('Failed to load entries');
    } finally {
      setLoading(false);
    }
  }, [getToken, startDate, endDate]);

  useEffect(() => {
    loadEntries(1, 20);
  }, [loadEntries]);

  // ── Page change handler ────────────────────────────────────────────────────
  const handlePageChange = (newPage: number) => {
    loadEntries(newPage, itemsPerPage);
  };

  // ── Items per page change handler ──────────────────────────────────────────
  const handleLimitChange = (newLimit: number) => {
    loadEntries(1, newLimit);
  };

  // ── Save handler ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!journalText.trim() || journalText === '<p></p>') {
      toast.error('Journal content cannot be empty');
      return;
    }
    const token = getToken();
    if (!token) {
      toast.error('Please log in to save entries');
      return;
    }

    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const payload = {
        mood: currentMood,
        text: journalText,
        date: entryDate ? new Date(entryDate).toISOString() : undefined
      };

      if (editingId) {
        await updateJournalEntry(editingId, payload, token);
        toast.success('Journal entry updated');
      } else {
        await saveJournalEntry(payload, token);
        toast.success('Journal entry saved');
      }

      // Reset form
      setEditingId(null);
      setCurrentMood(3);
      setJournalText('');
      setEntryDate('');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      
      // Reload first page to show new/updated entry
      await loadEntries(1, itemsPerPage);
    } catch (err) {
      console.error('Journal save error:', err);
      toast.error('Failed to save journal entry');
    } finally {
      setSaving(false);
    }
  };

  // ── Edit handler ───────────────────────────────────────────────────────────
  const handleEdit = (entry: JournalEntryResponse) => {
    setEditingId(entry.id);
    setCurrentMood(entry.mood);
    setJournalText(entry.text);
    if (entry.date) {
      const localDate = new Date(entry.date).toISOString().split('T')[0];
      setEntryDate(localDate);
    } else {
      setEntryDate('');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Delete handler ─────────────────────────────────────────────────────────
  const handleDelete = async (entryId: string) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) {
      return;
    }
    const token = getToken();
    if (!token) return;

    try {
      await deleteJournalEntry(entryId, token);
      toast.success('Journal entry deleted');
      
      // Reload current/previous page maintaining consistency
      if (entries.length === 1 && currentPage > 1) {
        loadEntries(currentPage - 1, itemsPerPage);
      } else {
        loadEntries(currentPage, itemsPerPage);
      }
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete entry');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setCurrentMood(3);
    setJournalText('');
    setEntryDate('');
  };

  const getMoodEmoji = (mood: number) => {
    switch (mood) {
      case 1: return '😢';
      case 2: return '😕';
      case 3: return '😐';
      case 4: return '🙂';
      case 5: return '😊';
      default: return '😐';
    }
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className={`min-h-screen bg-theme-bg text-theme-text-primary p-6 pb-24`}>
      <div className="max-w-2xl mx-auto animate-fadeIn">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-theme-surface border border-theme-border rounded-full shadow-sm text-[10px] font-extrabold uppercase tracking-wider text-theme-orange mb-3">
            📝 Private Thoughts
          </span>
          <h2 className="text-3xl font-extrabold text-theme-blue dark:text-white tracking-tight leading-tight">Mood Journal</h2>
        </div>
        
        {/* Compose/Editor Card */}
        <div className="app-card p-6 md:p-8 mb-6 transition-colors duration-300">
          <h3 className="text-lg font-bold mb-4 text-theme-blue dark:text-white">
            {editingId ? 'Edit Journal Entry' : 'How are you feeling today?'}
          </h3>
          
          <div className="flex justify-center items-center space-x-4 mb-6">
            <span className="text-2xl">😢</span>
            <input
              type="range"
              min="1"
              max="5"
              value={currentMood}
              onChange={e => setCurrentMood(Number(e.target.value))}
              className="flex-1 h-2 bg-theme-border rounded-lg appearance-none cursor-pointer accent-theme-orange"
            />
            <span className="text-2xl">😊</span>
          </div>
          
          <div className="text-center mb-6">
            <span className="text-5xl transition-all duration-200 inline-block hover:scale-110" role="img" aria-label="mood">
              {getMoodEmoji(currentMood)}
            </span>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-theme-text-secondary">
              Entry Date (Optional)
            </label>
            <input
              type="date"
              value={entryDate}
              onChange={e => setEntryDate(e.target.value)}
              className="w-full p-3 border border-theme-border rounded-2xl text-sm outline-none focus:ring-2 focus:ring-theme-blue bg-theme-surface text-theme-text-primary placeholder-gray-400"
            />
          </div>

          <div className="mb-6">
            <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-theme-text-secondary">
              Journal Notes
            </label>
            <RichTextEditor 
              content={journalText} 
              onChange={setJournalText} 
              darkMode={darkMode}
            />
          </div>

          {/* Success and Emotion analysis response indicators */}
          {saveSuccess && entries[0]?.emotion_analyzed && (
            <div className={`mb-6 p-3.5 rounded-2xl flex items-center gap-2 ${
              darkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-50 text-green-700'
            }`}>
              <span className="text-sm font-semibold">✨ Saved! Detected emotion:</span>
              <EmotionBadge
                label={entries[0].emotion_label}
                confidence={entries[0].emotion_confidence}
                analyzed={entries[0].emotion_analyzed}
                darkMode={darkMode}
              />
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 app-btn-pill-primary py-3 px-6 text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Analyzing...' : editingId ? 'Update Entry' : 'Save Entry'}
            </button>
            {editingId && (
              <button
                onClick={handleCancelEdit}
                className="px-6 app-btn-pill-secondary py-3 text-sm font-semibold transition-all duration-200"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Filters and List Card */}
        <div className="app-card p-6 md:p-8 transition-colors duration-300">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b pb-4 border-theme-border">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-theme-blue dark:text-white">Past Entries</h3>
              <button
                onClick={() => loadEntries(currentPage, itemsPerPage)}
                disabled={loading}
                className={`p-2 rounded-full transition-colors duration-200 ${
                  darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-orange-50 text-theme-orange'
                }`}
                title="Refresh entries"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            
            {/* Date Filtering Inputs */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="p-2 border border-theme-border rounded-xl text-xs outline-none focus:ring-2 focus:ring-theme-blue bg-theme-surface text-theme-text-primary"
                  placeholder="Start date"
                />
                <span className="text-gray-400 text-xs font-semibold">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="p-2 border border-theme-border rounded-xl text-xs outline-none focus:ring-2 focus:ring-theme-blue bg-theme-surface text-theme-text-primary"
                  placeholder="End date"
                />
              </div>
              {(startDate || endDate) && (
                <button
                  onClick={clearFilters}
                  className="p-2 rounded-full hover:bg-theme-border text-theme-text-secondary"
                  title="Clear Filters"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {loading && entries.length === 0 ? (
            <div className="space-y-4">
              {[0, 1, 2].map(i => <EntrySkeleton key={i} darkMode={darkMode} />)}
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-theme-text-secondary font-medium">
              No entries found. Start by writing your first journal notes above!
            </div>
          ) : (
            <div className="space-y-4">
              {entries.map(entry => (
                <div 
                  key={entry.id} 
                  className="p-5 border border-theme-border/50 rounded-2xl relative transition-all duration-200 bg-theme-surface hover:shadow-md"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-3xl" role="img" aria-label="mood">
                        {getMoodEmoji(entry.mood)}
                      </span>
                      <div>
                        <span className="font-bold text-sm text-theme-blue dark:text-white">
                          Mood: {entry.mood}/5
                        </span>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-theme-text-secondary mt-0.5">
                          <span className="flex items-center gap-1 font-semibold">
                            <Calendar size={12} />
                            {new Date(entry.date).toLocaleDateString(undefined, {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                          {entry.emotion_analyzed && (
                            <EmotionBadge
                              label={entry.emotion_label}
                              confidence={entry.emotion_confidence}
                              analyzed={entry.emotion_analyzed}
                              darkMode={darkMode}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(entry)}
                        className={`p-2 rounded-full transition-colors ${
                          darkMode ? 'hover:bg-slate-800 text-slate-350' : 'hover:bg-orange-50 text-theme-orange'
                        }`}
                        title="Edit Entry"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className={`p-2 rounded-full transition-colors text-red-500 ${
                          darkMode ? 'hover:bg-red-950/40' : 'hover:bg-red-50'
                        }`}
                        title="Delete Entry"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Formatted rich text content */}
                  <div 
                    className="text-sm leading-relaxed whitespace-normal break-words ProseMirror-static text-theme-text-secondary"
                    dangerouslySetInnerHTML={{ __html: entry.text }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {pagination && (
            <div className="mt-6">
              <Pagination
                currentPage={pagination.current_page}
                totalPages={pagination.total_pages}
                hasNext={pagination.has_next}
                hasPrev={pagination.has_prev}
                onPageChange={handlePageChange}
                onLimitChange={handleLimitChange}
                itemsPerPage={itemsPerPage}
                darkMode={darkMode}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JournalScreen;