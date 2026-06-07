'use client';

import React, { useEffect, useState } from 'react';
import { 
  Keyboard, 
  ArrowLeft, 
  Sun, 
  Moon,
  FolderOpen,
  Clock,
  CheckCircle,
  Archive,
  DollarSign
} from 'lucide-react';
import Link from 'next/link';

export default function ShortcutsClient() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme as 'light' | 'dark');
    if (savedTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    if (nextTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  };

  const categories = [
    {
      title: "Navigation & Selection",
      items: [
        { keys: ["Ctrl", "A"], desc: "Select all files and folders in the current directory" },
        { keys: ["Escape"], desc: "Clear active selection or dismiss modals/dialogs" },
        { keys: ["v"], desc: "Cycle workspace view mode (List ➔ Grid ➔ Tile)" },
      ]
    },
    {
      title: "File Operations",
      items: [
        { keys: ["c"], desc: "Create a new virtual folder at the current path" },
        { keys: ["r"], desc: "Rename the currently selected file or folder" },
        { keys: ["d"], desc: "Download the selected available file(s)" },
        { keys: ["Delete"], desc: "Delete the selected file(s) and folder(s) permanently", secondaryKeys: ["Backspace"] },
      ]
    },
    {
      title: "Help & Interface",
      items: [
        { keys: ["?"], desc: "Open this keyboard shortcuts documentation page", secondaryKeys: ["/"] },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] transition-colors duration-200 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header bar */}
        <header className="flex justify-between items-center mb-8 border-b border-[var(--border-color)] pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-500" aria-hidden="true">
              <Keyboard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Glacier Drive Keyboard Shortcuts</h1>
              <p className="text-xs text-[var(--text-sub)]">Speed up your workflow using built-in hotkeys</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)] transition-all cursor-pointer"
              title="Toggle Theme"
              aria-label="Toggle light or dark theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
            </button>
            <Link 
              href="/"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/10 hover:shadow-blue-500/20 active:scale-[0.98] transition-all"
              aria-label="Go back to dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Drive</span>
            </Link>
          </div>
        </header>

        {/* Shortcuts Body Container */}
        <main className="grid grid-cols-1 gap-6">
          {categories.map((cat, idx) => (
            <section key={idx} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm overflow-hidden" aria-labelledby={`cat-title-${idx}`}>
              <div className="px-6 py-4 bg-[var(--bg-hover)]/40 border-b border-[var(--border-color)]">
                <h2 id={`cat-title-${idx}`} className="text-xs font-bold uppercase tracking-wider text-[var(--text-sub)]">{cat.title}</h2>
              </div>
              <div className="divide-y divide-[var(--border-color)]">
                {cat.items.map((item, itemIdx) => (
                  <div key={itemIdx} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--bg-hover)]/20 transition-colors">
                    <span className="text-sm font-medium text-[var(--text-main)] leading-relaxed">
                      {item.desc}
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {item.keys.map((key, keyIdx) => (
                        <React.Fragment key={keyIdx}>
                          <kbd className="px-2 py-1 rounded bg-[var(--bg-hover)] border border-[var(--border-color)] text-[10px] font-bold font-mono text-[var(--text-main)] shadow-sm uppercase">
                            {key}
                          </kbd>
                          {keyIdx < item.keys.length - 1 && <span className="text-xs text-[var(--text-muted)] font-semibold" aria-hidden="true">+</span>}
                        </React.Fragment>
                      ))}
                      {item.secondaryKeys && (
                        <>
                          <span className="text-xs text-[var(--text-muted)] px-1">or</span>
                          {item.secondaryKeys.map((key, keyIdx) => (
                            <React.Fragment key={keyIdx}>
                              <kbd className="px-2 py-1 rounded bg-[var(--bg-hover)] border border-[var(--border-color)] text-[10px] font-bold font-mono text-[var(--text-main)] shadow-sm uppercase">
                                {key}
                              </kbd>
                              {keyIdx < item.secondaryKeys!.length - 1 && <span className="text-xs text-[var(--text-muted)] font-semibold" aria-hidden="true">+</span>}
                            </React.Fragment>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </main>

        {/* Pro tip card */}
        <div className="mt-8 p-5 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 border border-blue-500/20 rounded-2xl flex gap-4 text-sm shadow-lg shadow-blue-500/2">
          <div className="p-2 rounded-xl bg-blue-500/20 text-blue-500 self-start" aria-hidden="true">
            <Keyboard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-[var(--text-main)] mb-1 text-sm">Keyboard-only Navigation Tips</h3>
            <p className="text-xs text-[var(--text-sub)] leading-relaxed">
              Combine keyboard shortcuts to manage storage without touching your mouse. For example, press <kbd className="px-1 py-0.5 rounded bg-black/20 font-mono text-[10px] font-bold">Ctrl+A</kbd> to select all files, and then press <kbd className="px-1 py-0.5 rounded bg-black/20 font-mono text-[10px] font-bold">D</kbd> to batch download them all at once!
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center mt-12 text-xs text-[var(--text-muted)]">
          <p>© {new Date().getFullYear()} Glacier Drive. Made with ❤️ by sundar-prakash.</p>
        </footer>
      </div>
    </div>
  );
}
