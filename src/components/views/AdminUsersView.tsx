import React, { useState, useMemo, useEffect } from 'react';
import { AdminUserRecord } from '../../types';
import { supabase, supabaseAdmin } from '../../lib/supabase';
import { deleteAdminFromDb, updateAdminInDb } from '../../services/adminActionService';
import { useAuth } from '../../context/AuthContext';
import { RowActionMenu } from '../ui/RowActionMenu';
import { DeleteConfirmModal } from '../ui/DeleteConfirmModal';
import { 
  Search, 
  ShieldCheck, 
  Building,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Loader2,
  Shield,
  Crown,
  Gavel,
  Pencil,
  Trash2,
  CheckCircle,
  Save,
  AlertCircle
} from 'lucide-react';

const INITIAL_ADMIN_USERS: AdminUserRecord[] = [
  {
    id: 'admin-001',
    fullName: 'Chandan Rajbhar',
    email: 'admin@gardner-auction.com',
    phone: '(406) 555-0100',
    role: 'super_admin',
    title: 'Master Auctioneer & Executive Admin',
    department: 'Executive Management',
    status: 'active',
    createdAt: '2024-01-15T09:00:00Z',
    updatedAt: '2026-10-23T11:00:00Z'
  },
  {
    id: 'admin-002',
    fullName: 'Arthur Kensington',
    email: 'arthur.k@gardner-auction.com',
    phone: '(406) 555-0192',
    role: 'admin',
    title: 'Saleroom Operations Administrator',
    department: 'Saleroom Operations',
    status: 'active',
    createdAt: '2024-03-10T14:30:00Z',
    updatedAt: '2026-10-23T11:00:00Z'
  },
  {
    id: 'admin-003',
    fullName: 'David Sterling',
    email: 'david.clerk@gardner-auction.com',
    phone: '(406) 555-0144',
    role: 'clerk',
    title: 'Chief Rostrum Clerking Official',
    department: 'Auction Day Clerking',
    status: 'active',
    createdAt: '2024-06-01T10:15:00Z',
    updatedAt: '2026-10-23T11:00:00Z'
  },
  {
    id: 'admin-004',
    fullName: 'Elena Rostova',
    email: 'elena.consign@gardner-auction.com',
    phone: '(406) 555-0188',
    role: 'consignor_manager',
    title: 'Consignor Relations & Intake Manager',
    department: 'Consignment Operations',
    status: 'active',
    createdAt: '2024-07-15T16:45:00Z',
    updatedAt: '2026-10-23T11:00:00Z'
  }
];

type SortField = 'fullName' | 'email' | 'department' | 'createdAt';
type SortDirection = 'asc' | 'desc';

export const AdminUsersView: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [adminUsers, setAdminUsers] = useState<AdminUserRecord[]>(INITIAL_ADMIN_USERS);
  const [searchTerm, setSearchTerm] = useState('');

  // Sorting
  const [sortField, setSortField] = useState<SortField | null>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Supabase state
  const [isLoadingDb, setIsLoadingDb] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Edit Admin State & Modal
  const [editingAdmin, setEditingAdmin] = useState<AdminUserRecord | null>(null);
  const [isEditAdminModalOpen, setIsEditAdminModalOpen] = useState(false);
  const [isSavingAdmin, setIsSavingAdmin] = useState(false);
  const [editAdminError, setEditAdminError] = useState<string | null>(null);

  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editRole, setEditRole] = useState<AdminUserRecord['role']>('admin');
  const [editStatus, setEditStatus] = useState<AdminUserRecord['status']>('active');

  // Delete Admin State & Modal
  const [adminToDelete, setAdminToDelete] = useState<AdminUserRecord | null>(null);
  const [isDeletingAdmin, setIsDeletingAdmin] = useState(false);
  const [deleteAdminError, setDeleteAdminError] = useState<string | null>(null);

  // 1. Fetch live admin users from public.admin_users
  const fetchSupabaseAdmins = async () => {
    setIsLoadingDb(true);
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[AdminUsersView] Notice fetching from public.admin_users:', error.message);
        return;
      }

      if (data && data.length > 0) {
        const mapped: AdminUserRecord[] = data.map((row: any) => ({
          id: row.id,
          authId: row.auth_id || undefined,
          fullName: row.full_name || 'Administrator',
          email: row.email || '',
          phone: row.phone || '',
          role: row.role || 'admin',
          title: row.title || 'Saleroom Administrator',
          department: row.department || 'Operations',
          avatarUrl: row.avatar_url || undefined,
          status: row.status || 'active',
          permissions: row.permissions || undefined,
          lastLoginAt: row.last_login_at || undefined,
          createdAt: row.created_at || new Date().toISOString(),
          updatedAt: row.updated_at || new Date().toISOString()
        }));
        setAdminUsers(mapped);
      }
    } catch (err) {
      console.warn('[AdminUsersView] Exception querying admin_users:', err);
    } finally {
      setIsLoadingDb(false);
    }
  };

  useEffect(() => {
    fetchSupabaseAdmins();

    // Set up Realtime subscription to public.admin_users
    const channel = supabase
      .channel('public:admin_users_feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_users' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const row = payload.new as any;
          const newRec: AdminUserRecord = {
            id: row.id,
            authId: row.auth_id || undefined,
            fullName: row.full_name || 'Administrator',
            email: row.email || '',
            phone: row.phone || '',
            role: row.role || 'admin',
            title: row.title || 'Saleroom Administrator',
            department: row.department || 'Operations',
            avatarUrl: row.avatar_url || undefined,
            status: row.status || 'active',
            permissions: row.permissions || undefined,
            lastLoginAt: row.last_login_at || undefined,
            createdAt: row.created_at || new Date().toISOString(),
            updatedAt: row.updated_at || new Date().toISOString()
          };
          setAdminUsers(prev => [newRec, ...prev.filter(a => a.id !== newRec.id)]);
        } else if (payload.eventType === 'UPDATE') {
          const row = payload.new as any;
          setAdminUsers(prev => prev.map(a => a.id === row.id ? {
            ...a,
            fullName: row.full_name || a.fullName,
            email: row.email || a.email,
            phone: row.phone || a.phone,
            role: row.role || a.role,
            title: row.title || a.title,
            department: row.department || a.department,
            status: row.status || a.status,
            permissions: row.permissions || a.permissions,
            updatedAt: row.updated_at || new Date().toISOString()
          } : a));
        } else if (payload.eventType === 'DELETE') {
          setAdminUsers(prev => prev.filter(a => a.id !== (payload.old as any).id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filtered & Sorted Admins
  const filteredAdmins = useMemo(() => {
    return adminUsers.filter(admin => {
      const q = searchTerm.toLowerCase().trim();
      return !q || (
        admin.fullName.toLowerCase().includes(q) ||
        admin.email.toLowerCase().includes(q) ||
        (admin.phone && admin.phone.toLowerCase().includes(q)) ||
        admin.role.toLowerCase().includes(q) ||
        admin.title.toLowerCase().includes(q) ||
        admin.department.toLowerCase().includes(q)
      );
    });
  }, [adminUsers, searchTerm]);

  const sortedAdmins = useMemo(() => {
    if (!sortField) return filteredAdmins;
    return [...filteredAdmins].sort((a, b) => {
      const aVal = (a[sortField] || '').toString().toLowerCase();
      const bVal = (b[sortField] || '').toString().toLowerCase();
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredAdmins, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown size={12} style={{ opacity: 0.35, marginLeft: 4 }} />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp size={13} style={{ color: 'var(--gold-primary, #d4af37)', marginLeft: 4 }} />
      : <ArrowDown size={13} style={{ color: 'var(--gold-primary, #d4af37)', marginLeft: 4 }} />;
  };

  const getInitials = (name: string): string => {
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase() || 'AD';
  };

  const renderRoleBadge = (role: AdminUserRecord['role']) => {
    switch (role) {
      case 'super_admin':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 11,
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: 4,
            background: 'rgba(212, 175, 55, 0.12)',
            color: 'var(--gold-primary, #b48324)',
            border: '1px solid rgba(212, 175, 55, 0.3)'
          }}>
            <Crown size={12} />
            <span>Super Admin</span>
          </span>
        );
      case 'admin':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 11,
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: 4,
            background: '#e0f2fe',
            color: '#0284c7',
            border: '1px solid #bae6fd'
          }}>
            <Shield size={12} />
            <span>Admin</span>
          </span>
        );
      case 'clerk':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 11,
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: 4,
            background: '#f3e8ff',
            color: '#7e22ce',
            border: '1px solid #e9d5ff'
          }}>
            <Gavel size={12} />
            <span>Clerk</span>
          </span>
        );
      case 'consignor_manager':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 11,
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: 4,
            background: '#ccfbf1',
            color: '#0f766e',
            border: '1px solid #99f6e4'
          }}>
            <Building size={12} />
            <span>Consignor Mgr</span>
          </span>
        );
      default:
        return (
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            padding: '3px 8px',
            borderRadius: 4,
            background: '#f1f5f9',
            color: '#475569'
          }}>
            Operator
          </span>
        );
    }
  };

  // Open Edit Admin Modal with prefilled values
  const handleOpenEditAdmin = (admin: AdminUserRecord) => {
    setEditingAdmin(admin);
    setEditFullName(admin.fullName);
    setEditEmail(admin.email);
    setEditPhone(admin.phone || '');
    setEditTitle(admin.title);
    setEditDepartment(admin.department);
    setEditRole(admin.role);
    setEditStatus(admin.status);
    setEditAdminError(null);
    setIsEditAdminModalOpen(true);
  };

  // Save changes to Supabase public.admin_users
  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;

    if (!editFullName.trim() || !editEmail.trim()) {
      setEditAdminError('Full Name and Email Address are required.');
      return;
    }

    setIsSavingAdmin(true);
    setEditAdminError(null);

    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(editingAdmin.id);
      const targetId = isUUID ? editingAdmin.id : crypto.randomUUID();

      const updatePayload = {
        id: targetId,
        full_name: editFullName.trim(),
        email: editEmail.trim().toLowerCase(),
        phone: editPhone.trim() || null,
        title: editTitle.trim() || 'Saleroom Administrator',
        department: editDepartment.trim() || 'Operations',
        role: editRole,
        status: editStatus,
        updated_at: new Date().toISOString()
      };

      const updateRes = await updateAdminInDb(targetId, updatePayload);
      if (!updateRes.success && updateRes.error) {
        throw new Error(updateRes.error);
      }

      // Also update matching profile in public.users if present
      try {
        const client = supabaseAdmin || supabase;
        await client
          .from('users')
          .update({
            full_name: editFullName.trim(),
            email: editEmail.trim().toLowerCase(),
            role: editRole,
            phone: editPhone.trim() || null,
            title: editTitle.trim() || undefined,
            updated_at: new Date().toISOString()
          })
          .eq('email', editingAdmin.email.toLowerCase());
      } catch (_) {}

      // Update local state
      setAdminUsers(prev => prev.map(a => a.id === editingAdmin.id ? {
        ...a,
        id: targetId,
        fullName: editFullName.trim(),
        email: editEmail.trim().toLowerCase(),
        phone: editPhone.trim() || undefined,
        title: editTitle.trim() || a.title,
        department: editDepartment.trim() || a.department,
        role: editRole,
        status: editStatus,
        updatedAt: new Date().toISOString()
      } : a));

      setActionSuccessMessage(`Administrator "${editFullName}" updated successfully in Supabase.`);
      setTimeout(() => setActionSuccessMessage(null), 4000);
      setIsEditAdminModalOpen(false);
      setEditingAdmin(null);
      fetchSupabaseAdmins();
    } catch (err: any) {
      setEditAdminError(err?.message || 'Failed to update administrator in Supabase.');
    } finally {
      setIsSavingAdmin(false);
    }
  };

  // Delete Admin with security rules and confirmation
  const handleDeleteAdmin = async () => {
    if (!adminToDelete) return;
    setDeleteAdminError(null);

    // Security Check 1: Never allow currently logged-in Super Admin to delete their own account
    const isSelf = 
      (currentUser && adminToDelete.authId && currentUser.id === adminToDelete.authId) ||
      (currentUser && adminToDelete.email && currentUser.email?.toLowerCase() === adminToDelete.email.toLowerCase()) ||
      (currentUser && (currentUser as any).dbId && (currentUser as any).dbId === adminToDelete.id);

    if (isSelf) {
      setDeleteAdminError('Security Restriction: You cannot delete your own active administrator account.');
      return;
    }

    // Security Check 2: Prevent deletion or deactivation of the last active Super Admin
    if (adminToDelete.role === 'super_admin') {
      const remainingActiveSuperAdmins = adminUsers.filter(
        a => a.role === 'super_admin' && a.status === 'active' && a.id !== adminToDelete.id
      );
      if (remainingActiveSuperAdmins.length === 0) {
        setDeleteAdminError('Security Restriction: Cannot delete the last active Super Admin. At least one active Super Admin must remain in the platform.');
        return;
      }
    }

    setIsDeletingAdmin(true);
    try {
      const delRes = await deleteAdminFromDb(adminToDelete.id, adminToDelete.email);
      if (!delRes.success && delRes.error) {
        throw new Error(delRes.error);
      }

      setAdminUsers(prev => prev.filter(a => a.id !== adminToDelete.id));
      setActionSuccessMessage(`Administrator "${adminToDelete.fullName}" was deleted from Supabase.`);
      setTimeout(() => setActionSuccessMessage(null), 4000);
      setAdminToDelete(null);
      fetchSupabaseAdmins();
    } catch (err: any) {
      setDeleteAdminError(err?.message || 'Failed to delete administrator record.');
    } finally {
      setIsDeletingAdmin(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Header */}
      <div className="card-header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 className="font-serif" style={{ fontSize: 22, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>Admins</span>
            {isLoadingDb && <Loader2 size={16} className="animate-spin" style={{ color: 'var(--gold-primary)' }} />}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Registered executive operators, clerking officials, and platform administrators
          </p>
        </div>
      </div>

      {/* Success Alert Banner */}
      {actionSuccessMessage && (
        <div style={{
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          color: '#065f46',
          padding: '12px 18px',
          borderRadius: 'var(--radius-md)',
          fontSize: 13,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
        }}>
          <CheckCircle size={16} />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* Search Bar & Controls */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', background: 'var(--bg-card)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
        <div className="input-search-wrapper" style={{ flex: 1, minWidth: 260 }}>
          <Search size={16} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search by administrator name, email, phone, or title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button 
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 11px' }}
            onClick={fetchSupabaseAdmins}
            title="Refresh from Supabase public.admin_users"
          >
            <RefreshCw size={12} className={isLoadingDb ? 'animate-spin' : ''} />
            <span>Sync Supabase</span>
          </button>

          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            Showing <strong>{sortedAdmins.length}</strong> administrators
          </span>
        </div>
      </div>

      {/* Admin Users Table */}
      <div className="table-wrapper" style={{ overflowX: 'auto', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
        <table className="luxury-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th 
                onClick={() => handleSort('fullName')} 
                style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                title="Sort by Full Name"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span>Administrator</span>
                  {renderSortIcon('fullName')}
                </div>
              </th>

              <th 
                onClick={() => handleSort('email')} 
                style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                title="Sort by Email"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span>Email</span>
                  {renderSortIcon('email')}
                </div>
              </th>

              <th style={{ whiteSpace: 'nowrap' }}>
                <span>Phone</span>
              </th>

              <th 
                onClick={() => handleSort('department')} 
                style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                title="Sort by Department"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span>Title & Department</span>
                  {renderSortIcon('department')}
                </div>
              </th>

              <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedAdmins.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
                  No administrator records found matching your filters.
                </td>
              </tr>
            ) : (
              sortedAdmins.map(admin => {
                const initials = getInitials(admin.fullName);

                return (
                  <tr key={admin.id}>
                    {/* 1. Administrator */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34,
                          height: 34,
                          borderRadius: '50%',
                          background: admin.role === 'super_admin' ? 'rgba(212, 175, 55, 0.15)' : '#f1f5f9',
                          color: admin.role === 'super_admin' ? 'var(--gold-primary, #b48324)' : '#0f172a',
                          border: admin.role === 'super_admin' ? '1px solid rgba(212, 175, 55, 0.4)' : '1px solid #cbd5e1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: 12,
                          flexShrink: 0
                        }}>
                          {initials}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 13.5 }}>
                            {admin.fullName}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                            {admin.title}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 2. Email */}
                    <td style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>
                      {admin.email}
                    </td>

                    {/* 3. Phone */}
                    <td style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 12, color: 'var(--text-muted)' }}>
                      {admin.phone || '—'}
                    </td>

                    {/* 4. Title & Department */}
                    <td>
                      <div style={{ fontSize: 12.5, color: 'var(--text-main)', fontWeight: 500 }}>
                        {admin.department}
                      </div>
                    </td>

                    {/* 5. Action - 3-Dot Action Menu */}
                    <td style={{ textAlign: 'center' }}>
                      <RowActionMenu
                        ariaLabel={`Actions for ${admin.fullName}`}
                        buttonId={`admin-actions-${admin.id}`}
                        items={[
                          {
                            label: 'Edit Admin',
                            icon: <Pencil size={14} />,
                            onClick: () => handleOpenEditAdmin(admin)
                          },
                          {
                            label: 'Delete Admin',
                            icon: <Trash2 size={14} />,
                            variant: 'danger',
                            onClick: () => {
                              setDeleteAdminError(null);
                              setAdminToDelete(admin);
                            }
                          }
                        ]}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Admin Modal */}
      {isEditAdminModalOpen && editingAdmin && (
        <div 
          className="modal-overlay" 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 100000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
          onClick={() => {
            if (!isSavingAdmin) setIsEditAdminModalOpen(false);
          }}
        >
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              maxWidth: 540,
              width: '100%',
              background: '#ffffff',
              borderRadius: 10,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              border: '1px solid #e2e8f0'
            }}
          >
            <form onSubmit={handleSaveAdmin} style={{ margin: 0 }}>
              <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <ShieldCheck size={20} color="var(--gold-primary, #dfba52)" />
                  <h3 className="font-serif" style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>Edit Administrator</h3>
                </div>
                <button 
                  type="button" 
                  disabled={isSavingAdmin}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                  onClick={() => setIsEditAdminModalOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16, maxHeight: 'calc(80vh - 120px)', overflowY: 'auto' }}>
                {editAdminError && (
                  <div style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#991b1b',
                    padding: '10px 12px',
                    borderRadius: 6,
                    fontSize: 12.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}>
                    <AlertCircle size={15} />
                    <span>{editAdminError}</span>
                  </div>
                )}

                {/* Full Name & Email */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                      Full Name <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      style={{
                        width: '100%',
                        height: 38,
                        padding: '8px 12px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        fontSize: 13,
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                      Email Address <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      style={{
                        width: '100%',
                        height: 38,
                        padding: '8px 12px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        fontSize: 13,
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Phone & Title */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                      Phone Number
                    </label>
                    <input
                      type="text"
                      placeholder="(406) 555-0100"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      style={{
                        width: '100%',
                        height: 38,
                        padding: '8px 12px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        fontSize: 13,
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                      Administrative Title
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      style={{
                        width: '100%',
                        height: 38,
                        padding: '8px 12px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        fontSize: 13,
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Department & Role */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                      Department
                    </label>
                    <input
                      type="text"
                      value={editDepartment}
                      onChange={(e) => setEditDepartment(e.target.value)}
                      style={{
                        width: '100%',
                        height: 38,
                        padding: '8px 12px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        fontSize: 13,
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                      Administrator Role
                    </label>
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as AdminUserRecord['role'])}
                      style={{
                        width: '100%',
                        height: 38,
                        padding: '8px 12px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        fontSize: 13,
                        background: '#ffffff',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="super_admin">Super Admin</option>
                      <option value="admin">Admin</option>
                      <option value="clerk">Clerk</option>
                      <option value="consignor_manager">Consignor Manager</option>
                      <option value="operator">Operator</option>
                    </select>
                  </div>
                </div>

                {/* Account Status */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Account Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as AdminUserRecord['status'])}
                    style={{
                      width: '100%',
                      height: 38,
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      background: '#ffffff',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>

                <div style={{ fontSize: 11.5, color: '#64748b', background: '#f8fafc', padding: '10px 14px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                  Changes will be saved directly to the Supabase <code>public.admin_users</code> table.
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 20px', borderTop: '1px solid #f1f5f9', background: '#f8fafc' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  disabled={isSavingAdmin}
                  onClick={() => setIsEditAdminModalOpen(false)}
                  style={{ fontSize: 13, padding: '8px 16px' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSavingAdmin}
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    padding: '8px 20px',
                    borderRadius: 6,
                    background: '#0f172a',
                    color: '#ffffff',
                    border: '1px solid #0f172a',
                    cursor: isSavingAdmin ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7
                  }}
                >
                  {isSavingAdmin ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  <span>{isSavingAdmin ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Admin Confirmation Modal */}
      {adminToDelete && (
        <DeleteConfirmModal
          isOpen={Boolean(adminToDelete)}
          onClose={() => {
            if (!isDeletingAdmin) {
              setAdminToDelete(null);
              setDeleteAdminError(null);
            }
          }}
          onConfirm={handleDeleteAdmin}
          title="Delete Administrator"
          entityName={adminToDelete.fullName}
          entitySubtitle={`${adminToDelete.title} • ${adminToDelete.email}`}
          warningMessage="Are you sure you want to delete this administrator? This action will permanently remove their executive credentials and revokes saleroom privileges in Supabase."
          isLoading={isDeletingAdmin}
          errorMessage={deleteAdminError}
          confirmButtonText="Delete Administrator"
        />
      )}
    </div>
  );
};
