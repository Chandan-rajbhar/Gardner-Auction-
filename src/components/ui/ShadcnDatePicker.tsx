import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, X } from 'lucide-react';

export interface ShadcnDatePickerProps {
  value: string; // 'YYYY-MM-DD' or ''
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  align?: 'left' | 'right';
  showQuickYears?: boolean;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const ShadcnDatePicker: React.FC<ShadcnDatePickerProps> = ({
  value,
  onChange,
  placeholder = 'Select date',
  disabled = false,
  className = '',
  id,
  align = 'left',
  showQuickYears = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [placement, setPlacement] = useState<'top' | 'bottom'>('bottom');
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial view year/month from value or default to current date
  const initialDate = value ? new Date(value + 'T00:00:00') : new Date();
  const [viewYear, setViewYear] = useState<number>(
    isNaN(initialDate.getFullYear()) ? new Date().getFullYear() : initialDate.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState<number>(
    isNaN(initialDate.getMonth()) ? new Date().getMonth() : initialDate.getMonth()
  );

  // When value changes externally, update view
  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

  // Determine smart placement (open above if near bottom of screen/drawer)
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const popoverHeight = 330;
      const spaceBelow = window.innerHeight - rect.bottom;
      // If less than 340px below, place on top!
      if (spaceBelow < popoverHeight) {
        setPlacement('top');
      } else {
        setPlacement('bottom');
      }
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  // Format display text
  const formatDisplay = (val: string) => {
    if (!val) return '';
    try {
      const parts = val.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        const dateObj = new Date(y, m, d);
        return dateObj.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      }
    } catch {
      return val;
    }
    return val;
  };

  // Navigate months
  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  // Generate days in month grid
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sunday
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

  const handleSelectDay = (day: number) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const isoString = `${viewYear}-${mm}-${dd}`;
    onChange(isoString);
    setIsOpen(false);
  };

  const handleQuickAddYears = (years: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const base = value ? new Date(value + 'T00:00:00') : new Date();
    const newY = base.getFullYear() + years;
    const mm = String(base.getMonth() + 1).padStart(2, '0');
    const dd = String(base.getDate()).padStart(2, '0');
    const isoString = `${newY}-${mm}-${dd}`;
    onChange(isoString);
    setViewYear(newY);
    setViewMonth(base.getMonth());
    setIsOpen(false);
  };

  const handleSetToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
    setViewYear(yyyy);
    setViewMonth(today.getMonth());
    setIsOpen(false);
  };

  const handleSetYesterday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
    setViewYear(yyyy);
    setViewMonth(d.getMonth());
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  // Check if a day is today
  const today = new Date();
  const isToday = (day: number) => {
    return (
      today.getFullYear() === viewYear &&
      today.getMonth() === viewMonth &&
      today.getDate() === day
    );
  };

  // Check if a day is selected
  const isSelected = (day: number) => {
    if (!value) return false;
    const [y, m, d] = value.split('-').map(Number);
    return y === viewYear && m === viewMonth + 1 && d === day;
  };

  // Year choices for quick selection (current year - 5 to + 15)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 25 }, (_, i) => currentYear - 5 + i);

  return (
    <div 
      ref={containerRef} 
      className={`shadcn-date-picker-root ${className}`}
      style={{ position: 'relative', width: '100%' }}
      id={id}
    >
      <style>{`
        .shadcn-dp-trigger {
          width: 100%;
          height: 38px;
          min-height: 38px;
          padding: 0 12px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background-color: #ffffff;
          color: #0f172a;
          font-size: 13px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          transition: all 0.15s ease;
          box-sizing: border-box;
          outline: none;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
        }
        .shadcn-dp-trigger:hover {
          border-color: #94a3b8;
          background-color: #fdfbf7;
        }
        .shadcn-dp-trigger:focus, .shadcn-dp-trigger.is-open {
          background-color: #ffffff;
          border-color: var(--ecomm-primary-gold, #c59b27);
          box-shadow: 0 0 0 3px rgba(197, 155, 39, 0.16);
        }
        .shadcn-dp-popover {
          position: absolute;
          z-index: 99999 !important;
          width: 295px;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          box-shadow: 0 16px 36px -6px rgba(15, 23, 42, 0.22), 0 4px 12px rgba(15, 23, 42, 0.08);
          padding: 12px;
          animation: dpFadeIn 0.15s ease-out;
          user-select: none;
        }
        .shadcn-dp-popover.place-top.align-right {
          bottom: calc(100% + 6px);
          right: 0;
          left: auto;
        }
        .shadcn-dp-popover.place-bottom.align-right {
          top: calc(100% + 6px);
          right: 0;
          left: auto;
        }
        .shadcn-dp-popover.place-top.align-left {
          bottom: calc(100% + 6px);
          left: 0;
          right: auto;
        }
        .shadcn-dp-popover.place-bottom.align-left {
          top: calc(100% + 6px);
          left: 0;
          right: auto;
        }
        @keyframes dpFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .shadcn-dp-day-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          border: none;
          background: transparent;
          font-size: 12px;
          font-weight: 500;
          color: #0f172a;
          cursor: pointer;
          transition: all 0.12s ease;
        }
        .shadcn-dp-day-btn:hover:not(.is-selected) {
          background-color: #f1f5f9;
        }
        .shadcn-dp-day-btn.is-selected {
          background-color: #0f172a !important;
          color: #ffffff !important;
          font-weight: 700;
        }
        .shadcn-dp-day-btn.is-today:not(.is-selected) {
          border: 1px solid #0f172a;
          font-weight: 700;
        }
        .shadcn-dp-day-outside {
          color: #cbd5e1;
          cursor: default;
        }
        .shadcn-dp-quick-chip {
          font-size: 11px;
          font-weight: 600;
          padding: 3px 7px;
          border-radius: 4px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #475569;
          cursor: pointer;
          transition: all 0.12s ease;
        }
        .shadcn-dp-quick-chip:hover {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
        }
      `}</style>

      {/* Trigger Button */}
      <button
        type="button"
        className={`shadcn-dp-trigger ${isOpen ? 'is-open' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
          <CalendarIcon size={15} style={{ color: value ? '#0f172a' : '#94a3b8', flexShrink: 0 }} />
          {value ? (
            <span style={{ fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' }}>{formatDisplay(value)}</span>
          ) : (
            <span style={{ color: '#94a3b8', whiteSpace: 'nowrap' }}>{placeholder}</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {value && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              title="Clear date"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 18,
                height: 18,
                borderRadius: '50%',
                color: '#94a3b8',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#0f172a';
                e.currentTarget.style.backgroundColor = '#f1f5f9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#94a3b8';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <X size={12} />
            </span>
          )}
          <ChevronDown 
            size={14} 
            style={{ 
              color: '#94a3b8', 
              transition: 'transform 0.15s ease',
              transform: isOpen ? 'rotate(180deg)' : 'none' 
            }} 
          />
        </div>
      </button>

      {/* Popover Calendar Dropdown (Opens Above/Below Smartly, Never Cut Off) */}
      {isOpen && (
        <div 
          className={`shadcn-dp-popover place-${placement} align-${align}`} 
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with Month/Year Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* Month selector */}
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  borderRadius: 5,
                  padding: '3px 6px',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={name} value={i}>{name}</option>
                ))}
              </select>

              {/* Year selector */}
              <select
                value={viewYear}
                onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  borderRadius: 5,
                  padding: '3px 6px',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                {yearOptions.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <button
                type="button"
                onClick={handlePrevMonth}
                style={{
                  width: 26,
                  height: 26,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 4,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  cursor: 'pointer'
                }}
                title="Previous Month"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                style={{
                  width: 26,
                  height: 26,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 4,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  cursor: 'pointer'
                }}
                title="Next Month"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Day Names Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, textAlign: 'center', marginBottom: 5 }}>
            {DAY_NAMES.map(name => (
              <span key={name} style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b' }}>
                {name}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {/* Previous month filler days */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => {
              const dayNum = prevMonthDays - firstDayOfWeek + i + 1;
              return (
                <div key={`prev-${i}`} className="shadcn-dp-day-btn shadcn-dp-day-outside">
                  {dayNum}
                </div>
              );
            })}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const selected = isSelected(day);
              const todayMark = isToday(day);

              return (
                <button
                  type="button"
                  key={`cur-${day}`}
                  className={`shadcn-dp-day-btn ${selected ? 'is-selected' : ''} ${todayMark ? 'is-today' : ''}`}
                  onClick={() => handleSelectDay(day)}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Quick Shortcuts */}
          <div style={{
            marginTop: 10,
            paddingTop: 8,
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 5
          }}>
            {showQuickYears ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Jump:</span>
                <button
                  type="button"
                  className="shadcn-dp-quick-chip"
                  onClick={(e) => handleQuickAddYears(1, e)}
                  title="Expires in 1 year"
                >
                  +1 Yr
                </button>
                <button
                  type="button"
                  className="shadcn-dp-quick-chip"
                  onClick={(e) => handleQuickAddYears(2, e)}
                  title="Expires in 2 years"
                >
                  +2 Yrs
                </button>
                <button
                  type="button"
                  className="shadcn-dp-quick-chip"
                  onClick={(e) => handleQuickAddYears(3, e)}
                  title="Expires in 3 years"
                >
                  +3 Yrs
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                  type="button"
                  className="shadcn-dp-quick-chip"
                  onClick={handleSetToday}
                  title="Select Today"
                >
                  Today
                </button>
                <button
                  type="button"
                  className="shadcn-dp-quick-chip"
                  onClick={handleSetYesterday}
                  title="Select Yesterday"
                >
                  Yesterday
                </button>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {showQuickYears && (
                <button
                  type="button"
                  onClick={handleSetToday}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#0f172a',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px 4px'
                  }}
                >
                  Today
                </button>
              )}
              <button
                type="button"
                onClick={handleClear}
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: '#94a3b8',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px 4px'
                }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
