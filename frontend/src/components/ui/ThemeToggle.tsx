// 🌓 Theme Toggle Component - macOS Style
// Smooth transition between light and dark modes
// Author: Steve Jobs' Spirit via Peter Levler

import React, { useState, useEffect } from 'react';

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const initialTheme = savedTheme || systemPreference;

    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      className="focus-ring transition-spring"
      style={{
        position: 'relative',
        width: '52px',
        height: '32px',
        backgroundColor: theme === 'dark' ? 'var(--color-primary)' : 'var(--color-gray-300)',
        borderRadius: 'var(--radius-full)',
        border: 'none',
        cursor: 'pointer',
        padding: '3px',
        transition: 'var(--transition-base)',
        boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)',
      }}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {/* Toggle Circle */}
      <div
        style={{
          width: '26px',
          height: '26px',
          backgroundColor: 'var(--color-white)',
          borderRadius: '50%',
          position: 'absolute',
          top: '3px',
          left: theme === 'dark' ? 'calc(100% - 29px)' : '3px',
          transition: 'all 300ms cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          boxShadow: 'var(--shadow-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
        }}
      >
        {theme === 'light' ? '☀️' : '🌙'}
      </div>
    </button>
  );
};

export default ThemeToggle;
