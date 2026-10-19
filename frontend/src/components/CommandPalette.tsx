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
  X,
  Clock,
  UserCheck,
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

  const staticNavigation = [
    { title: 'Dashboard', page: 'dashboard', icon: GraduationCap },
    { title: 'Subjects & Courses', page: 'subjects', icon: BookOpen },
    { title: 'Weekly Timetable', page: 'timetable', icon: Calendar },
    { title: 'Assignments & Deliverables', page: 'assignments', icon: CheckSquare },
    { title: 'Examinations Schedule', page: 'exams', icon: Clock },
    { title: 'Attendance Tracker', page: 'attendance', icon: UserCheck },
    { title: 'Lecture Notes', page: 'notes', icon: FileText },
    { title: 'Settings & Appearance', page: 'settings', icon: Settings },
  ];

  // Global shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
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
      setTimeout(() => inputRef.current?.focus(), 40);
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
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  // Keyboard navigation
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
        onNavigate(item.url.replace('/', ''));
        onClose();
      } else if (!query.trim() && staticNavigation[selectedIndex]) {
        onNavigate(staticNavigation[selectedIndex].page);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-surface border border-border-default rounded-xl max-w-xl w-full shadow-2xl overflow-hidden animate-scaleIn">
        {/* Search Bar */}
        <div className="flex items-center px-4 py-3 border-b border-border-subtle bg-surface">
          <Search className="w-4 h-4 text-txt-muted mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search subjects, assignments, exams, notes..."
            className="w-full bg-transparent text-sm text-txt-primary placeholder-txt-muted focus:outline-none"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="text-txt-muted hover:text-txt-primary p-1 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.2 text-[10px] font-mono text-txt-muted bg-surface-elevated border border-border-subtle rounded">
              ESC
            </kbd>
          )}
        </div>

        {/* Results Container */}
        <div className="max-h-80 overflow-y-auto p-1.5">
          {loading && (
            <div className="py-6 text-center text-xs text-txt-muted">
              Searching records...
            </div>
          )}

          {!loading && query.trim() && results.length === 0 && (
            <div className="py-6 text-center text-xs text-txt-muted">
              No results found for "{query}"
            </div>
          )}

          {!loading && query.trim() && results.length > 0 && (
            <div className="space-y-0.5">
              <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-txt-muted">
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
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors ${
                      isSelected
                        ? 'bg-accent-subtle text-accent'
                        : 'text-txt-primary hover:bg-surface-elevated'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <Icon className="w-4 h-4 text-txt-muted shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-txt-primary truncate">{item.title}</p>
                        {item.subtitle && <p className="text-[11px] text-txt-muted truncate">{item.subtitle}</p>}
                      </div>
                    </div>
                    <span className="ml-2 text-[10px] font-mono uppercase text-txt-muted px-1.5 py-0.2 rounded bg-surface-elevated border border-border-subtle shrink-0">
                      {item.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {!query.trim() && (
            <div className="space-y-0.5">
              <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-txt-muted">
                Navigation
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
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors ${
                      isSelected
                        ? 'bg-accent-subtle text-accent'
                        : 'text-txt-secondary hover:text-txt-primary hover:bg-surface-elevated'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Icon className="w-4 h-4 text-txt-muted" />
                      <span className="text-xs font-medium">{item.title}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-txt-muted" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-2 bg-surface-elevated border-t border-border-subtle flex items-center justify-between text-[11px] text-txt-muted">
          <div className="flex items-center space-x-2">
            <span>
              <kbd className="px-1 py-0.2 rounded bg-surface border border-border-subtle font-mono text-[10px]">↑</kbd>{' '}
              <kbd className="px-1 py-0.2 rounded bg-surface border border-border-subtle font-mono text-[10px]">↓</kbd>{' '}
              Navigate
            </span>
            <span>
              <kbd className="px-1 py-0.2 rounded bg-surface border border-border-subtle font-mono text-[10px]">↵</kbd>{' '}
              Select
            </span>
          </div>
          <span>CampusOS Search</span>
        </div>
      </div>
    </div>
  );
};
