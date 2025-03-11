import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  createColumnHelper,
  Updater,
} from '@tanstack/react-table';
import { Instruction } from '../types/instruction';
import './InstructionsTable.css';
import instructionsData from '../cp0.json';
import SearchPanel, { SearchParams } from './SearchPanel';
import TableView, { searchFilter } from './TableView';

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