import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  FilterFn,
  getFilteredRowModel,
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

// Интерфейс для параметров поиска
interface SearchParams {
  searchQuery: string;
  selectedCategory: string;
}

// Компонент SearchPanel
interface SearchPanelProps {
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
      onSearch({ searchQuery, selectedCategory });
      // Не очищаем поле поиска
    }
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategory = e.target.value;
    setSelectedCategory(newCategory);
    onSearch({ searchQuery, selectedCategory: newCategory });
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

  // Исполнить поиск при нажатии на кнопку
  const handleSearchButtonClick = () => {
    onSearch({ searchQuery, selectedCategory });
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

// Компонент TableView
interface TableViewProps {
  data: Instruction[];
  columns: any[];
  visibleColumns: Record<string, boolean>;
  searchQuery: string;
  columnSizing: Record<string, number>;
  columnSizingInfo: any;
  onColumnSizingChange: (updaterOrValue: Updater<Record<string, number>>) => void;
  onColumnSizingInfoChange: (info: any) => void;
}

const TableView: React.FC<TableViewProps> = ({
  data,
  columns,
  visibleColumns,
  searchQuery,
  columnSizing,
  columnSizingInfo,
  onColumnSizingChange,
  onColumnSizingInfoChange
}) => {
  // Check if a column is currently being resized
  const isColumnResizing = (id: string): boolean => {
    return columnSizingInfo?.isResizingColumn === id;
  };

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      globalFilter: searchQuery,
      columnVisibility: visibleColumns,
      columnSizing,
      columnSizingInfo,
    },
    filterFns: {
      search: searchFilter,
    },
    globalFilterFn: searchFilter,
    columnResizeMode: 'onChange' as ColumnResizeMode,
    onColumnSizingChange,
    onColumnSizingInfoChange,
  });

  const handleTableClick = (e: React.MouseEvent) => {
    console.log('Table click:', 
      (e.target as HTMLElement)?.tagName, 
      (e.target as HTMLElement)?.className
    );
  };

  return (
    <div 
      className="table-wrapper"
      onScroll={() => {
        console.log('Table scroll');
      }}
    >
      <table 
        tabIndex={-1}
        style={{ width: table.getTotalSize() }}
        onClick={handleTableClick}
      >
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
                        onMouseDown: header.getResizeHandler(),
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
        <tbody tabIndex={-1}>
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} tabIndex={-1}>
              {row.getVisibleCells().map(cell => {
                if (!cell.column.id || !visibleColumns[cell.column.id]) return null;
                
                return (
                  <td 
                    key={cell.id}
                    style={{ width: cell.column.getSize() }}
                    data-content={String(flexRender(cell.column.columnDef.cell, cell.getContext()))}
                    tabIndex={-1}
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
  );
};

// Основной компонент, который объединяет SearchPanel и TableView
const InstructionsTable: React.FC = () => {
  const instructions = (instructionsData as any).instructions as Instruction[];
  const [data] = useState<Instruction[]>(instructions);
  const [filteredData, setFilteredData] = useState<Instruction[]>(instructions);
  const [currentSearchParams, setCurrentSearchParams] = useState<SearchParams>({
    searchQuery: '',
    selectedCategory: '',
  });
  
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

  // Get list of categories
  const categories = useMemo(() => getUniqueCategories(data), [data]);

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

  // Добавляем отслеживание глобальных событий клавиатуры
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Восстанавливаем обработчик для выхода из полноэкранного режима
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    
    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, [isFullscreen]);

  // Логирование рендеров компонента
  console.log('InstructionsTable render', { 
    isFullscreen, 
    currentSearchParams,
    now: new Date().toISOString() 
  });

  const toggleColumnVisibility = (columnId: string) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnId]: !prev[columnId]
    }));
    
    if (!visibleColumns[columnId] && !columnSizing[columnId]) {
      setColumnSizing(prev => ({
        ...prev,
        [columnId]: defaultColumnWidths[columnId as keyof typeof defaultColumnWidths]
      }));
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
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

  // Функция применения поиска и фильтрации
  const applySearch = useCallback((searchParams: SearchParams) => {
    console.log('Applying search:', searchParams);
    setCurrentSearchParams(searchParams);
    
    // Фильтрация данных
    const filtered = data.filter(item => {
      // Фильтр по категории
      if (searchParams.selectedCategory) {
        const mappedCategory = categoryMapping[item.doc.category] || item.doc.category;
        if (mappedCategory !== searchParams.selectedCategory) {
          return false;
        }
      }
      
      // Фильтр по поисковому запросу
      if (searchParams.searchQuery) {
        const query = searchParams.searchQuery.toLowerCase();
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
    
    setFilteredData(filtered);
  }, [data]);

  // Обработчики для управления изменением размеров колонок
  const handleColumnSizingChange = useCallback((updaterOrValue: Updater<Record<string, number>>) => {
    if (typeof updaterOrValue === 'function') {
      setColumnSizing(prev => updaterOrValue(prev));
    } else {
      setColumnSizing(updaterOrValue);
    }
  }, []);

  const handleColumnSizingInfoChange = useCallback((info: any) => {
    setColumnSizingInfo(info);
  }, []);

  // Основной компонент таблицы
  const TableComponent = () => (
    <div className="instructions-table-container">
      <SearchPanel 
        categories={categories}
        onSearch={applySearch}
        onToggleFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
        onToggleColumnVisibility={toggleColumnVisibility}
        visibleColumns={visibleColumns}
        columns={columns}
        currentSearchParams={currentSearchParams}
      />
      
      <TableView 
        data={filteredData}
        columns={columns}
        visibleColumns={visibleColumns}
        searchQuery={currentSearchParams.searchQuery}
        columnSizing={columnSizing}
        columnSizingInfo={columnSizingInfo}
        onColumnSizingChange={handleColumnSizingChange}
        onColumnSizingInfoChange={handleColumnSizingInfoChange}
      />
    </div>
  );

  // Рендеринг в полноэкранном режиме или обычном режиме
  return isFullscreen ? (
    <div className="fullscreen-container">
      <TableComponent />
    </div>
  ) : (
    <TableComponent />
  );
};

export default InstructionsTable; 