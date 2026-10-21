import React, { useState } from 'react';
import { ActivityLog } from '../../types';
import { Search, Bell, Shield, Filter, RefreshCw } from 'lucide-react';

interface LogsViewProps {
  logs: ActivityLog[];
  onClearLogs?: () => void;
}

export const LogsView: React.FC<LogsViewProps> = ({ logs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filteredLogs = logs.filter(l => {
    const matchesSearch = 
      l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.adminUser.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.details.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = categoryFilter === 'all' || l.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div className="card-header-flex">
        <div>
          <h2 className="font-serif" style={{ fontSize: 22, color: 'var(--text-main)' }}>
            Administrative Audit & Activity Log
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Immutable administrative event timeline, clerking records, and HiBid API synchronization events
          </p>
        </div>

        <span style={{ fontSize: 12, color: 'var(--text-dim)', background: 'var(--bg-darkest)', padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
          System Audit Integrity: <strong>VERIFIED</strong>
        </span>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', background: 'var(--bg-card)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
        <div className="input-search-wrapper" style={{ flex: 1, minWidth: 240 }}>
          <Search size={16} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search action, clerk, event details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select 
          value={categoryFilter} 
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ background: 'var(--bg-darkest)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: 13 }}
        >
          <option value="all">All Categories</option>
          <option value="Clerking">Clerking</option>
          <option value="HiBid Sync">HiBid Sync</option>
          <option value="Bidder">Bidder</option>
          <option value="Settlement">Settlement</option>
          <option value="Lot">Lot Catalog</option>
          <option value="Auction">Auction</option>
        </select>
      </div>

      {/* Log Table */}
      <div className="table-wrapper">
        <table className="luxury-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Operator / Service</th>
              <th>Category</th>
              <th>Event Action</th>
              <th>Audit Details</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map(log => (
              <tr key={log.id}>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)' }}>
                  {log.timestamp}
                </td>
                <td style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 13 }}>
                  {log.adminUser}
                </td>
                <td>
                  <span className="badge badge-gold" style={{ fontSize: 10 }}>
                    {log.category}
                  </span>
                </td>
                <td style={{ fontWeight: 600, color: 'var(--gold-light)' }}>
                  {log.action}
                </td>
                <td style={{ fontSize: 12.5, color: 'var(--text-muted)', maxWidth: 450, whiteSpace: 'normal' }}>
                  {log.details}
                </td>
                <td>
                  <span className={`badge badge-${log.severity === 'success' ? 'live' : log.severity === 'warning' ? 'gold' : log.severity === 'alert' ? 'danger' : 'preview'}`}>
                    {log.severity}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
