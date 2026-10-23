import React, { useState, useMemo, useRef, useEffect } from 'react';
import { UserBidder } from '../../types';
import { supabase, supabaseAdmin } from '../../lib/supabase';
import { deleteCustomerFromDb, updateCustomerInDb, deactivateCustomerInDb } from '../../services/adminActionService';
import { 
  Search, 
  ShieldAlert, 
  ShieldCheck, 
  Plus, 
  CloudDownload,
  CloudUpload,
  Building,
  CheckCircle,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Loader2,
  User,
  PhoneCall,
  Mail,
  FileText,
  MapPin,
  CreditCard,
  Sparkles,
  Pencil,
  Trash2
} from 'lucide-react';
import Papa from 'papaparse';
import { ShadcnDatePicker } from '../ui/ShadcnDatePicker';
import { RowActionMenu } from '../ui/RowActionMenu';
import { DeleteConfirmModal } from '../ui/DeleteConfirmModal';

interface UsersViewProps {
  users: UserBidder[];
  onUpdateUser: (user: UserBidder) => void;
  onAddUser: (user: UserBidder) => void;
}

type SortField = 'customerCode' | 'company' | 'firstName' | 'lastName' | 'phone1' | 'email';
type SortDirection = 'asc' | 'desc';

export const UsersView: React.FC<UsersViewProps> = ({
  users,
  onUpdateUser,
  onAddUser
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserBidder | null>(null);
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Supabase dynamic users state
  const [supabaseUsers, setSupabaseUsers] = useState<UserBidder[]>([]);
  const [isLoadingDb, setIsLoadingDb] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Modals state
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<UserBidder | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<UserBidder | null>(null);
  const [isDeletingCustomer, setIsDeletingCustomer] = useState(false);
  const [deleteCustomerError, setDeleteCustomerError] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStatusMessage, setImportStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Comprehensive New Customer Form state matching exact user fields
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newPhone1, setNewPhone1] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDriversLicense, setNewDriversLicense] = useState('');
  const [newTaxId, setNewTaxId] = useState('');
  const [newTaxExpiration, setNewTaxExpiration] = useState('');
  const [newTaxExempt, setNewTaxExempt] = useState(false);
  const [newIsSeller, setNewIsSeller] = useState(false);
  const [newAddress1, setNewAddress1] = useState('');
  const [newAddress2, setNewAddress2] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newState, setNewState] = useState('');
  const [newZip, setNewZip] = useState('');
  const [newCountry, setNewCountry] = useState('United States');
  const [newPermanentBidder, setNewPermanentBidder] = useState(false);
  const [newCustomerCode, setNewCustomerCode] = useState('');

  // 1. Fetch Customers dynamically from Supabase public.users
  const fetchSupabaseUsers = async () => {
    setIsLoadingDb(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[UsersView] Error fetching from Supabase users:', error.message);
        return;
      }

      if (data && data.length > 0) {
        // Exclude admin and dashboard staff records from customer table
        const customerRecords = data.filter((row: any) => {
          const role = (row.role || '').toLowerCase();
          return role !== 'super_admin' && role !== 'admin' && role !== 'clerk' && role !== 'consignor_manager';
        });

        const mappedUsers: UserBidder[] = customerRecords.map((row: any) => {
          const fullName = row.full_name || `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Customer';
          const firstName = row.first_name || (fullName ? fullName.split(' ')[0] : '');
          const lastName = row.last_name || (fullName ? fullName.split(' ').slice(1).join(' ') : '');
          const customerCode = row.customer_code || (row.permanent_bidder_number ? `CUST-${row.permanent_bidder_number}` : `CUST-${row.id.slice(0, 6).toUpperCase()}`);
          const phone1 = row.phone_1 || row.phone || '';

          return {
            id: row.id,
            customerCode,
            firstName,
            lastName,
            name: fullName,
            email: row.email || '',
            phone1,
            phone: phone1,
            company: row.company_name || undefined,
            paddleNumber: row.permanent_bidder_number || customerCode.replace('CUST-', '') || 'Pending',
            siteOrigin: row.role === 'super_admin' ? 'Super Admin' : 'Website Direct',
            registrationDate: row.created_at ? row.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
            status: row.role === 'super_admin' ? 'vip' : 'verified',
            creditCardAuthorized: true,
            cardLast4: '4488',
            bidLimit: 100000,
            totalBidsPlaced: 0,
            lotsWon: 0,
            totalSpent: 0,
            type: row.is_seller ? 'both' : 'bidder',
            address: row.address_1 || '',
            cityStateZip: `${row.city || ''} ${row.state || ''} ${row.zip || ''}`.trim(),
            notes: row.title || 'Supabase registered account',
            driversLicenseNumber: row.drivers_license_number || undefined,
            taxId: row.tax_id || undefined,
            taxIdExpirationDate: row.tax_id_expiration_date || undefined,
            taxExemptAllPurchases: row.tax_exempt_all_purchases || false,
            isSeller: row.is_seller || false,
            address1: row.address_1 || undefined,
            address2: row.address_2 || undefined,
            city: row.city || undefined,
            state: row.state || undefined,
            zip: row.zip || undefined,
            country: row.country || 'United States',
            isPermanentBidder: row.is_permanent_bidder || false
          };
        });
        setSupabaseUsers(mappedUsers);
      }
    } catch (err) {
      console.warn('[UsersView] Exception querying Supabase:', err);
    } finally {
      setIsLoadingDb(false);
    }
  };

  // 2. Realtime listener: auto-update when user registers on website
  useEffect(() => {
    fetchSupabaseUsers();

    const channel = supabase
      .channel('realtime:public:users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        fetchSupabaseUsers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Extract helper values for a user
  const getCustomerCode = (u: UserBidder): string => {
    if (u.customerCode) return u.customerCode;
    if (u.paddleNumber && u.paddleNumber !== 'Pending' && !u.paddleNumber.startsWith('Consignor')) {
      return `CUST-${u.paddleNumber}`;
    }
    return u.id ? `CUST-${u.id.slice(0, 6).toUpperCase()}` : 'CUST-PENDING';
  };

  const getFirstName = (u: UserBidder): string => {
    if (u.firstName) return u.firstName;
    const parts = (u.name || '').trim().split(/\s+/);
    return parts[0] || '';
  };

  const getLastName = (u: UserBidder): string => {
    if (u.lastName) return u.lastName;
    const parts = (u.name || '').trim().split(/\s+/);
    return parts.slice(1).join(' ') || '';
  };

  const getCompany = (u: UserBidder): string => u.company || u.companyName || '—';
  const getPhone1 = (u: UserBidder): string => u.phone1 || u.phone || '—';
  const getEmail = (u: UserBidder): string => u.email || '—';

  // Merge live Supabase users with any mock users not in Supabase yet
  const customerList = useMemo(() => {
    const sbEmailSet = new Set(supabaseUsers.map(u => (u.email || '').toLowerCase().trim()));
    const remainingMock = users.filter(u => u.type !== 'consignor' && !sbEmailSet.has((u.email || '').toLowerCase().trim()));
    return [...supabaseUsers, ...remainingMock];
  }, [supabaseUsers, users]);

  // Apply search
  const filteredUsers = useMemo(() => {
    return customerList.filter(u => {
      const q = searchTerm.toLowerCase().trim();
      if (!q) return true;

      const code = getCustomerCode(u).toLowerCase();
      const comp = getCompany(u).toLowerCase();
      const first = getFirstName(u).toLowerCase();
      const last = getLastName(u).toLowerCase();
      const phone = getPhone1(u).toLowerCase();
      const email = (u.email || '').toLowerCase();
      const fullName = (u.name || '').toLowerCase();

      return (
        code.includes(q) ||
        comp.includes(q) ||
        first.includes(q) ||
        last.includes(q) ||
        phone.includes(q) ||
        email.includes(q) ||
        fullName.includes(q)
      );
    });
  }, [customerList, searchTerm]);

  // Apply sorting
  const sortedUsers = useMemo(() => {
    if (!sortField) return filteredUsers;

    return [...filteredUsers].sort((a, b) => {
      let valA = '';
      let valB = '';

      switch (sortField) {
        case 'customerCode':
          valA = getCustomerCode(a);
          valB = getCustomerCode(b);
          break;
        case 'company':
          valA = a.company || '';
          valB = b.company || '';
          break;
        case 'firstName':
          valA = getFirstName(a);
          valB = getFirstName(b);
          break;
        case 'lastName':
          valA = getLastName(a);
          valB = getLastName(b);
          break;
        case 'phone1':
          valA = getPhone1(a);
          valB = getPhone1(b);
          break;
        case 'email':
          valA = a.email || '';
          valB = b.email || '';
          break;
      }

      const cmp = valA.localeCompare(valB, undefined, { sensitivity: 'base', numeric: true });
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [filteredUsers, sortField, sortDirection]);

  // Handle header sort click
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortField(null);
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown size={13} style={{ opacity: 0.45, marginLeft: 4 }} />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp size={13} style={{ color: 'var(--gold-primary, #d4af37)', marginLeft: 4 }} />
      : <ArrowDown size={13} style={{ color: 'var(--gold-primary, #d4af37)', marginLeft: 4 }} />;
  };

  // Open New Customer Modal with preset code
  const openNewCustomerModal = () => {
    setEditingCustomer(null);
    setNewCustomerCode(`CUST-${Math.floor(100 + Math.random() * 900)}`);
    setNewFirstName('');
    setNewLastName('');
    setNewCompany('');
    setNewPhone1('');
    setNewEmail('');
    setNewDriversLicense('');
    setNewTaxId('');
    setNewTaxExpiration('');
    setNewTaxExempt(false);
    setNewIsSeller(false);
    setNewAddress1('');
    setNewAddress2('');
    setNewCity('');
    setNewState('');
    setNewZip('');
    setNewCountry('United States');
    setNewPermanentBidder(false);
    setIsNewCustomerModalOpen(true);
  };

  // Open Edit Customer Modal with selected customer data prefilled
  const handleOpenEditCustomer = (customer: UserBidder) => {
    setEditingCustomer(customer);
    setNewCustomerCode(customer.customerCode || getCustomerCode(customer));
    setNewFirstName(customer.firstName || getFirstName(customer));
    setNewLastName(customer.lastName || getLastName(customer));
    setNewCompany(customer.company || customer.companyName || '');
    setNewPhone1(customer.phone1 || customer.phone || '');
    setNewEmail(customer.email || '');
    setNewDriversLicense(customer.driversLicenseNumber || '');
    setNewTaxId(customer.taxId || '');
    setNewTaxExpiration(customer.taxIdExpirationDate || '');
    setNewTaxExempt(Boolean(customer.taxExemptAllPurchases));
    setNewIsSeller(Boolean(customer.isSeller));
    setNewAddress1(customer.address1 || customer.address || '');
    setNewAddress2(customer.address2 || '');
    setNewCity(customer.city || '');
    setNewState(customer.state || '');
    setNewZip(customer.zip || '');
    setNewCountry(customer.country || 'United States');
    setNewPermanentBidder(Boolean(customer.isPermanentBidder));
    setIsNewCustomerModalOpen(true);
  };

  // 3. Create or Edit customer -> Save directly into Supabase public.users & update state
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFirstName.trim() || !newEmail.trim()) {
      alert('Please fill out at least First Name and Email.');
      return;
    }

    setIsSaving(true);
    const fullName = `${newFirstName.trim()} ${newLastName.trim()}`.trim();
    const assignedCode = newCustomerCode.trim() || (editingCustomer ? getCustomerCode(editingCustomer) : `CUST-${Math.floor(100 + Math.random() * 900)}`);
    const paddleNum = assignedCode.replace('CUST-', '') || `${Math.floor(200 + Math.random() * 700)}`;

    if (editingCustomer) {
      // --- UPDATE EXISTING CUSTOMER ---
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(editingCustomer.id);
      const targetId = isUUID ? editingCustomer.id : crypto.randomUUID();

      const updatePayload = {
        id: targetId,
        customer_code: assignedCode,
        first_name: newFirstName.trim(),
        last_name: newLastName.trim(),
        full_name: fullName,
        company_name: newCompany.trim() || null,
        phone: newPhone1.trim() || null,
        email: newEmail.trim().toLowerCase(),
        drivers_license_number: newDriversLicense.trim() || null,
        tax_id: newTaxId.trim() || null,
        tax_id_expiration_date: newTaxExpiration || null,
        tax_exempt_all_purchases: newTaxExempt,
        is_seller: newIsSeller,
        address_1: newAddress1.trim() || null,
        address_2: newAddress2.trim() || null,
        city: newCity.trim() || null,
        state: newState.trim() || null,
        zip: newZip.trim() || null,
        country: newCountry || 'United States',
        is_permanent_bidder: newPermanentBidder,
        updated_at: new Date().toISOString()
      };

      try {
        const updateRes = await updateCustomerInDb(targetId, updatePayload);
        if (!updateRes.success && updateRes.error) {
          console.warn('[UsersView] Update notice:', updateRes.error);
        }
      } catch (err) {
        console.warn('[UsersView] Supabase update error:', err);
      }

      const updated: UserBidder = {
        ...editingCustomer,
        id: targetId,
        customerCode: assignedCode,
        firstName: newFirstName.trim(),
        lastName: newLastName.trim(),
        name: fullName,
        email: newEmail.trim(),
        phone1: newPhone1.trim() || editingCustomer.phone1,
        phone: newPhone1.trim() || editingCustomer.phone,
        company: newCompany.trim() || undefined,
        paddleNumber: paddleNum,
        type: newIsSeller ? 'both' : (editingCustomer.type === 'consignor' ? 'consignor' : 'bidder'),
        address: newAddress1.trim() || editingCustomer.address,
        cityStateZip: `${newCity.trim()} ${newState.trim()} ${newZip.trim()}`.trim(),
        driversLicenseNumber: newDriversLicense.trim() || undefined,
        taxId: newTaxId.trim() || undefined,
        taxIdExpirationDate: newTaxExpiration || undefined,
        taxExemptAllPurchases: newTaxExempt,
        isSeller: newIsSeller,
        address1: newAddress1.trim() || undefined,
        address2: newAddress2.trim() || undefined,
        city: newCity.trim() || undefined,
        state: newState.trim() || undefined,
        zip: newZip.trim() || undefined,
        country: newCountry || 'United States',
        isPermanentBidder: newPermanentBidder
      };

      onUpdateUser(updated);
      setSupabaseUsers(prev => prev.map(u => (u.id === editingCustomer.id || u.email.toLowerCase() === editingCustomer.email.toLowerCase()) ? updated : u));
      setIsSaving(false);
      setIsNewCustomerModalOpen(false);
      setEditingCustomer(null);
      setActionSuccessMessage(`Customer "${fullName}" updated successfully in Supabase!`);
      setTimeout(() => setActionSuccessMessage(null), 4000);
      fetchSupabaseUsers();
    } else {
      // --- CREATE NEW CUSTOMER ---
      const id = crypto.randomUUID();
      const sbPayload = {
        id,
        customer_code: assignedCode,
        first_name: newFirstName.trim(),
        last_name: newLastName.trim(),
        full_name: fullName,
        company_name: newCompany.trim() || null,
        phone: newPhone1.trim() || null,
        email: newEmail.trim().toLowerCase(),
        drivers_license_number: newDriversLicense.trim() || null,
        tax_id: newTaxId.trim() || null,
        tax_id_expiration_date: newTaxExpiration || null,
        tax_exempt_all_purchases: newTaxExempt,
        is_seller: newIsSeller,
        address_1: newAddress1.trim() || null,
        address_2: newAddress2.trim() || null,
        city: newCity.trim() || null,
        state: newState.trim() || null,
        zip: newZip.trim() || null,
        country: newCountry || 'United States',
        is_permanent_bidder: newPermanentBidder,
        permanent_bidder_number: newPermanentBidder ? paddleNum : null,
        role: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      try {
        const client = supabaseAdmin || supabase;
        const { error } = await client.from('users').insert([sbPayload]);
        if (error) {
          console.warn('[UsersView] Supabase insert warning:', error.message);
        }
      } catch (err) {
        console.warn('[UsersView] Supabase insert error:', err);
      }

      const created: UserBidder = {
        id,
        customerCode: assignedCode,
        firstName: newFirstName.trim(),
        lastName: newLastName.trim(),
        name: fullName,
        email: newEmail.trim(),
        phone1: newPhone1.trim() || '(406) 555-0100',
        phone: newPhone1.trim() || '(406) 555-0100',
        company: newCompany.trim() || undefined,
        paddleNumber: paddleNum,
        siteOrigin: 'Admin Console',
        registrationDate: new Date().toISOString().split('T')[0],
        status: 'verified',
        creditCardAuthorized: true,
        cardLast4: '4488',
        bidLimit: 100000,
        totalBidsPlaced: 0,
        lotsWon: 0,
        totalSpent: 0,
        type: newIsSeller ? 'both' : 'bidder',
        address: newAddress1.trim() || '',
        cityStateZip: `${newCity.trim()} ${newState.trim()} ${newZip.trim()}`.trim(),
        notes: 'Registered via Admin Customers Console',
        driversLicenseNumber: newDriversLicense.trim() || undefined,
        taxId: newTaxId.trim() || undefined,
        taxIdExpirationDate: newTaxExpiration || undefined,
        taxExemptAllPurchases: newTaxExempt,
        isSeller: newIsSeller,
        address1: newAddress1.trim() || undefined,
        address2: newAddress2.trim() || undefined,
        city: newCity.trim() || undefined,
        state: newState.trim() || undefined,
        zip: newZip.trim() || undefined,
        country: newCountry || 'United States',
        isPermanentBidder: newPermanentBidder
      };

      onAddUser(created);
      setSupabaseUsers(prev => [created, ...prev]);
      setIsSaving(false);
      setIsNewCustomerModalOpen(false);
      setActionSuccessMessage(`Customer "${fullName}" added successfully!`);
      setTimeout(() => setActionSuccessMessage(null), 4000);
      fetchSupabaseUsers();
    }
  };

  // Functional Delete Customer with integrity check
  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    setIsDeletingCustomer(true);
    setDeleteCustomerError(null);

    try {
      // 1. Check if linked records exist in Supabase (e.g. bids)
      const { count: bidsCount, error: bidErr } = await supabase
        .from('bids')
        .select('*', { count: 'exact', head: true })
        .or(`bidder_name.eq."${customerToDelete.name}",paddle_number.eq."${customerToDelete.paddleNumber}"`);

      const client = supabaseAdmin || supabase;

      if (!bidErr && bidsCount && bidsCount > 0) {
        // Linked historical auction data found -> safely deactivate rather than break historical records
        await deactivateCustomerInDb(customerToDelete.id);
        setSupabaseUsers(prev => prev.filter(u => u.id !== customerToDelete.id));
        setActionSuccessMessage(`Customer "${customerToDelete.name}" is linked to ${bidsCount} historical auction bids. The account was safely deactivated to preserve auction integrity.`);
        setTimeout(() => setActionSuccessMessage(null), 5000);
        setCustomerToDelete(null);
        fetchSupabaseUsers();
        return;
      }

      // 2. Safe delete from Supabase users table via adminActionService
      const delResult = await deleteCustomerFromDb(customerToDelete.id, customerToDelete.email);
      if (!delResult.success) {
        if (delResult.error && (delResult.error.includes('foreign key') || delResult.error.includes('23503'))) {
          await deactivateCustomerInDb(customerToDelete.id);
          setSupabaseUsers(prev => prev.filter(u => u.id !== customerToDelete.id));
          setActionSuccessMessage(`Customer "${customerToDelete.name}" has linked transaction history and was deactivated.`);
          setTimeout(() => setActionSuccessMessage(null), 4000);
          setCustomerToDelete(null);
          fetchSupabaseUsers();
          return;
        }
        throw new Error(delResult.error || 'Failed to delete customer.');
      }

      setSupabaseUsers(prev => prev.filter(u => u.id !== customerToDelete.id));
      setActionSuccessMessage(`Customer "${customerToDelete.name}" deleted successfully.`);
      setTimeout(() => setActionSuccessMessage(null), 4000);
      setCustomerToDelete(null);
      fetchSupabaseUsers();
    } catch (err: any) {
      setDeleteCustomerError(err?.message || 'Failed to delete customer.');
    } finally {
      setIsDeletingCustomer(false);
    }
  };

  // 4. Functional Export Customers to CSV
  const handleExportCustomers = () => {
    const exportRows = sortedUsers.map(u => ({
      'Customer Code': getCustomerCode(u),
      'Company Name': u.company || '',
      'First Name': getFirstName(u),
      'Last Name': getLastName(u),
      'Phone 1': getPhone1(u),
      'Email': u.email || '',
      'Driver License Number': u.driversLicenseNumber || '',
      'Tax ID': u.taxId || '',
      'Tax ID Expiration Date': u.taxIdExpirationDate || '',
      'Tax Exempt All Purchases': u.taxExemptAllPurchases ? 'YES' : 'NO',
      'Seller': u.isSeller ? 'YES' : 'NO',
      'Address 1': u.address1 || u.address || '',
      'Address 2': u.address2 || '',
      'City': u.city || '',
      'State': u.state || '',
      'Zip': u.zip || '',
      'Country': u.country || 'United States',
      'Permanent Bidder': u.isPermanentBidder ? 'YES' : 'NO'
    }));

    const csvContent = Papa.unparse(exportRows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `customers_registry_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 5. Functional Download Sample CSV Template
  const handleDownloadSampleTemplate = () => {
    const sampleRows = [
      {
        'Customer Code': 'CUST-501',
        'First Name': 'Arthur',
        'Last Name': 'Kensington',
        'Company Name': 'Kensington Heritage Capital LLC',
        'Phone 1': '(406) 555-0192',
        'Email': 'arthur@heritage.com',
        'Driver License Number': 'DL-8829104',
        'Tax ID': 'TAX-77291',
        'Tax ID Expiration Date': '2028-12-31',
        'Tax Exempt All Purchases': 'YES',
        'Seller': 'NO',
        'Address 1': '450 North Higgins Ave',
        'Address 2': 'Suite 400',
        'City': 'Missoula',
        'State': 'MT',
        'Zip': '59802',
        'Country': 'United States',
        'Permanent Bidder': 'YES'
      },
      {
        'Customer Code': 'CUST-502',
        'First Name': 'Eleanor',
        'Last Name': 'Sterling',
        'Company Name': 'Sterling Numismatics',
        'Phone 1': '(206) 555-8374',
        'Email': 'eleanor@sterlingcoins.com',
        'Driver License Number': 'WA-992011',
        'Tax ID': 'TAX-55291',
        'Tax ID Expiration Date': '2027-06-30',
        'Tax Exempt All Purchases': 'NO',
        'Seller': 'YES',
        'Address 1': '1200 4th Ave',
        'Address 2': '',
        'City': 'Seattle',
        'State': 'WA',
        'Zip': '98101',
        'Country': 'United States',
        'Permanent Bidder': 'NO'
      }
    ];

    const csv = Papa.unparse(sampleRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_customer_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 6. Functional Import CSV -> Insert into Supabase public.users & update state
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as Array<Record<string, string>>;
          if (!rows || rows.length === 0) {
            setImportStatusMessage({ text: 'File appears empty or unreadable.', type: 'error' });
            return;
          }

          let addedCount = 0;
          const recordsToInsert: any[] = [];
          const localAdded: UserBidder[] = [];

          for (let idx = 0; idx < rows.length; idx++) {
            const row = rows[idx];
            const firstName = row['First Name'] || row['firstName'] || row['First'] || row['Name']?.split(' ')[0] || `Customer`;
            const lastName = row['Last Name'] || row['lastName'] || row['Last'] || row['Name']?.split(' ').slice(1).join(' ') || `${idx + 1}`;
            const company = row['Company Name'] || row['Company'] || row['company'] || '';
            const phone1 = row['Phone 1'] || row['Phone'] || row['phone1'] || row['phone'] || '(406) 555-0100';
            const email = (row['Email'] || row['email'] || `customer_${Date.now()}_${idx}@gardner-auction.com`).trim().toLowerCase();
            const customerCode = row['Customer Code'] || row['customerCode'] || row['Code'] || `CUST-${Math.floor(200 + Math.random() * 700)}`;
            const paddleNum = customerCode.replace('CUST-', '') || `${Math.floor(200 + Math.random() * 700)}`;
            const dl = row['Driver License Number'] || row['Driver\'s License Number'] || row['drivers_license_number'] || null;
            const taxId = row['Tax ID'] || row['tax_id'] || null;
            const taxExp = row['Tax ID Expiration Date'] || row['tax_id_expiration_date'] || null;
            const taxExempt = (row['Tax Exempt All Purchases'] || row['tax_exempt_all_purchases'] || '').toLowerCase() === 'yes';
            const isSeller = (row['Seller'] || row['is_seller'] || '').toLowerCase() === 'yes';
            const addr1 = row['Address 1'] || row['Address1'] || row['address_1'] || null;
            const addr2 = row['Address 2'] || row['Address2'] || row['address_2'] || null;
            const city = row['City'] || row['city'] || null;
            const state = row['State'] || row['state'] || null;
            const zip = row['Zip'] || row['zip'] || null;
            const country = row['Country'] || row['country'] || 'United States';
            const permBidder = (row['Permanent Bidder'] || row['is_permanent_bidder'] || '').toLowerCase() === 'yes';

            const id = crypto.randomUUID();
            recordsToInsert.push({
              id,
              customer_code: customerCode,
              first_name: firstName,
              last_name: lastName,
              full_name: `${firstName} ${lastName}`.trim(),
              company_name: company || null,
              phone: phone1,
              email,
              drivers_license_number: dl,
              tax_id: taxId,
              tax_id_expiration_date: taxExp,
              tax_exempt_all_purchases: taxExempt,
              is_seller: isSeller,
              address_1: addr1,
              address_2: addr2,
              city,
              state,
              zip,
              country,
              is_permanent_bidder: permBidder,
              permanent_bidder_number: permBidder ? paddleNum : null,
              role: 'user',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

            const newCust: UserBidder = {
              id,
              customerCode,
              firstName,
              lastName,
              name: `${firstName} ${lastName}`.trim(),
              company,
              phone1,
              phone: phone1,
              email,
              paddleNumber: paddleNum,
              siteOrigin: 'Imported via CSV',
              registrationDate: new Date().toISOString().split('T')[0],
              status: 'verified',
              creditCardAuthorized: true,
              cardLast4: '8844',
              bidLimit: 100000,
              totalBidsPlaced: 0,
              lotsWon: 0,
              totalSpent: 0,
              type: isSeller ? 'both' : 'bidder',
              address: addr1 || '',
              cityStateZip: `${city || ''} ${state || ''} ${zip || ''}`.trim(),
              notes: 'Imported via batch CSV file.',
              driversLicenseNumber: dl || undefined,
              taxId: taxId || undefined,
              taxIdExpirationDate: taxExp || undefined,
              taxExemptAllPurchases: taxExempt,
              isSeller,
              address1: addr1 || undefined,
              address2: addr2 || undefined,
              city: city || undefined,
              state: state || undefined,
              zip: zip || undefined,
              country,
              isPermanentBidder: permBidder
            };

            onAddUser(newCust);
            localAdded.push(newCust);
            addedCount++;
          }

          // Insert into Supabase
          if (recordsToInsert.length > 0) {
            const client = supabaseAdmin || supabase;
            const { error: sbError } = await client.from('users').insert(recordsToInsert);
            if (sbError) {
              console.warn('[UsersView] Supabase batch import warning:', sbError.message);
            }
          }

          setSupabaseUsers(prev => [...localAdded, ...prev]);
          setImportStatusMessage({ 
            text: `Successfully imported ${addedCount} customer record(s) to Supabase & Dashboard!`, 
            type: 'success' 
          });

          setTimeout(() => {
            setIsImportModalOpen(false);
            setImportStatusMessage(null);
          }, 1500);

        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Unknown parsing error';
          setImportStatusMessage({ text: `Import failed: ${message}`, type: 'error' });
        }
      },
      error: (err) => {
        setImportStatusMessage({ text: `File parsing error: ${err.message}`, type: 'error' });
      }
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header & Requested Action Buttons with Gardner Gold Dashboard Theme */}
      <div className="card-header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 className="font-serif" style={{ fontSize: 22, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>Customers</span>
            {isLoadingDb && <Loader2 size={16} className="animate-spin" style={{ color: 'var(--gold-primary)' }} />}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Registered website bidders, customer contact records, and active saleroom credentials
          </p>
        </div>

        {/* 3 Buttons styled in sleek Black */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* 1. NEW CUSTOMER - Black Button */}
          <button 
            type="button"
            style={{
              background: '#0f172a',
              color: '#ffffff',
              border: '1px solid #0f172a',
              borderRadius: 4,
              padding: '9px 18px',
              fontSize: 12.5,
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              cursor: 'pointer',
              boxShadow: '0 2px 5px rgba(0, 0, 0, 0.25)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1e293b';
              e.currentTarget.style.borderColor = '#1e293b';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#0f172a';
              e.currentTarget.style.borderColor = '#0f172a';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            onClick={openNewCustomerModal}
            id="btn-new-customer"
          >
            <Plus size={16} strokeWidth={2.8} />
            <span>NEW CUSTOMER</span>
          </button>

          {/* 2. IMPORT CUSTOMERS - Black Button */}
          <button 
            type="button"
            style={{
              background: '#0f172a',
              color: '#ffffff',
              border: '1px solid #0f172a',
              borderRadius: 4,
              padding: '9px 18px',
              fontSize: 12.5,
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              boxShadow: '0 2px 5px rgba(0, 0, 0, 0.25)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1e293b';
              e.currentTarget.style.borderColor = '#1e293b';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#0f172a';
              e.currentTarget.style.borderColor = '#0f172a';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            onClick={() => setIsImportModalOpen(true)}
            id="btn-import-customers"
          >
            <CloudDownload size={16} strokeWidth={2.2} />
            <span>IMPORT CUSTOMERS</span>
          </button>

          {/* 3. EXPORT CUSTOMER - Black Button */}
          <button 
            type="button"
            style={{
              background: '#0f172a',
              color: '#ffffff',
              border: '1px solid #0f172a',
              borderRadius: 4,
              padding: '9px 18px',
              fontSize: 12.5,
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              boxShadow: '0 2px 5px rgba(0, 0, 0, 0.25)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1e293b';
              e.currentTarget.style.borderColor = '#1e293b';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#0f172a';
              e.currentTarget.style.borderColor = '#0f172a';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            onClick={handleExportCustomers}
            id="btn-export-customers"
          >
            <CloudUpload size={16} strokeWidth={2.2} />
            <span>EXPORT CUSTOMER</span>
          </button>
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

      {/* Search Bar & Sync indicator */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', background: 'var(--bg-card)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
        <div className="input-search-wrapper" style={{ flex: 1, minWidth: 260 }}>
          <Search size={16} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search by customer code, company, first name, last name, phone, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button 
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 10px' }}
            onClick={fetchSupabaseUsers}
            title="Refresh from Supabase"
          >
            <RefreshCw size={12} className={isLoadingDb ? 'animate-spin' : ''} />
            <span>Sync Supabase</span>
          </button>

          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            Showing <strong>{sortedUsers.length}</strong> customers
          </span>
        </div>
      </div>

      {/* Customer Table Without Status Column */}
      <div className="table-wrapper" style={{ overflowX: 'auto', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
        <table className="luxury-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th 
                onClick={() => handleSort('customerCode')} 
                style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                title="Sort by Customer Code"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span>Customer Code</span>
                  {renderSortIcon('customerCode')}
                </div>
              </th>

              <th 
                onClick={() => handleSort('company')} 
                style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                title="Sort by Company"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span>Company</span>
                  {renderSortIcon('company')}
                </div>
              </th>

              <th 
                onClick={() => handleSort('firstName')} 
                style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                title="Sort by First Name"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span>First Name</span>
                  {renderSortIcon('firstName')}
                </div>
              </th>

              <th 
                onClick={() => handleSort('lastName')} 
                style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                title="Sort by Last Name"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span>Last Name</span>
                  {renderSortIcon('lastName')}
                </div>
              </th>

              <th 
                onClick={() => handleSort('phone1')} 
                style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                title="Sort by Phone 1"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span>Phone 1</span>
                  {renderSortIcon('phone1')}
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

              <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedUsers.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
                  No customer records found matching your filters.
                </td>
              </tr>
            ) : (
              sortedUsers.map(user => {
                const customerCode = getCustomerCode(user);
                const firstName = getFirstName(user);
                const lastName = getLastName(user);
                const phone1 = getPhone1(user);
                const company = getCompany(user);
                const email = getEmail(user);
                const fullName = user.name || `${firstName} ${lastName}`.trim() || 'Customer';

                return (
                  <tr key={user.id}>
                    {/* 1. Customer Code */}
                    <td>
                      <span style={{ 
                        fontFamily: 'var(--font-mono, monospace)', 
                        fontWeight: 700, 
                        color: user.paddleNumber === 'Pending' ? '#f59e0b' : 'var(--gold-primary, #d4af37)',
                        background: 'rgba(212, 175, 55, 0.08)',
                        padding: '4px 8px',
                        borderRadius: 4,
                        fontSize: 12,
                        letterSpacing: '0.03em'
                      }}>
                        {customerCode}
                      </span>
                    </td>

                    {/* 2. Company */}
                    <td>
                      <div style={{ fontWeight: 500, color: (user.company || user.companyName) ? 'var(--text-main)' : 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {(user.company || user.companyName) ? (
                          <>
                            <Building size={13} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
                            <span>{company}</span>
                          </>
                        ) : (
                          <span>—</span>
                        )}
                      </div>
                    </td>

                    {/* 3. First Name */}
                    <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                      {firstName || '—'}
                    </td>

                    {/* 4. Last Name */}
                    <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                      {lastName || '—'}
                    </td>

                    {/* 5. Phone 1 */}
                    <td style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 12, color: 'var(--text-muted)' }}>
                      {phone1}
                    </td>

                    {/* 6. Email */}
                    <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                      {email}
                    </td>

                    {/* Action */}
                    <td style={{ textAlign: 'center' }}>
                      <RowActionMenu
                        ariaLabel={`Actions for ${fullName}`}
                        buttonId={`customer-actions-${user.id}`}
                        items={[
                          {
                            label: 'Edit Customer',
                            icon: <Pencil size={14} />,
                            onClick: () => handleOpenEditCustomer(user)
                          },
                          {
                            label: 'Delete Customer',
                            icon: <Trash2 size={14} />,
                            variant: 'danger',
                            onClick: () => {
                              setDeleteCustomerError(null);
                              setCustomerToDelete(user);
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

      {/* New Customer Side Drawer (Slide-Over from Right) */}
      {isNewCustomerModalOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            justifyContent: 'flex-end',
            transition: 'opacity 0.25s ease'
          }}
          onClick={() => setIsNewCustomerModalOpen(false)}
        >
          <style>{`
            @keyframes slideInRightDrawer {
              from {
                transform: translateX(100%);
              }
              to {
                transform: translateX(0);
              }
            }
            .customer-drawer-input {
              width: 100%;
              height: 40px;
              padding: 8px 12px;
              border-radius: 6px;
              border: 1px solid #cbd5e1;
              background-color: #f8fafc;
              color: #0f172a;
              font-size: 13px;
              box-sizing: border-box;
              transition: all 0.15s ease;
            }
            .customer-drawer-input:hover {
              border-color: #94a3b8 !important;
            }
            .customer-drawer-input:focus {
              background-color: #ffffff !important;
              border-color: #0f172a !important;
              box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08) !important;
              outline: none !important;
            }
            .customer-section-header {
              display: flex;
              align-items: center;
              gap: 9px;
              margin-top: 4px;
              margin-bottom: 2px;
            }
            .customer-section-icon {
              width: 26px;
              height: 26px;
              border-radius: 6px;
              background: #f1f5f9;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #475569;
              flex-shrink: 0;
            }
            .customer-section-title {
              font-size: 11.5px;
              font-weight: 700;
              letter-spacing: 0.04em;
              text-transform: uppercase;
              color: #0f172a;
            }
            .customer-section-line {
              flex: 1;
              height: 1px;
              background: #e2e8f0;
            }
            .customer-drawer-label {
              display: block;
              font-size: 11.5px;
              font-weight: 600;
              color: #334155;
              margin-bottom: 5px;
            }
          `}</style>
          <div 
            onClick={(e) => e.stopPropagation()} 
            style={{
              width: '760px',
              maxWidth: '94vw',
              height: '100vh',
              background: '#ffffff',
              boxShadow: '-14px 0 44px rgba(0, 0, 0, 0.22)',
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideInRightDrawer 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              overflow: 'hidden'
            }}
          >
            <form onSubmit={handleSaveCustomer} style={{ display: 'flex', flexDirection: 'column', height: '100%', margin: 0 }}>
              {/* Drawer Header */}
              <div style={{
                padding: '16px 26px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#ffffff',
                flexShrink: 0
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>
                      {editingCustomer ? 'Edit Customer' : 'New Customer'}
                    </h3>
                    <span style={{ 
                      fontSize: 11, 
                      fontWeight: 600, 
                      color: editingCustomer ? '#0f766e' : '#0284c7', 
                      background: editingCustomer ? '#ccfbf1' : '#e0f2fe', 
                      padding: '2px 9px', 
                      borderRadius: 12 
                    }}>
                      {editingCustomer ? 'Customer Editor' : 'Slide-Over Form'}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold-primary, #b48324)', background: 'rgba(212, 175, 55, 0.1)', padding: '2px 8px', borderRadius: 4, fontFamily: 'monospace' }}>
                      {newCustomerCode || 'CUST-AUTO'}
                    </span>
                  </div>
                  <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748b' }}>
                    {editingCustomer 
                      ? 'Update customer contact, tax details, and saleroom billing address'
                      : 'Enter customer contact, tax details, and saleroom billing address'}
                  </p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setIsNewCustomerModalOpen(false)}
                  style={{
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: '50%',
                    width: 34,
                    height: 34,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#e2e8f0';
                    e.currentTarget.style.color = '#0f172a';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f1f5f9';
                    e.currentTarget.style.color = '#64748b';
                  }}
                  title="Close (Esc)"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Body - Organized into Clear Logical Sections Covering Full Space */}
              <div style={{
                flex: 1,
                padding: '20px 26px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 18
              }}>
                {/* 1. PERSONAL & COMPANY INFORMATION */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="customer-section-header">
                    <div className="customer-section-icon">
                      <User size={14} />
                    </div>
                    <span className="customer-section-title">Personal & Company Information</span>
                    <div className="customer-section-line" />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label className="customer-drawer-label">
                        First Name <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input 
                        type="text" 
                        required 
                        placeholder="e.g. Eleanor"
                        value={newFirstName}
                        onChange={(e) => setNewFirstName(e.target.value)}
                        className="customer-drawer-input"
                      />
                    </div>

                    <div>
                      <label className="customer-drawer-label">
                        Last Name
                      </label>
                      <input 
                        type="text" 
                        placeholder="e.g. Vance"
                        value={newLastName}
                        onChange={(e) => setNewLastName(e.target.value)}
                        className="customer-drawer-input"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 16 }}>
                    <div>
                      <label className="customer-drawer-label">
                        Company Name
                      </label>
                      <input 
                        type="text" 
                        placeholder="Company or DBA name (optional)"
                        value={newCompany}
                        onChange={(e) => setNewCompany(e.target.value)}
                        className="customer-drawer-input"
                      />
                    </div>

                    <div>
                      <label className="customer-drawer-label">
                        Customer Code
                      </label>
                      <div 
                        className="customer-drawer-input" 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          background: '#f1f5f9',
                          cursor: 'default'
                        }}
                      >
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a', fontSize: 13 }}>
                          {newCustomerCode || 'CUST-AUTO'}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--gold-primary, #b48324)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Auto-Assigned
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. CONTACT INFORMATION */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="customer-section-header">
                    <div className="customer-section-icon">
                      <PhoneCall size={14} />
                    </div>
                    <span className="customer-section-title">Contact Information</span>
                    <div className="customer-section-line" />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label className="customer-drawer-label">
                        Phone 1 <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input 
                        type="text" 
                        placeholder="(406) 555-0100"
                        value={newPhone1}
                        onChange={(e) => setNewPhone1(e.target.value)}
                        className="customer-drawer-input"
                      />
                    </div>

                    <div>
                      <label className="customer-drawer-label">
                        Email Address <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input 
                        type="email" 
                        required 
                        placeholder="customer@domain.com"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        className="customer-drawer-input"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label className="customer-drawer-label">
                        Driver's License / Gov ID Number
                      </label>
                      <input 
                        type="text" 
                        placeholder="Driver's License Number"
                        value={newDriversLicense}
                        onChange={(e) => setNewDriversLicense(e.target.value)}
                        className="customer-drawer-input"
                      />
                    </div>

                    <div>
                      <label className="customer-drawer-label">
                        ID Verification
                      </label>
                      <div 
                        className="customer-drawer-input" 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 8,
                          background: '#f8fafc',
                          color: '#475569',
                          fontSize: 12
                        }}
                      >
                        <ShieldCheck size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                        <span>Saleroom Verification On File</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. TAX & LICENSING INFORMATION */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="customer-section-header">
                    <div className="customer-section-icon">
                      <FileText size={14} />
                    </div>
                    <span className="customer-section-title">Tax Information</span>
                    <div className="customer-section-line" />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label className="customer-drawer-label">
                        Tax ID / Resale Certificate Number
                      </label>
                      <input 
                        type="text" 
                        placeholder="e.g. TAX-8829104"
                        value={newTaxId}
                        onChange={(e) => setNewTaxId(e.target.value)}
                        className="customer-drawer-input"
                      />
                    </div>

                    <div>
                      <label className="customer-drawer-label">
                        Tax ID Expiration Date
                      </label>
                      <ShadcnDatePicker
                        value={newTaxExpiration}
                        onChange={setNewTaxExpiration}
                        placeholder="Pick expiration date"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. ADDRESS INFORMATION */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="customer-section-header">
                    <div className="customer-section-icon">
                      <MapPin size={14} />
                    </div>
                    <span className="customer-section-title">Address Information</span>
                    <div className="customer-section-line" />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label className="customer-drawer-label">
                        Address Line 1
                      </label>
                      <input 
                        type="text" 
                        placeholder="Street address or P.O. Box"
                        value={newAddress1}
                        onChange={(e) => setNewAddress1(e.target.value)}
                        className="customer-drawer-input"
                      />
                    </div>

                    <div>
                      <label className="customer-drawer-label">
                        Address Line 2
                      </label>
                      <input 
                        type="text" 
                        placeholder="Apt, Suite, Unit, Building (optional)"
                        value={newAddress2}
                        onChange={(e) => setNewAddress2(e.target.value)}
                        className="customer-drawer-input"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 0.75fr', gap: 16 }}>
                    <div>
                      <label className="customer-drawer-label">
                        City, State, ZIP Code
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.85fr 0.85fr', gap: 6 }}>
                        <input 
                          type="text" 
                          placeholder="City"
                          value={newCity}
                          onChange={(e) => setNewCity(e.target.value)}
                          className="customer-drawer-input"
                        />
                        <input 
                          type="text" 
                          placeholder="State"
                          value={newState}
                          onChange={(e) => setNewState(e.target.value)}
                          className="customer-drawer-input"
                        />
                        <input 
                          type="text" 
                          placeholder="ZIP"
                          value={newZip}
                          onChange={(e) => setNewZip(e.target.value)}
                          className="customer-drawer-input"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="customer-drawer-label">
                        Country
                      </label>
                      <select 
                        value={newCountry} 
                        onChange={(e) => setNewCountry(e.target.value)}
                        className="customer-drawer-input"
                      >
                        <option value="United States">United States</option>
                        <option value="Canada">Canada</option>
                        <option value="United Kingdom">United Kingdom</option>
                        <option value="Australia">Australia</option>
                        <option value="Switzerland">Switzerland</option>
                        <option value="Germany">Germany</option>
                        <option value="France">France</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Drawer Footer - Sticky at Bottom */}
              <div style={{
                position: 'sticky',
                bottom: 0,
                background: '#ffffff',
                borderTop: '1px solid #e2e8f0',
                padding: '14px 26px',
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: 12,
                boxShadow: '0 -4px 14px rgba(0, 0, 0, 0.05)',
                flexShrink: 0
              }}>
                <button 
                  type="button" 
                  onClick={() => setIsNewCustomerModalOpen(false)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                    fontSize: 13,
                    fontWeight: 600,
                    padding: '9px 20px',
                    borderRadius: 4,
                    cursor: 'pointer',
                    letterSpacing: '0.04em',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f1f5f9';
                    e.currentTarget.style.color = '#0f172a';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.color = '#475569';
                  }}
                >
                  CANCEL
                </button>

                <button 
                  type="submit" 
                  disabled={isSaving}
                  style={{ 
                    background: '#0f172a', 
                    color: '#ffffff', 
                    fontWeight: 700,
                    fontSize: 13,
                    padding: '9px 28px',
                    borderRadius: 4,
                    border: '1px solid #0f172a',
                    letterSpacing: '0.04em',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#1e293b';
                    e.currentTarget.style.borderColor = '#1e293b';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#0f172a';
                    e.currentTarget.style.borderColor = '#0f172a';
                  }}
                >
                  {isSaving && <Loader2 size={14} className="animate-spin" />}
                  <span>{editingCustomer ? 'UPDATE CUSTOMER' : 'SAVE CUSTOMER'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Customers Modal */}
      {isImportModalOpen && (
        <div className="modal-overlay" onClick={() => setIsImportModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FileSpreadsheet size={20} color="var(--gold-primary, #dfba52)" />
                <h3 className="font-serif" style={{ margin: 0 }}>Import Customers</h3>
              </div>
              <button type="button" className="icon-btn" onClick={() => setIsImportModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                Upload a CSV file containing customer records. Imported rows will be saved directly into Supabase and rendered in your table.
              </p>

              {/* Upload Drop Area */}
              <div 
                style={{
                  border: '2px dashed rgba(212, 175, 55, 0.35)',
                  borderRadius: 8,
                  padding: '28px 16px',
                  textAlign: 'center',
                  background: 'var(--bg-darkest, #111)',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s ease'
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <CloudDownload size={36} color="var(--gold-primary, #dfba52)" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-main)' }}>
                  Click to choose CSV file
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
                  Supports .csv and text formats
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept=".csv,.txt"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
              </div>

              {/* Status message */}
              {importStatusMessage && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 500,
                  backgroundColor: importStatusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: importStatusMessage.type === 'success' ? '#10b981' : '#ef4444',
                  border: `1px solid ${importStatusMessage.type === 'success' ? '#10b981' : '#ef4444'}`
                }}>
                  {importStatusMessage.text}
                </div>
              )}

              {/* Download Sample Template */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '10px 14px', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>CSV Template</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Download sample template with all customer columns</div>
                </div>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px' }}
                  onClick={handleDownloadSampleTemplate}
                >
                  <Download size={13} />
                  <span>Download Sample</span>
                </button>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsImportModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Detail & Authorization Modal */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="font-serif">Customer Profile & Authorization</h3>
              <button className="icon-btn" onClick={() => setSelectedUser(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'var(--bg-darkest)', padding: 16, borderRadius: 8 }}>
                <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'var(--gold-gradient)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20 }}>
                  {getFirstName(selectedUser).charAt(0) || selectedUser.name.charAt(0)}
                </div>
                <div>
                  <h4 style={{ fontSize: 18, color: 'var(--text-main)', fontWeight: 700, margin: 0 }}>
                    {getFirstName(selectedUser)} {getLastName(selectedUser)}
                  </h4>
                  <p style={{ fontSize: 12, color: 'var(--gold-primary)', margin: '4px 0 0' }}>
                    Customer Code: {getCustomerCode(selectedUser)} • Paddle #{selectedUser.paddleNumber}
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 16 }}>
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="text" readOnly value={selectedUser.email} />
                </div>
                <div className="form-group">
                  <label>Phone 1 / Telephone</label>
                  <input type="text" readOnly value={getPhone1(selectedUser)} />
                </div>
                <div className="form-group">
                  <label>Organization / Firm</label>
                  <input type="text" readOnly value={getCompany(selectedUser)} />
                </div>
                <div className="form-group">
                  <label>Registered Origin</label>
                  <input type="text" readOnly value={selectedUser.siteOrigin} />
                </div>
              </div>

              {selectedUser.driversLicenseNumber && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
                  <div className="form-group">
                    <label>Driver's License</label>
                    <input type="text" readOnly value={selectedUser.driversLicenseNumber} />
                  </div>
                  <div className="form-group">
                    <label>Tax ID</label>
                    <input type="text" readOnly value={selectedUser.taxId || 'N/A'} />
                  </div>
                </div>
              )}

              <div className="form-group" style={{ marginTop: 14 }}>
                <label>Customer Bid Limit Ceiling ($)</label>
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

              <div className="form-group" style={{ marginTop: 14 }}>
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
            </div>

            <div className="modal-footer" style={{ marginTop: 16 }}>
              <button className="btn btn-secondary" onClick={() => setSelectedUser(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Customer Confirmation Modal */}
      {customerToDelete && (
        <DeleteConfirmModal
          isOpen={Boolean(customerToDelete)}
          onClose={() => {
            if (!isDeletingCustomer) {
              setCustomerToDelete(null);
              setDeleteCustomerError(null);
            }
          }}
          onConfirm={handleDeleteCustomer}
          title="Delete Customer"
          entityName={customerToDelete.name || `${getFirstName(customerToDelete)} ${getLastName(customerToDelete)}`}
          entitySubtitle={`${getCustomerCode(customerToDelete)} • ${customerToDelete.email || 'No email'}`}
          warningMessage="Are you sure you want to delete this customer? This action will remove the record from the Supabase database."
          isLoading={isDeletingCustomer}
          errorMessage={deleteCustomerError}
          confirmButtonText="Delete Customer"
        />
      )}
    </div>
  );
};
