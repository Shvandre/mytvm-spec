import React, { useState, useEffect, useRef } from 'react';
import { Instruction } from '../types/instruction';

// Иконки для полноэкранного режима
const FullscreenIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5-5-5m5 5v-4m0 4h-4" />
  </svg>
);

const ExitFullscreenIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// Интерфейс для параметров поиска
export interface SearchParams {
  searchQuery: string;
  selectedCategory: string;
}

// Интерфейс для свойств SearchPanel
export interface SearchPanelProps {
  categories: string[];
  onSearch: (params: SearchParams) => void;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  onToggleColumnVisibility: (columnId: string) => void;
  visibleColumns: Record<string, boolean>;
  columns: any[];
  currentSearchParams: SearchParams;
}

const SearchPanel: React.FC<SearchPanelProps> = ({
  categories,
  onSearch,
  onToggleFullscreen,
  isFullscreen,
  onToggleColumnVisibility,
  visibleColumns,
  columns,
  currentSearchParams
}) => {
  const [searchQuery, setSearchQuery] = useState(currentSearchParams.searchQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>(currentSearchParams.selectedCategory);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Синхронизация props с состоянием при их изменении
  useEffect(() => {
    setSearchQuery(currentSearchParams.searchQuery);
    setSelectedCategory(currentSearchParams.selectedCategory);
  }, [currentSearchParams]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Search input changed:', e.target.value);
    setSearchQuery(e.target.value);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    console.log('Search input keydown:', e.key);
    if (e.key === 'Enter') {
      console.log('Enter pressed, sending search to parent');
      // Предотвращаем стандартное поведение, чтобы форма не отправлялась
      e.preventDefault();
      onSearch({ searchQuery, selectedCategory });
      // Сохраняем фокус на поле ввода
      e.currentTarget.focus();
    }
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategory = e.target.value;
    setSelectedCategory(newCategory);
    onSearch({ searchQuery, selectedCategory: newCategory });
    
    // Возвращаем фокус в поле поиска после выбора категории
    if (searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
    }
  };

  const handleSearchFocus = () => {
    console.log('Search input focused');
  };

  const handleSearchBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    console.log('Search input blurred, relatedTarget:', 
      e.relatedTarget?.tagName, 
      e.relatedTarget?.id
    );
  };

  // Обработчик клика для установки курсора в конце текста
  const handleSearchClick = (e: React.MouseEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    
    // При необходимости переместить курсор в конец текста
    // Отложенное выполнение, чтобы браузер сначала выполнил свою обработку клика
    setTimeout(() => {
      const length = input.value.length;
      if (input.selectionStart !== length || input.selectionEnd !== length) {
        input.setSelectionRange(length, length);
      }
    }, 0);
  };

  // Исполнить поиск при нажатии на кнопку
  const handleSearchButtonClick = () => {
    onSearch({ searchQuery, selectedCategory });
    // Возвращаем фокус в поле поиска
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  return (
    <div className="search-container">
      <div className="table-controls">
        <div className="search-filter">
          <input
            ref={searchInputRef}
            type="text"
            id="search-instructions"
            name="search-instructions"
            placeholder="Search instructions..."
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            onClick={handleSearchClick}
            className="search-input"
          />
          
          <button 
            type="button"
            onClick={handleSearchButtonClick}
            className="search-button"
          >
            Search
          </button>
          
          <select
            value={selectedCategory}
            onChange={handleCategoryChange}
            className="category-select"
            id="category-filter"
            name="category-filter"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          
          <button 
            className="fullscreen-btn"
            onClick={onToggleFullscreen}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen mode"}
          >
            {isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
            <span className="fullscreen-text">
              {isFullscreen ? "Exit" : "Fullscreen"}
            </span>
          </button>
        </div>
        
        <div className="column-toggles">
          <div className="toggle-title">Show columns:</div>
          <div className="toggle-buttons">
            {columns.map((column) => {
              // Check that column.id exists
              if (!column.id) return null;
              
              return (
                <label key={column.id} className="toggle-label">
                  <input
                    type="checkbox"
                    checked={visibleColumns[column.id] || false}
                    onChange={() => column.id && onToggleColumnVisibility(column.id)}
                  />
                  {column.id === 'category' ? 'Category' : 
                   column.id === 'mnemonic' ? 'Mnemonic' :
                   column.id === 'description' ? 'Description' :
                   column.id === 'gas' ? 'Gas' :
                   column.id === 'opcode' ? 'Opcode' :
                   column.id === 'stack' ? 'Stack' :
                   column.id === 'fift' ? 'Fift' :
                   column.id === 'tlb' ? 'TLB' :
                   column.id === 'prefix' ? 'Prefix' :
                   column.id}
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchPanel; 