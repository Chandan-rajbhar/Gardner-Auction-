import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { ShadcnSelect } from './ShadcnSelect';

export interface ShadcnPaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  showPageSizeSelector?: boolean;
  className?: string;
  itemLabel?: string;
}

export const ShadcnPagination: React.FC<ShadcnPaginationProps> = ({
  currentPage,
  totalItems,
  pageSize = 20,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  showPageSizeSelector = true,
  className = '',
  itemLabel = 'entries'
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIndex = Math.min(safePage * pageSize, totalItems);

  // Generate page numbers to show (e.g. 1, 2, 3 ... with ellipses when large)
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | 'ellipsis')[] = [1];

    if (safePage > 3) {
      pages.push('ellipsis');
    }

    const start = Math.max(2, safePage - 1);
    const end = Math.min(totalPages - 1, safePage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (safePage < totalPages - 2) {
      pages.push('ellipsis');
    }

    pages.push(totalPages);
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div
      className={`shadcn-pagination-container ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        paddingTop: 12,
        fontSize: 12.5,
        color: '#64748b'
      }}
    >
      {/* Left: Summary & Page Size */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        {showPageSizeSelector && onPageSizeChange && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span>Show</span>
            <ShadcnSelect
              value={String(pageSize)}
              onChange={(val) => {
                onPageSizeChange(Number(val));
                onPageChange(1);
              }}
              size="sm"
              className="w-[72px]"
              options={pageSizeOptions.map((opt) => ({
                value: String(opt),
                label: String(opt)
              }))}
            />
            <span>{itemLabel}</span>
          </div>
        )}

        <div style={{ color: '#475569', fontWeight: 500 }}>
          {totalItems === 0 ? (
            <span>No {itemLabel} found</span>
          ) : (
            <span>
              Showing <strong style={{ color: '#0f172a' }}>{startIndex}</strong> to{' '}
              <strong style={{ color: '#0f172a' }}>{endIndex}</strong> of{' '}
              <strong style={{ color: '#0f172a' }}>{totalItems}</strong> {itemLabel}
            </span>
          )}
        </div>
      </div>

      {/* Right: Controls */}
      {totalPages > 1 && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {/* Previous Button */}
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => onPageChange(safePage - 1)}
            aria-label="Previous Page"
            style={{
              height: 32,
              padding: '0 10px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              background: safePage <= 1 ? '#f8fafc' : '#ffffff',
              color: safePage <= 1 ? '#94a3b8' : '#1e293b',
              cursor: safePage <= 1 ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              fontWeight: 600,
              transition: 'all 0.12s ease'
            }}
          >
            <ChevronLeft size={14} />
            <span>Prev</span>
          </button>

          {/* Numbered Buttons */}
          {pageNumbers.map((p, idx) => {
            if (p === 'ellipsis') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  style={{
                    padding: '0 4px',
                    color: '#94a3b8',
                    userSelect: 'none'
                  }}
                >
                  …
                </span>
              );
            }

            const isActive = p === safePage;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                style={{
                  minWidth: 32,
                  height: 32,
                  padding: '0 8px',
                  borderRadius: 6,
                  border: '1px solid',
                  borderColor: isActive ? '#0f172a' : '#cbd5e1',
                  background: isActive ? '#0f172a' : '#ffffff',
                  color: isActive ? '#ffffff' : '#334155',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: 12,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.12s ease'
                }}
              >
                {p}
              </button>
            );
          })}

          {/* Next Button */}
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => onPageChange(safePage + 1)}
            aria-label="Next Page"
            style={{
              height: 32,
              padding: '0 10px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              background: safePage >= totalPages ? '#f8fafc' : '#ffffff',
              color: safePage >= totalPages ? '#94a3b8' : '#1e293b',
              cursor: safePage >= totalPages ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              fontWeight: 600,
              transition: 'all 0.12s ease'
            }}
          >
            <span>Next</span>
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
