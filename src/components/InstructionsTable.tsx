import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  FilterFn,
  getFilteredRowModel,
  Column,
  ColumnResizeMode,
  Updater,
} from '@tanstack/react-table';
import { Instruction } from '../types/instruction';
import './InstructionsTable.css';
import instructionsData from '../cp0.json';

// Category grouping
const categoryMapping: Record<string, string> = {
  // Cells
  'cell_build': 'Cells',
  'cell_parse': 'Cells',
  
  // Stack
  'stack_basic': 'Stack',
  'stack_complex': 'Stack',
  
  // Arithmetic
  'arithm_basic': 'Arithmetic',
  'arithm_div': 'Arithmetic',
  'arithm_logical': 'Arithmetic',
  'arithm_quiet': 'Arithmetic',
  
  // Comparison
  'compare_int': 'Comparison',
  'compare_other': 'Comparison',
  
  // Constants
  'const_int': 'Constants',
  'const_data': 'Constants',
  
  // Dictionaries
  'dict_delete': 'Dictionaries',
  'dict_get': 'Dictionaries',
  'dict_mayberef': 'Dictionaries',
  'dict_min': 'Dictionaries',
  'dict_next': 'Dictionaries',
  'dict_prefix': 'Dictionaries',
  'dict_serial': 'Dictionaries',
  'dict_set': 'Dictionaries',
  'dict_set_builder': 'Dictionaries',
  'dict_special': 'Dictionaries',
  'dict_sub': 'Dictionaries',
  
  // Continuations
  'cont_basic': 'Continuations',
  'cont_conditional': 'Continuations',
  'cont_create': 'Continuations',
  'cont_dict': 'Continuations',
  'cont_loops': 'Continuations',
  'cont_registers': 'Continuations',
  'cont_stack': 'Continuations',
  
  // Tuples
  'tuple': 'Tuples',
  
  // Exceptions
  'exceptions': 'Exceptions',
  
  // Debug
  'debug': 'Debug',
  
  // Codepage
  'codepage': 'Codepage',
  
  // App-specific
  'app_actions': 'App-specific',
  'app_addr': 'App-specific',
  'app_config': 'App-specific',
  'app_crypto': 'App-specific',
  'app_currency': 'App-specific',
  'app_gas': 'App-specific',
  'app_global': 'App-specific',
  'app_misc': 'App-specific',
  'app_rnd': 'App-specific',
};

// Default column widths
const defaultColumnWidths = {
  mnemonic: 150,
  category: 150,
  description: 250,
  gas: 80,
  opcode: 120,
  stack: 120,
  fift: 180,
  tlb: 180,
  prefix: 100
};

// Default column visibility
const defaultColumnVisibility = {
  mnemonic: true,
  category: true,
  description: true,
  gas: true,
  opcode: true,
  stack: true,
  fift: true,
  tlb: true,
  prefix: true,
};

// Load string preference from localStorage with fallback to default
const loadStoredPreference = (key: string, defaultValue: string): string => {
  try {
    const saved = localStorage.getItem(key);
    return saved !== null ? saved : defaultValue;
  } catch (e) {
    console.error(`Error loading preference ${key}:`, e);
    return defaultValue;
  }
};

// Load boolean preference
const loadBooleanPreference = (key: string, defaultValue: boolean): boolean => {
  try {
    const saved = localStorage.getItem(key);
    return saved !== null ? JSON.parse(saved) === true : defaultValue;
  } catch (e) {
    console.error(`Error loading boolean preference ${key}:`, e);
    return defaultValue;
  }
};

// Load object preference
const loadObjectPreference = <T extends Record<string, any>>(key: string, defaultValue: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved !== null ? JSON.parse(saved) : defaultValue;
  } catch (e) {
    console.error(`Error loading object preference ${key}:`, e);
    return defaultValue;
  }
};

// Get unique categories from data with grouping
const getUniqueCategories = (data: Instruction[]) => {
  const categories = new Set<string>();
  
  data.forEach((instruction) => {
    if (instruction.doc.category) {
      const mappedCategory = categoryMapping[instruction.doc.category] || instruction.doc.category;
      categories.add(mappedCategory);
    }
  });
  
  return Array.from(categories).sort();
};

// Search function that prioritizes exact matches in instruction name
const searchFilter: FilterFn<Instruction> = (row, columnId, value) => {
  if (typeof value !== 'string' || value === '') return true;

  const searchTerm = value.toLowerCase();
  const mnemonic = row.original.mnemonic.toLowerCase();
  const description = row.original.doc.description.toLowerCase();
  
  // Priority for exact match in mnemonic
  if (mnemonic === searchTerm) return true;
  
  // Priority for mnemonic starting with search term
  if (mnemonic.startsWith(searchTerm)) return true;
  
  // Then partial match in mnemonic
  if (mnemonic.includes(searchTerm)) return true;
  
  // Then search in description
  if (description.includes(searchTerm)) return true;
  
  return false;
};

// Icons for fullscreen
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

const InstructionsTable: React.FC = () => {
  const instructions = (instructionsData as any).instructions as Instruction[];
  const [data] = useState<Instruction[]>(instructions);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => 
    loadObjectPreference('visibleColumns', defaultColumnVisibility)
  );
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => 
    loadBooleanPreference('isFullscreen', false)
  );
  const [columnSizing, setColumnSizing] = useState<Record<string, number>>(() => 
    loadObjectPreference('columnSizing', defaultColumnWidths)
  );
  const [columnSizingInfo, setColumnSizingInfo] = useState<any>({
    columnSizingStart: {},
    deltaOffset: {},
    deltaPercentage: {},
    isResizingColumn: false,
    startOffset: null,
    startSize: null
  });

  // Хранение ссылки на поле ввода для сохранения фокуса
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Вспомогательная функция для сохранения и восстановления фокуса
  const preserveFocus = (callback: () => void) => {
    // Сохраняем текущий фокус
    const activeElement = document.activeElement;
    const activeElementSelectionStart = activeElement instanceof HTMLInputElement ? activeElement.selectionStart : null;
    const activeElementSelectionEnd = activeElement instanceof HTMLInputElement ? activeElement.selectionEnd : null;
    
    // Выполняем операцию
    callback();
    
    // Восстанавливаем фокус после обновления
    // Используем requestAnimationFrame для более надежного восстановления фокуса
    requestAnimationFrame(() => {
      if (activeElement && activeElement instanceof HTMLInputElement && document.body.contains(activeElement)) {
        activeElement.focus({preventScroll: true}); // Предотвращаем прокрутку при восстановлении фокуса
        if (activeElementSelectionStart !== null && activeElementSelectionEnd !== null) {
          activeElement.setSelectionRange(activeElementSelectionStart, activeElementSelectionEnd);
        }
      }
    });
  };

  // Get list of categories
  const categories = useMemo(() => getUniqueCategories(data), [data]);

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(() => false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Save settings when changed
  useEffect(() => {
    localStorage.setItem('visibleColumns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  useEffect(() => {
    localStorage.setItem('columnSizing', JSON.stringify(columnSizing));
  }, [columnSizing]);

  useEffect(() => {
    localStorage.setItem('isFullscreen', JSON.stringify(isFullscreen));
  }, [isFullscreen]);

  // Обновляем toggleColumnVisibility с использованием функции preserveFocus
  const toggleColumnVisibility = (columnId: string) => {
    preserveFocus(() => {
      setVisibleColumns(prev => ({
        ...prev,
        [columnId]: !prev[columnId]
      }));
      
      // Сохраняем предыдущие размеры колонок и не меняем их при скрытии/показе
      // Если колонка становится видимой и у неё нет сохраненной ширины, 
      // используем значение по умолчанию
      if (!visibleColumns[columnId] && !columnSizing[columnId]) {
        setColumnSizing(prev => ({
          ...prev,
          [columnId]: defaultColumnWidths[columnId as keyof typeof defaultColumnWidths]
        }));
      }
    });
  };

  // Обновляем toggleFullscreen с использованием функции preserveFocus
  const toggleFullscreen = () => {
    preserveFocus(() => {
      setIsFullscreen(prev => !prev);
    });
  };

  const columnHelper = createColumnHelper<Instruction>();

  const columns = useMemo(() => [
    columnHelper.accessor('mnemonic', {
      id: 'mnemonic',
      header: 'Mnemonic',
      size: columnSizing.mnemonic || defaultColumnWidths.mnemonic,
      cell: info => info.getValue(),
    }),
    columnHelper.accessor(row => categoryMapping[row.doc.category] || row.doc.category, {
      id: 'category',
      header: 'Category',
      size: columnSizing.category || defaultColumnWidths.category,
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('doc.description', {
      id: 'description',
      header: 'Description',
      size: columnSizing.description || defaultColumnWidths.description,
      cell: info => info.getValue() || 'N/A',
    }),
    columnHelper.accessor('doc.gas', {
      id: 'gas',
      header: 'Gas',
      size: columnSizing.gas || defaultColumnWidths.gas,
      cell: info => info.getValue() || 'N/A',
    }),
    columnHelper.accessor('doc.opcode', {
      id: 'opcode',
      header: 'Opcode',
      size: columnSizing.opcode || defaultColumnWidths.opcode,
      cell: info => info.getValue() || 'N/A',
    }),
    columnHelper.accessor('doc.stack', {
      id: 'stack',
      header: 'Stack',
      size: columnSizing.stack || defaultColumnWidths.stack,
      cell: info => info.getValue() || 'N/A',
    }),
    columnHelper.accessor('doc.fift', {
      id: 'fift',
      header: 'Fift',
      size: columnSizing.fift || defaultColumnWidths.fift,
      cell: info => info.getValue() || 'N/A',
    }),
    columnHelper.accessor('bytecode.tlb', {
      id: 'tlb',
      header: 'TLB',
      size: columnSizing.tlb || defaultColumnWidths.tlb,
      cell: info => info.getValue() || 'N/A',
    }),
    columnHelper.accessor('bytecode.prefix', {
      id: 'prefix',
      header: 'Prefix',
      size: columnSizing.prefix || defaultColumnWidths.prefix,
      cell: info => info.getValue() || 'N/A',
    }),
  ], [columnHelper, columnSizing]);

  // Apply filters to data
  const filteredData = useMemo(() => {
    return data.filter(item => {
      // Filter by category
      if (selectedCategory) {
        const mappedCategory = categoryMapping[item.doc.category] || item.doc.category;
        if (mappedCategory !== selectedCategory) {
          return false;
        }
      }
      
      // Filter by search query
      if (debouncedSearchQuery) {
        const query = debouncedSearchQuery.toLowerCase();
        const mnemonic = item.mnemonic.toLowerCase();
        const description = item.doc.description?.toLowerCase() || '';
        
        // Priority for exact match
        if (mnemonic === query) return true;
        
        // Priority for name beginning
        if (mnemonic.startsWith(query)) return true;
        
        // Then partial match in name
        if (mnemonic.includes(query)) return true;
        
        // Then search in description
        if (description.includes(query)) return true;
        
        return false;
      }
      
      return true;
    });
  }, [data, selectedCategory, debouncedSearchQuery]);

  // Column resizing handling
  const handleColumnResize = useCallback((columnSizingInfo: any) => {
    setColumnSizingInfo(columnSizingInfo);
  }, []);

  // Обработчик изменения размеров колонок
  const handleColumnSizingChange = useCallback((updaterOrValue: Updater<Record<string, number>>) => {
    // Сохраняем фокус и состояние выделения перед изменением размеров
    const activeElement = document.activeElement;
    const activeElementSelectionStart = activeElement instanceof HTMLInputElement ? activeElement.selectionStart : null;
    const activeElementSelectionEnd = activeElement instanceof HTMLInputElement ? activeElement.selectionEnd : null;
    
    // Если updaterOrValue - функция, вызываем её с текущим состоянием
    if (typeof updaterOrValue === 'function') {
      setColumnSizing(prev => updaterOrValue(prev));
    } else {
      // Если updaterOrValue - объект, просто устанавливаем его как новое состояние
      setColumnSizing(updaterOrValue);
    }
    
    // Восстанавливаем фокус и выделение
    setTimeout(() => {
      if (activeElement && activeElement instanceof HTMLInputElement && document.body.contains(activeElement)) {
        activeElement.focus();
        if (activeElementSelectionStart !== null && activeElementSelectionEnd !== null) {
          activeElement.setSelectionRange(activeElementSelectionStart, activeElementSelectionEnd);
        }
      }
    }, 0);
    
    // Не сохраняем в localStorage при каждом изменении, чтобы избежать частых записей
    // Сохранение произойдет в handleColumnResizeEnd
  }, []);

  const handleColumnResizeEnd = useCallback(() => {
    // Сохраняем текущий активный элемент
    const activeElement = document.activeElement;
    const activeElementSelectionStart = activeElement instanceof HTMLInputElement ? activeElement.selectionStart : null;
    const activeElementSelectionEnd = activeElement instanceof HTMLInputElement ? activeElement.selectionEnd : null;
    
    // Update column sizing when resize ends
    setColumnSizingInfo({
      columnSizingStart: {},
      deltaOffset: {},
      deltaPercentage: {},
      isResizingColumn: false,
      startOffset: null,
      startSize: null
    });
    
    // Сохраняем текущие размеры колонок в localStorage
    localStorage.setItem('columnSizing', JSON.stringify(columnSizing));
    
    // Восстанавливаем фокус на активном элементе, если это было поле ввода
    if (activeElement && activeElement instanceof HTMLInputElement) {
      setTimeout(() => {
        if (document.contains(activeElement)) {
          activeElement.focus();
          // Восстанавливаем позицию курсора
          if (activeElementSelectionStart !== null && activeElementSelectionEnd !== null) {
            activeElement.setSelectionRange(activeElementSelectionStart, activeElementSelectionEnd);
          }
        }
      }, 0);
    }
  }, [columnSizing]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      globalFilter: debouncedSearchQuery,
      columnVisibility: visibleColumns,
      columnSizing,
      columnSizingInfo,
    },
    filterFns: {
      search: searchFilter,
    },
    globalFilterFn: searchFilter,
    columnResizeMode: 'onChange' as ColumnResizeMode,
    onColumnSizingChange: handleColumnSizingChange,
    onColumnSizingInfoChange: handleColumnResize,
  });

  // Check if a column is currently being resized
  const isColumnResizing = (id: string): boolean => {
    return columnSizingInfo?.isResizingColumn === id;
  };

  // Сохраняем фокус при обновлении данных таблицы
  useEffect(() => {
    // Проверяем, было ли поле ввода в фокусе перед обновлением
    const inputWasFocused = document.activeElement === searchInputRef.current;
    
    // Если поле ввода было в фокусе, восстановим фокус после обновления данных
    if (inputWasFocused && searchInputRef.current) {
      const selectionStart = searchInputRef.current.selectionStart;
      const selectionEnd = searchInputRef.current.selectionEnd;
      
      // Используем setTimeout для выполнения после обновления DOM
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.setSelectionRange(selectionStart, selectionEnd);
        }
      }, 0);
    }
  }, [filteredData, table.getRowModel()]);

  // Добавляем обработчики для ресайзинга на уровне document
  useEffect(() => {
    const handleMouseUp = () => {
      if (columnSizingInfo?.isResizingColumn) {
        // Сохраняем информацию о текущем элементе в фокусе перед завершением ресайзинга
        const activeElement = document.activeElement;
        const activeElementSelectionStart = activeElement instanceof HTMLInputElement ? activeElement.selectionStart : null;
        const activeElementSelectionEnd = activeElement instanceof HTMLInputElement ? activeElement.selectionEnd : null;
        
        handleColumnResizeEnd();
        
        // Восстанавливаем фокус на активном элементе, если это было поле ввода
        if (activeElement && activeElement instanceof HTMLInputElement) {
          setTimeout(() => {
            if (document.contains(activeElement)) {
              activeElement.focus();
              // Восстанавливаем позицию курсора
              if (activeElementSelectionStart !== null && activeElementSelectionEnd !== null) {
                activeElement.setSelectionRange(activeElementSelectionStart, activeElementSelectionEnd);
              }
            }
          }, 0);
        }
      }
    };
    
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchend', handleMouseUp);
    
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, [columnSizingInfo, handleColumnResizeEnd]);

  // Изменяем обработчик выбора категории, используя функцию preserveFocus
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    preserveFocus(() => {
      setSelectedCategory(e.target.value);
    });
  };

  // Добавляем отмену всплытия событий мыши при клике на поле ввода поиска
  const handleSearchInputMouseDown = (e: React.MouseEvent<HTMLInputElement>) => {
    e.stopPropagation(); // Предотвращаем всплытие события и перехват фокуса другими элементами
  };

  // Обработчик клика на таблицу, чтобы не сбрасывать фокус, если кликнули мимо элемента управления
  const handleTableContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Убираем автоматическое предотвращение потери фокуса, чтобы избежать цикла перехвата фокуса
    // Если нужно сохранить фокус для конкретного элемента, это должно делаться явно
    
    // if (debugMode) {
    //   console.log('Table container clicked');
    // }
  };

  // Обработчик изменения запроса поиска с сохранением фокуса
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Сохраняем текущую позицию курсора и выделения перед изменением состояния
    const selectionStart = e.target.selectionStart;
    const selectionEnd = e.target.selectionEnd;
    
    // Используем preserveFocus для сохранения фокуса при обновлении состояния
    preserveFocus(() => {
      setSearchQuery(e.target.value);
      setDebouncedSearchQuery(e.target.value); // Сразу обновляем debounced значение
    });
    
    // if (debugMode) {
    //   console.log('Search changed:', e.target.value);
    // }
  };

  // Main table component
  const TableComponent = () => (
    <div 
      className="instructions-table-container"
    >
      {/* {debugMode && (
        <div className="debug-panel" style={{ 
          position: 'fixed', 
          top: '10px', 
          right: '10px', 
          background: 'rgba(0,0,0,0.7)', 
          color: 'white', 
          padding: '10px', 
          borderRadius: '5px', 
          zIndex: 9999,
          maxWidth: '300px'
        }}>
          <h4>Отладка фокуса:</h4>
          <p>Последнее событие: {lastFocusEvent}</p>
          <p>Активный элемент: {document.activeElement?.tagName || 'none'}</p>
          <p>Поле ввода в фокусе: {document.activeElement === searchInputRef.current ? 'Да' : 'Нет'}</p>
          <button onClick={() => setDebugMode(false)}>Выключить отладку</button>
        </div>
      )} */}
      
      <div className="table-controls">
        <div className="search-filter">
          <input
            type="text"
            id="search-instructions"
            name="search-instructions"
            placeholder="Search instructions..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="search-input"
            ref={searchInputRef}
            onSelect={e => {
              // if (debugMode) {
              //   console.log('Selection changed', e.currentTarget.selectionStart, e.currentTarget.selectionEnd);
              // }
            }}
            onMouseDown={handleSearchInputMouseDown}
            // Предотвращаем потерю фокуса при клике внутри поля ввода
            onClick={e => e.stopPropagation()}
            // Отключаем автофокус, если он был включен браузером
            autoFocus={false}
          />
          
          <select
            value={selectedCategory}
            onChange={handleCategoryChange}
            className="category-select"
            id="category-filter"
            name="category-filter"
            // Предотвращаем потерю фокуса при открытии/закрытии выпадающего списка
            onMouseDown={e => e.stopPropagation()}
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
            onClick={toggleFullscreen}
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
                    onChange={() => column.id && toggleColumnVisibility(column.id)}
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
      
      <div className="table-wrapper">
        <table tabIndex={-1} style={{ width: table.getTotalSize() }} onClick={e => e.stopPropagation()}>
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => {
                  if (!header.column.id) return null;
                  
                  if (!visibleColumns[header.column.id]) {
                    return null;
                  }
                  
                  return (
                    <th 
                      key={header.id} 
                      onClick={header.column.getToggleSortingHandler()}
                      style={{ 
                        width: header.getSize(), 
                        position: 'relative' 
                      }}
                      className={isColumnResizing(header.column.id) ? 'resizing' : ''}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {{
                        asc: ' ↑',
                        desc: ' ↓',
                      }[header.column.getIsSorted() as string] ?? null}
                      
                      {/* Resizer */}
                      <div
                        {...{
                          onMouseDown: (e) => {
                            // Сохраняем текущий активный элемент перед началом ресайзинга
                            const activeElement = document.activeElement;
                            
                            // Предотвращаем потерю фокуса при начале ресайзинга
                            e.preventDefault();
                            
                            // Вызываем обработчик ресайзинга
                            header.getResizeHandler()(e);
                            
                            // Восстанавливаем фокус, если он был на поле ввода
                            if (activeElement && activeElement instanceof HTMLInputElement && 
                                document.contains(activeElement)) {
                              requestAnimationFrame(() => {
                                activeElement.focus();
                              });
                            }
                          },
                          onTouchStart: header.getResizeHandler(),
                          className: `resizer ${isColumnResizing(header.column.id) ? 'isResizing' : ''}`,
                        }}
                      />
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr key={row.id}>
                {row.getVisibleCells().map(cell => {
                  if (!cell.column.id) return null;
                  
                  if (!visibleColumns[cell.column.id]) {
                    return null;
                  }
                  
                  return (
                    <td 
                      key={cell.id}
                      style={{ width: cell.column.getSize() }}
                      data-content={String(flexRender(cell.column.columnDef.cell, cell.getContext()))}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Render in fullscreen mode or normal mode
  return isFullscreen ? (
    <div className="fullscreen-container">
      <TableComponent />
    </div>
  ) : (
    <TableComponent />
  );
};

export default InstructionsTable; 