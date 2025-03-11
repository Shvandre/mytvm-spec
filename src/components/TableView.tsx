import React from 'react';
import ReactMarkdown from 'react-markdown';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  FilterFn,
  ColumnResizeMode,
  Updater,
} from '@tanstack/react-table';
import { Instruction } from '../types/instruction';

// Функция фильтрации, которая приоритезирует точные совпадения в имени инструкции
export const searchFilter: FilterFn<Instruction> = (row, columnId, value) => {
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

// Интерфейс для свойств TableView
export interface TableViewProps {
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
    
    // Предотвращаем автоматическое получение фокуса таблицей
    e.preventDefault();
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
                
                // Получаем значение ячейки для отображения
                const cellValue = flexRender(cell.column.columnDef.cell, cell.getContext());
                
                // Получаем текстовое представление для data-content
                let cellContent;
                if (cell.column.id === 'description' && row.original.doc?.description) {
                  cellContent = row.original.doc.description;
                } else if (cell.column.id === 'mnemonic' && row.original.mnemonic) {
                  cellContent = row.original.mnemonic;
                } else if (typeof cell.getValue() === 'string') {
                  cellContent = cell.getValue() as string;
                } else {
                  // Для остальных случаев берем то, что можно преобразовать в строку
                  cellContent = String(cell.getValue() || '');
                }
                
                return (
                  <td 
                    key={cell.id}
                    style={{ width: cell.column.getSize() }}
                    data-content={cellContent}
                    tabIndex={-1}
                  >
                    {cell.column.id === 'description' ? (
                      <span className="markdown-content">
                        <ReactMarkdown>{cellContent}</ReactMarkdown>
                      </span>
                    ) : (
                      <span>{cellValue}</span>
                    )}
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

export default TableView; 