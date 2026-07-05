import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AppContext } from '../../context/AppContext';
import { Loader2, Trash2, RefreshCw, Edit2, Calendar, X } from 'lucide-react';
import {
  fetchJournalEntries,
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
  const [error, setError] = useState<string | null>(null);
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
    } catch (err: any) {
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
    } catch (err: any) {
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
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'} p-6 pb-24`}>
      <div className="max-w-2xl mx-auto animate-fadeIn">
        <h2 className="text-2xl font-bold mb-6 text-center font-outfit">Mood Journal</h2>
        
        {/* Compose/Editor Card */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 shadow-lg mb-6 transition-colors duration-300`}>
          <h3 className="font-semibold mb-4 text-lg">
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
              className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-2xl">😊</span>
          </div>
          
          <div className="text-center mb-4">
            <span className="text-4xl" role="img" aria-label="mood">
              {getMoodEmoji(currentMood)}
            </span>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-gray-500">
              Entry Date (Optional)
            </label>
            <input
              type="date"
              value={entryDate}
              onChange={e => setEntryDate(e.target.value)}
              className={`w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 ${
                darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'
              }`}
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-gray-500">
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
            <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
              darkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-50 text-green-700'
            }`}>
              <span className="text-sm">✨ Saved! Detected emotion:</span>
              <EmotionBadge
                label={entries[0].emotion_label}
                confidence={entries[0].emotion_confidence}
                analyzed={entries[0].emotion_analyzed}
                darkMode={darkMode}
              />
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Analyzing...' : editingId ? 'Update Entry' : 'Save Entry'}
            </button>
            {editingId && (
              <button
                onClick={handleCancelEdit}
                className="px-4 bg-gray-500 hover:bg-gray-600 text-white py-2.5 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Filters and List Card */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 shadow-lg transition-colors duration-300`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b pb-4 border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">Past Entries</h3>
              <button
                onClick={() => loadEntries(currentPage, itemsPerPage)}
                disabled={loading}
                className={`p-1.5 rounded-lg transition-colors duration-200 ${
                  darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                }`}
                title="Refresh entries"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            
            {/* Date Filtering Inputs */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className={`p-1.5 border rounded text-xs outline-none ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'
                  }`}
                  placeholder="Start date"
                />
                <span className="text-gray-400 text-xs">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className={`p-1.5 border rounded text-xs outline-none ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'
                  }`}
                  placeholder="End date"
                />
              </div>
              {(startDate || endDate) && (
                <button
                  onClick={clearFilters}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                  title="Clear Filters"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {loading && entries.length === 0 ? (
            <div className="space-y-3">
              {[0, 1, 2].map(i => <EntrySkeleton key={i} darkMode={darkMode} />)}
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No entries found. Start by writing your first journal notes above!
            </div>
          ) : (
            <div className="space-y-4">
              {entries.map(entry => (
                <div 
                  key={entry.id} 
                  className={`p-4 border rounded-xl relative transition-all ${
                    darkMode 
                      ? 'border-gray-700 bg-gray-900/50 hover:bg-gray-900' 
                      : 'border-gray-200 bg-gray-50 hover:bg-gray-100/50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl" role="img" aria-label="mood">
                        {getMoodEmoji(entry.mood)}
                      </span>
                      <div>
                        <span className="font-semibold text-sm">
                          Mood: {entry.mood}/5
                        </span>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
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
                        className={`p-1.5 rounded-lg transition-colors ${
                          darkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-200 text-gray-600'
                        }`}
                        title="Edit Entry"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className={`p-1.5 rounded-lg transition-colors text-red-500 ${
                          darkMode ? 'hover:bg-gray-750' : 'hover:bg-red-50'
                        }`}
                        title="Delete Entry"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Formatted rich text content */}
                  <div 
                    className={`text-sm leading-relaxed whitespace-normal break-words ProseMirror-static ${
                      darkMode ? 'text-gray-200' : 'text-gray-700'
                    }`}
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