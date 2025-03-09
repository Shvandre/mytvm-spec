import React, { useEffect, useState } from 'react';
import './ThemeToggle.css';

interface ThemeToggleProps {
  onChange?: (isDark: boolean) => void;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ onChange }) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  useEffect(() => {
    // Проверяем сохраненную тему в localStorage
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Устанавливаем тему по умолчанию
    const initialIsDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    setIsDarkMode(initialIsDark);
    
    // Применяем тему к body
    document.documentElement.setAttribute('data-theme', initialIsDark ? 'dark' : 'light');
    document.documentElement.classList.add('theme-transition');
  }, []);

  const toggleTheme = () => {
    const newIsDarkMode = !isDarkMode;
    setIsDarkMode(newIsDarkMode);
    
    // Сохраняем выбор в localStorage
    localStorage.setItem('theme', newIsDarkMode ? 'dark' : 'light');
    
    // Применяем тему к body
    document.documentElement.setAttribute('data-theme', newIsDarkMode ? 'dark' : 'light');
    
    // Вызываем обработчик, если он предоставлен
    if (onChange) {
      onChange(newIsDarkMode);
    }
  };

  return (
    <div className="theme-toggle">
      <button 
        onClick={toggleTheme} 
        className={`theme-toggle-button ${isDarkMode ? 'dark' : 'light'}`}
        aria-label={isDarkMode ? 'Переключиться на светлую тему' : 'Переключиться на тёмную тему'}
        title={isDarkMode ? 'Переключиться на светлую тему' : 'Переключиться на тёмную тему'}
      >
        <div className="icon-container">
          <svg className="sun-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
          <svg className="moon-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        </div>
      </button>
    </div>
  );
};

export default ThemeToggle; 