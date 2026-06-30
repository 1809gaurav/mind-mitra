import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  itemsPerPage?: number;
  darkMode: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  hasNext,
  hasPrev,
  onPageChange,
  onLimitChange,
  itemsPerPage = 20,
  darkMode,
}) => {
  const pageNumbers: number[] = [];
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, currentPage + 2);

  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  return (
    <div className={`flex flex-col gap-4 mt-6 p-4 rounded-xl transition-colors duration-300 ${
      darkMode ? 'bg-gray-800' : 'bg-white'
    } shadow-lg`}>
      
      {/* Main pagination controls */}
      <div className="flex items-center justify-between">
        {/* Previous Button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPrev}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
            hasPrev
              ? darkMode
                ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                : 'bg-blue-500 text-white hover:bg-blue-600 active:scale-95'
              : darkMode
              ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Prev</span>
        </button>

        {/* Page Numbers */}
        <div className="flex gap-1 items-center">
          {startPage > 1 && (
            <>
              <button
                onClick={() => onPageChange(1)}
                className={`w-8 h-8 rounded text-sm font-medium transition-all duration-200 ${
                  darkMode
                    ? 'hover:bg-gray-700 text-gray-300'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                1
              </button>
              {startPage > 2 && (
                <span className={`px-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  ...
                </span>
              )}
            </>
          )}

          {pageNumbers.map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`w-8 h-8 rounded text-sm font-medium transition-all duration-200 ${
                page === currentPage
                  ? darkMode
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-500 text-white'
                  : darkMode
                  ? 'hover:bg-gray-700 text-gray-300'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              {page}
            </button>
          ))}

          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && (
                <span className={`px-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  ...
                </span>
              )}
              <button
                onClick={() => onPageChange(totalPages)}
                className={`w-8 h-8 rounded text-sm font-medium transition-all duration-200 ${
                  darkMode
                    ? 'hover:bg-gray-700 text-gray-300'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                {totalPages}
              </button>
            </>
          )}
        </div>

        {/* Next Button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNext}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
            hasNext
              ? darkMode
                ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                : 'bg-blue-500 text-white hover:bg-blue-600 active:scale-95'
              : darkMode
              ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Items per page selector + info */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {onLimitChange && (
          <select
            value={itemsPerPage}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors duration-200 ${
              darkMode
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-800'
            }`}
          >
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
          </select>
        )}
        <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Page {currentPage} of {totalPages}
        </span>
      </div>
    </div>
  );
};