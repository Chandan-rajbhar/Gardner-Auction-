import React, { useState, useMemo, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, MoreVertical, SlidersHorizontal, RefreshCw } from 'lucide-react';

export interface ColumnDef<T> {
  key: string;
  header: string;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (item: T, index: number) => React.ReactNode;
}

export interface ActionMenuItem<T> {
  label: string;
  icon?: React.ElementType;
  onClick: (item: T) => void;
  destructive?: boolean;
  disabled?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  keyExtractor: (item: T) => string;
  searchPlaceholder?: string;
  searchFilter?: (item: T, query: string) => boolean;
  rowActions?: ActionMenuItem<T>[];
  enableSelection?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  itemNoun?: string;
  isLoading?: boolean;
  emptyMessage?: string;
  topRightControls?: React.ReactNode;
  onRefresh?: () => void;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  searchPlaceholder = 'Search records...',
  searchFilter,
  rowActions,
  enableSelection = false,
  selectedIds = [],
  onSelectionChange,
  defaultPageSize = 20,
  pageSizeOptions = [10, 20, 50, 100],
  itemNoun = 'records',
  isLoading = false,
  emptyMessage = 'No data available in table',
  topRightControls,
  onRefresh
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(columns.map(c => c.key));
  const [isColumnSettingsOpen, setIsColumnSettingsOpen] = useState(false);

  // Close 3-dot menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.datatable-menu-container')) {
        setOpenMenuId(null);
      }
      if (!(e.target as HTMLElement).closest('.col-settings-container')) {
        setIsColumnSettingsOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Filtered data
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    if (searchFilter) {
      return data.filter(item => searchFilter(item, searchTerm.toLowerCase().trim()));
    }
    // Default search over all fields
    return data.filter(item => {
      const serialized = JSON.stringify(item).toLowerCase();
      return serialized.includes(searchTerm.toLowerCase().trim());
    });
  }, [data, searchTerm, searchFilter]);

  // Sorted data
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a: any, b: any) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA === valB) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      return sortDirection === 'asc' ? 1 : -1;
    });
  }, [filteredData, sortKey, sortDirection]);

  // Paginated data
  const totalItems = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, validCurrentPage, pageSize]);

  const startItem = totalItems === 0 ? 0 : (validCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(validCurrentPage * pageSize, totalItems);

  // Selection helpers
  const currentPageIds = paginatedData.map(keyExtractor);
  const allCurrentSelected = currentPageIds.length > 0 && currentPageIds.every(id => selectedIds.includes(id));

  const toggleSelectAllCurrent = () => {
    if (!onSelectionChange) return;
    if (allCurrentSelected) {
      onSelectionChange(selectedIds.filter(id => !currentPageIds.includes(id)));
    } else {
      const toAdd = currentPageIds.filter(id => !selectedIds.includes(id));
      onSelectionChange([...selectedIds, ...toAdd]);
    }
  };

  const toggleSelectRow = (id: string) => {
    if (!onSelectionChange) return;
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(item => item !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const handleSort = (key: string, isSortable?: boolean) => {
    if (!isSortable) return;
    if (sortKey === key) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Top Controls Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
          <div className="catalog-search-wrapper" style={{ flex: 1, maxWidth: 380 }}>
            <Search size={16} className="catalog-search-icon" />
            <input 
              type="text"
              className="catalog-search-input"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {onRefresh && (
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onRefresh}
              title="Refresh Data"
              style={{ padding: '8px 12px', height: 38 }}
            >
              <RefreshCw size={15} />
            </button>
          )}

          {/* Column Settings Toggle */}
          <div className="col-settings-container" style={{ position: 'relative' }}>
            <button 
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsColumnSettingsOpen(!isColumnSettingsOpen)}
              title="Customize Columns"
              style={{ padding: '8px 12px', height: 38 }}
            >
              <SlidersHorizontal size={15} />
            </button>

            {isColumnSettingsOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: 6,
                background: '#ffffff',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8,
                boxShadow: 'var(--shadow-dropdown)',
                padding: '12px 14px',
                zIndex: 40,
                minWidth: 200,
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '0.05em' }}>
                  Visible Columns
                </div>
                {columns.map(col => (
                  <label key={col.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                    <input 
                      type="checkbox"
                      checked={visibleColumns.includes(col.key)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setVisibleColumns(prev => [...prev, col.key]);
                        } else if (visibleColumns.length > 1) {
                          setVisibleColumns(prev => prev.filter(k => k !== col.key));
                        }
                      }}
                    />
                    <span>{col.header}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {topRightControls && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {topRightControls}
          </div>
        )}
      </div>

      {/* Table Container */}
      <div className="catalog-table-card" style={{ position: 'relative', overflow: 'visible' }}>
        {isLoading && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(255, 255, 255, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            backdropFilter: 'blur(2px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--gold-primary)', fontWeight: 600 }}>
              <RefreshCw size={20} className="animate-spin" />
              <span>Loading records...</span>
            </div>
          </div>
        )}

        <div className="catalog-table-scroll" style={{ overflow: 'visible', width: '100%' }}>
          <table className="catalog-luxury-table" style={{ width: '100%', minWidth: '100%' }}>
            <thead>
              <tr>
                {enableSelection && (
                  <th style={{ width: 44, textAlign: 'center' }}>
                    <input 
                      type="checkbox"
                      className="catalog-checkbox"
                      checked={allCurrentSelected}
                      onChange={toggleSelectAllCurrent}
                      aria-label="Select all current records"
                    />
                  </th>
                )}
                {columns.filter(c => visibleColumns.includes(c.key)).map(col => (
                  <th 
                    key={col.key}
                    style={{ 
                      width: col.width,
                      textAlign: col.align || 'left',
                      cursor: col.sortable ? 'pointer' : 'default',
                      userSelect: 'none'
                    }}
                    onClick={() => handleSort(col.key, col.sortable)}
                  >
                    <div style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: 4,
                      justifyContent: col.align === 'center' ? 'center' : col.align === 'right' ? 'flex-end' : 'flex-start',
                      width: '100%'
                    }}>
                      <span>{col.header}</span>
                      {col.sortable && sortKey === col.key && (
                        <span style={{ fontSize: 10, color: 'var(--gold-primary)' }}>
                          {sortDirection === 'asc' ? '▲' : '▼'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
                {rowActions && rowActions.length > 0 && (
                  <th style={{ width: 60, textAlign: 'center' }}>ACTIONS</th>
                )}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((item, idx) => {
                const id = keyExtractor(item);
                const isSelected = selectedIds.includes(id);

                return (
                  <tr 
                    key={id}
                    className={isSelected ? 'selected-row' : ''}
                    style={{ background: isSelected ? '#fbf8f2' : undefined }}
                  >
                    {enableSelection && (
                      <td style={{ textAlign: 'center' }}>
                        <input 
                          type="checkbox"
                          className="catalog-checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(id)}
                          aria-label={`Select record ${id}`}
                        />
                      </td>
                    )}
                    {columns.filter(c => visibleColumns.includes(c.key)).map(col => (
                      <td 
                        key={col.key}
                        style={{ textAlign: col.align || 'left' }}
                      >
                        {col.render ? col.render(item, idx) : (item as any)[col.key]}
                      </td>
                    ))}

                    {/* Three-dot action menu */}
                    {rowActions && rowActions.length > 0 && (
                      <td style={{ textAlign: 'center' }}>
                        <div className="datatable-menu-container" style={{ position: 'relative', display: 'inline-block' }}>
                          <button 
                            type="button"
                            className={`btn-three-dots ${openMenuId === id ? 'active' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === id ? null : id);
                            }}
                            title="Row actions"
                            style={{
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: 6,
                              borderRadius: 6,
                              color: openMenuId === id ? '#0f172a' : '#64748b',
                              outline: 'none'
                            }}
                          >
                            <MoreVertical size={16} />
                          </button>

                          {openMenuId === id && (
                            <div className={`lot-action-dropdown ${idx >= paginatedData.length - 2 && paginatedData.length > 2 ? 'drop-up' : 'drop-down'}`} style={{ minWidth: 150 }}>
                              {rowActions.map((action, aIdx) => {
                                const Icon = action.icon;
                                return (
                                  <button 
                                    key={aIdx}
                                    type="button"
                                    className={`dropdown-action-item ${action.destructive ? 'destructive' : ''}`}
                                    disabled={action.disabled}
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      action.onClick(item);
                                    }}
                                  >
                                    {Icon && <Icon size={14} className="action-item-icon" />}
                                    <span>{action.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}

              {paginatedData.length === 0 && !isLoading && (
                <tr>
                  <td 
                    colSpan={columns.filter(c => visibleColumns.includes(c.key)).length + (enableSelection ? 1 : 0) + (rowActions ? 1 : 0)}
                    style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}
                  >
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{emptyMessage}</p>
                    {searchTerm && (
                      <button 
                        type="button"
                        onClick={() => setSearchTerm('')}
                        style={{ marginTop: 8, background: 'none', border: 'none', color: 'var(--gold-primary)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                      >
                        Clear search filter
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Standard Pagination Footer - rendered only if more than 20 records */}
        {totalItems > 20 && (
        <div className="catalog-pagination-bar">
          <div className="pagination-info">
            Showing <strong>{startItem}</strong> to <strong>{endItem}</strong> of <strong>{totalItems}</strong> {itemNoun}
          </div>

          <div className="pagination-pagesize">
            <span>Per page:</span>
            <select 
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              aria-label="Items per page"
            >
              {pageSizeOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div className="pagination-buttons" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button 
              type="button"
              className="btn-page-step"
              disabled={validCurrentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                height: 32,
                padding: '0 12px',
                borderRadius: 6,
                fontSize: 12.5,
                fontWeight: 600,
                color: validCurrentPage <= 1 ? '#94a3b8' : '#334155',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                cursor: validCurrentPage <= 1 ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
              }}
              onMouseEnter={(e) => {
                if (validCurrentPage > 1) {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.borderColor = '#94a3b8';
                  e.currentTarget.style.color = '#0f172a';
                }
              }}
              onMouseLeave={(e) => {
                if (validCurrentPage > 1) {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.color = '#334155';
                }
              }}
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
              <button
                key={pageNum}
                type="button"
                className={`btn-page-num ${pageNum === validCurrentPage ? 'active' : ''}`}
                onClick={() => setCurrentPage(pageNum)}
                style={{
                  minWidth: 32,
                  height: 32,
                  padding: '0 8px',
                  borderRadius: 6,
                  fontSize: 12.5,
                  fontWeight: pageNum === validCurrentPage ? 700 : 600,
                  color: pageNum === validCurrentPage ? '#ffffff' : '#334155',
                  background: pageNum === validCurrentPage ? '#0f172a' : '#ffffff',
                  border: pageNum === validCurrentPage ? '1px solid #0f172a' : '1px solid #cbd5e1',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                  boxShadow: pageNum === validCurrentPage ? '0 1px 3px rgba(0,0,0,0.15)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (pageNum !== validCurrentPage) {
                    e.currentTarget.style.background = '#f1f5f9';
                    e.currentTarget.style.color = '#0f172a';
                  }
                }}
                onMouseLeave={(e) => {
                  if (pageNum !== validCurrentPage) {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.color = '#334155';
                  }
                }}
              >
                {pageNum}
              </button>
            ))}

            <button 
              type="button"
              className="btn-page-step"
              disabled={validCurrentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                height: 32,
                padding: '0 12px',
                borderRadius: 6,
                fontSize: 12.5,
                fontWeight: 600,
                color: validCurrentPage >= totalPages ? '#94a3b8' : '#334155',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                cursor: validCurrentPage >= totalPages ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
              }}
              onMouseEnter={(e) => {
                if (validCurrentPage < totalPages) {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.borderColor = '#94a3b8';
                  e.currentTarget.style.color = '#0f172a';
                }
              }}
              onMouseLeave={(e) => {
                if (validCurrentPage < totalPages) {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.color = '#334155';
                }
              }}
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
