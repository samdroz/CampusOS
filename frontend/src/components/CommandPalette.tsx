import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  BookOpen,
  CheckSquare,
  GraduationCap,
  FileText,
  Calendar,
  Settings,
  ArrowRight,
  Command,
  X,
  Clock,
} from 'lucide-react';
import { api } from '../api/client';
import { SearchItem } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Quick navigation items
  const staticNavigation = [
    { title: 'Dashboard', page: 'dashboard', icon: GraduationCap, badge: 'Page' },
    { title: 'Subjects & Courses', page: 'subjects', icon: BookOpen, badge: 'Page' },
    { title: 'Weekly Timetable', page: 'timetable', icon: Calendar, badge: 'Page' },
    { title: 'Assignments & Tasks', page: 'assignments', icon: CheckSquare, badge: 'Page' },
    { title: 'Examinations Schedule', page: 'exams', icon: Clock, badge: 'Page' },
    { title: 'Attendance Tracker', page: 'attendance', icon: CheckSquare, badge: 'Page' },
    { title: 'Lecture Notes', page: 'notes', icon: FileText, badge: 'Page' },
    { title: 'Settings & Profile', page: 'settings', icon: Settings, badge: 'Page' },
  ];

  // Global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open handled by parent or state
        }
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.search(query.trim());
        setResults(res.results);
        setSelectedIndex(0);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Key navigation in palette
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    const totalItems = query.trim() ? results.length : staticNavigation.length;
    if (totalItems === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % totalItems);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (query.trim() && results[selectedIndex]) {
        const item = results[selectedIndex];
        const page = item.url.replace('/', '');
        onNavigate(page);
        onClose();
      } else if (!query.trim() && staticNavigation[selectedIndex]) {
        onNavigate(staticNavigation[selectedIndex].page);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="bg-campus-900 border border-campus-700/80 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden animate-scaleIn">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-campus-700/60 bg-campus-850/60">
          <Search className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Type a command or search subjects, assignments, exams, notes..."
            className="w-full bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-campus-800 border border-campus-700 rounded">
              ESC
            </kbd>
          )}
        </div>

        {/* Results Container */}
        <div className="max-h-96 overflow-y-auto p-2">
          {loading && (
            <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
              Searching CampusOS records...
            </div>
          )}

          {!loading && query.trim() && results.length === 0 && (
            <div className="py-8 text-center text-sm text-slate-400">
              No matching records found for "{query}"
            </div>
          )}

          {!loading && query.trim() && results.length > 0 && (
            <div className="space-y-1">
              <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Search Results ({results.length})
              </div>
              {results.map((item, idx) => {
                let Icon = BookOpen;
                if (item.entity_type === 'assignment') Icon = CheckSquare;
                if (item.entity_type === 'exam') Icon = Clock;
                if (item.entity_type === 'note') Icon = FileText;

                const isSelected = selectedIndex === idx;

                return (
                  <button
                    key={`${item.entity_type}-${item.id}`}
                    onClick={() => {
                      onNavigate(item.url.replace('/', ''));
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all ${
                      isSelected
                        ? 'bg-brand-indigo/20 text-white border border-brand-indigo/30'
                        : 'text-slate-200 hover:bg-campus-800/60'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div
                        className="p-1.5 rounded-lg shrink-0"
                        style={{ backgroundColor: `${item.color || '#6366F1'}20`, color: item.color || '#6366F1' }}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        {item.subtitle && <p className="text-xs text-slate-400 truncate">{item.subtitle}</p>}
                      </div>
                    </div>
                    <span className="ml-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-campus-800 text-slate-300 border border-campus-700 uppercase tracking-wider shrink-0">
                      {item.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {!query.trim() && (
            <div className="space-y-1">
              <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Quick Navigation
              </div>
              {staticNavigation.map((item, idx) => {
                const Icon = item.icon;
                const isSelected = selectedIndex === idx;

                return (
                  <button
                    key={item.page}
                    onClick={() => {
                      onNavigate(item.page);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all ${
                      isSelected
                        ? 'bg-brand-indigo/20 text-white border border-brand-indigo/30'
                        : 'text-slate-200 hover:bg-campus-800/60'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-1.5 rounded-lg bg-campus-800 text-brand-indigo">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium">{item.title}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-campus-950 border-t border-campus-700/60 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center space-x-3">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-campus-800 border border-campus-700 text-slate-300 font-mono">↑</kbd>{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-campus-800 border border-campus-700 text-slate-300 font-mono">↓</kbd>{' '}
              Navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-campus-800 border border-campus-700 text-slate-300 font-mono">↵</kbd>{' '}
              Select
            </span>
          </div>
          <span>Search CampusOS</span>
        </div>
      </div>
    </div>
  );
};
