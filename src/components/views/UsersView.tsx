import React, { useState } from 'react';
import { UserBidder } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { 
  Search, 
  UserCheck, 
  ShieldAlert, 
  ShieldCheck, 
  CreditCard, 
  Plus, 
  SlidersHorizontal,
  Mail,
  Phone,
  Building,
  CheckCircle,
  X
} from 'lucide-react';

interface UsersViewProps {
  users: UserBidder[];
  onUpdateUser: (user: UserBidder) => void;
  onAddUser: (user: UserBidder) => void;
}

export const UsersView: React.FC<UsersViewProps> = ({
  users,
  onUpdateUser,
  onAddUser
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserBidder | null>(null);
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);

  // New user form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newLimit, setNewLimit] = useState('100000');
  const [newOrigin, setNewOrigin] = useState('Floor Walk-in');

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.paddleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.company && u.company.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    const matchesType = typeFilter === 'all' || u.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const handleVerify = (user: UserBidder) => {
    const newPaddle = user.paddleNumber === 'Pending' ? `${Math.floor(100 + Math.random() * 899)}` : user.paddleNumber;
    const updated: UserBidder = {
      ...user,
      status: 'verified',
      paddleNumber: newPaddle,
      creditCardAuthorized: true
    };
    onUpdateUser(updated);
    if (selectedUser?.id === user.id) {
      setSelectedUser(updated);
    }
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail) return;

    const created: UserBidder = {
      id: `usr-${Date.now()}`,
      paddleNumber: `${Math.floor(200 + Math.random() * 700)}`,
      name: newName,
      email: newEmail,
      phone: newPhone || '(406) 555-0100',
      company: newCompany,
      siteOrigin: newOrigin,
      registrationDate: new Date().toISOString().split('T')[0],
      status: 'verified',
      creditCardAuthorized: true,
      cardLast4: '4488',
      bidLimit: parseFloat(newLimit) || 100000,
      totalBidsPlaced: 0,
      lotsWon: 0,
      totalSpent: 0,
      type: 'bidder',
      address: '1960 Saleroom Guest Desk',
      cityStateZip: 'Missoula, MT 59801',
      notes: 'Registered on-site at Gardner saleroom clerking desk.'
    };

    onAddUser(created);
    setIsNewUserModalOpen(false);
    setNewName('');
    setNewEmail('');
    setNewPhone('');
    setNewCompany('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header & Controls */}
      <div className="card-header-flex">
        <div>
          <h2 className="font-serif" style={{ fontSize: 22, color: 'var(--text-main)' }}>
            Bidder & Consignor Registry
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Paddle management, credit card verifications, and AF360 synchronized bidder limits
          </p>
        </div>

        <button 
          className="btn btn-gold"
          onClick={() => setIsNewUserModalOpen(true)}
        >
          <Plus size={16} />
          <span>Register Saleroom Bidder</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', background: 'var(--bg-card)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
        <div className="input-search-wrapper" style={{ flex: 1, minWidth: 240 }}>
          <Search size={16} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search by name, paddle #, email, or firm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ background: 'var(--bg-darkest)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: 13 }}
          >
            <option value="all">All Statuses</option>
            <option value="verified">Verified</option>
            <option value="vip">VIP Bidders</option>
            <option value="pending_verification">Pending Verification</option>
          </select>

          <select 
            value={typeFilter} 
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ background: 'var(--bg-darkest)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: 13 }}
          >
            <option value="all">All Roles</option>
            <option value="bidder">Bidders</option>
            <option value="consignor">Consignors</option>
            <option value="both">Bidder & Consignor</option>
          </select>
        </div>
      </div>

      {/* User Table */}
      <div className="table-wrapper">
        <table className="luxury-table">
          <thead>
            <tr>
              <th>Paddle #</th>
              <th>Bidder Name & Company</th>
              <th>Origin Portal</th>
              <th>Registered</th>
              <th>Credit Card Status</th>
              <th style={{ textAlign: 'right' }}>Bid Ceiling</th>
              <th style={{ textAlign: 'right' }}>Total Won</th>
              <th>Status</th>
              <th style={{ textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id}>
                <td>
                  <span style={{ 
                    fontFamily: 'var(--font-mono)', 
                    fontWeight: 700, 
                    color: user.paddleNumber === 'Pending' ? '#f59e0b' : 'var(--gold-primary)',
                    background: 'rgba(212, 175, 55, 0.08)',
                    padding: '3px 8px',
                    borderRadius: 4
                  }}>
                    {user.paddleNumber === 'Pending' ? 'PENDING' : `#${user.paddleNumber}`}
                  </span>
                </td>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{user.name}</div>
                  {user.company && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Building size={11} /> {user.company}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{user.email}</div>
                </td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {user.siteOrigin}
                </td>
                <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                  {formatDate(user.registrationDate)}
                </td>
                <td>
                  {user.creditCardAuthorized ? (
                    <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500 }}>
                      <ShieldCheck size={14} /> Authorized (••{user.cardLast4})
                    </span>
                  ) : (
                    <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                      <ShieldAlert size={14} /> No Card on File
                    </span>
                  )}
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  {formatCurrency(user.bidLimit)}
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--gold-light)' }}>
                  {formatCurrency(user.totalSpent)}
                </td>
                <td>
                  <span className={`badge badge-${user.status === 'vip' ? 'gold' : user.status === 'verified' ? 'live' : 'pending'}`}>
                    {user.status}
                  </span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button 
                    className="btn btn-secondary"
                    style={{ fontSize: 11, padding: '4px 10px' }}
                    onClick={() => setSelectedUser(user)}
                  >
                    Manage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* User Detail & Verification Modal */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="font-serif">Bidder Profile & AF360 Authorization</h3>
              <button className="icon-btn" onClick={() => setSelectedUser(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'var(--bg-darkest)', padding: 16, borderRadius: 8 }}>
                <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'var(--gold-gradient)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20 }}>
                  {selectedUser.name.charAt(0)}
                </div>
                <div>
                  <h4 style={{ fontSize: 18, color: 'var(--text-main)', fontWeight: 700 }}>{selectedUser.name}</h4>
                  <p style={{ fontSize: 12, color: 'var(--gold-primary)' }}>Paddle #{selectedUser.paddleNumber} • {selectedUser.type.toUpperCase()}</p>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <span className={`badge badge-${selectedUser.status === 'vip' ? 'gold' : selectedUser.status === 'verified' ? 'live' : 'pending'}`}>
                    {selectedUser.status}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="text" readOnly value={selectedUser.email} />
                </div>
                <div className="form-group">
                  <label>Telephone</label>
                  <input type="text" readOnly value={selectedUser.phone} />
                </div>
                <div className="form-group">
                  <label>Organization / Firm</label>
                  <input type="text" readOnly value={selectedUser.company || 'Private Collector'} />
                </div>
                <div className="form-group">
                  <label>Registered Origin</label>
                  <input type="text" readOnly value={selectedUser.siteOrigin} />
                </div>
              </div>

              <div className="form-group">
                <label>Saleroom Bid Limit Ceiling</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input 
                    type="number" 
                    value={selectedUser.bidLimit}
                    onChange={(e) => {
                      const updated = { ...selectedUser, bidLimit: parseFloat(e.target.value) || 0 };
                      setSelectedUser(updated);
                      onUpdateUser(updated);
                    }}
                  />
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => {
                      const updated = { ...selectedUser, bidLimit: selectedUser.bidLimit + 50000 };
                      setSelectedUser(updated);
                      onUpdateUser(updated);
                    }}
                  >
                    +$50k
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Admin Notes & Bank References</label>
                <textarea 
                  rows={2} 
                  value={selectedUser.notes}
                  onChange={(e) => {
                    const updated = { ...selectedUser, notes: e.target.value };
                    setSelectedUser(updated);
                    onUpdateUser(updated);
                  }}
                />
              </div>

              {selectedUser.status === 'pending_verification' && (
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: 14, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#fbbf24', fontSize: 13 }}>Pending Verification</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Approve identity and generate active paddle number.</div>
                  </div>
                  <button className="btn btn-gold" onClick={() => handleVerify(selectedUser)}>
                    <CheckCircle size={14} />
                    <span>Approve & Assign Paddle</span>
                  </button>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedUser(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Bidder Modal */}
      {isNewUserModalOpen && (
        <div className="modal-overlay" onClick={() => setIsNewUserModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleCreateUser}>
              <div className="modal-header">
                <h3 className="font-serif">Register Saleroom Bidder</h3>
                <button type="button" className="icon-btn" onClick={() => setIsNewUserModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Robert Montgomery"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Email Address *</label>
                  <input 
                    type="email" 
                    required 
                    placeholder="e.g. r.montgomery@vault.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input 
                      type="text" 
                      placeholder="(406) 555-0199"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Company / Firm (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="Montgomery Holdings"
                      value={newCompany}
                      onChange={(e) => setNewCompany(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label>Initial Bid Limit ($)</label>
                    <input 
                      type="number" 
                      value={newLimit}
                      onChange={(e) => setNewLimit(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Registration Node</label>
                    <select value={newOrigin} onChange={(e) => setNewOrigin(e.target.value)}>
                      <option value="Floor Walk-in">Floor Saleroom Walk-in</option>
                      <option value="Telephone Desk">Telephone Bidding Desk</option>
                      <option value="gardner-auction.com (Direct)">Direct Website</option>
                      <option value="HiBid Network">HiBid AF360 Portal</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsNewUserModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-gold">
                  Issue Paddle & Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
