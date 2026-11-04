import fs from 'fs';

const filePath = 'src/components/views/UsersView.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// 1. Update imports
const targetImportAdminAction = "import { deleteCustomerFromDb, updateCustomerInDb, deactivateCustomerInDb } from '../../services/adminActionService';";
const newImportAdminAction = "import { deleteCustomerFromDb, updateCustomerInDb, deactivateCustomerInDb, changeCustomerRoleInDb } from '../../services/adminActionService';\nimport { useAuth } from '../../context/AuthContext';\nimport { ChangeRoleModal } from '../ui/ChangeRoleModal';";

code = code.replace(targetImportAdminAction, newImportAdminAction);

// 2. Add useAuth and role modal state inside UsersView component
const targetComponentStart = "export const UsersView: React.FC<UsersViewProps> = ({\n  users: _users,\n  onUpdateUser,\n  onAddUser\n}) => {";
const newComponentStart = `export const UsersView: React.FC<UsersViewProps> = ({
  users: _users,
  onUpdateUser,
  onAddUser
}) => {
  const { user: currentUser } = useAuth();
  const [roleModalCustomer, setRoleModalCustomer] = useState<UserBidder | null>(null);
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [roleChangeError, setRoleChangeError] = useState<string | null>(null);

  const handleOpenChangeRole = (customer: UserBidder) => {
    setRoleModalCustomer(customer);
    setRoleChangeError(null);
  };

  const handleConfirmRoleChange = async (newRole: 'super_admin' | 'user') => {
    if (!roleModalCustomer) return;
    setIsSavingRole(true);
    setRoleChangeError(null);

    try {
      const res = await changeCustomerRoleInDb(
        roleModalCustomer.id,
        roleModalCustomer.email,
        newRole,
        currentUser?.id
      );

      if (!res.success) {
        setRoleChangeError(res.error || 'Failed to update customer role.');
        setIsSavingRole(false);
        return;
      }

      // Immediately update local customers table state without requiring page refresh
      setSupabaseUsers(prev =>
        prev.map(c =>
          c.id === roleModalCustomer.id || (roleModalCustomer.email && c.email?.toLowerCase() === roleModalCustomer.email.toLowerCase())
            ? { ...c, role: newRole, siteOrigin: newRole === 'super_admin' ? 'Super Admin' : c.siteOrigin }
            : c
        )
      );

      const targetName = roleModalCustomer.fullName || roleModalCustomer.name || roleModalCustomer.email;
      const roleLabel = newRole === 'super_admin' ? 'Super Admin' : 'User';
      setActionSuccessMessage(\`Customer role updated to \${roleLabel} successfully for \${targetName}.\`);
      setTimeout(() => setActionSuccessMessage(null), 5000);

      setIsSavingRole(false);
      setRoleModalCustomer(null);
    } catch (err: any) {
      setIsSavingRole(false);
      setRoleChangeError(err?.message || 'An unexpected error occurred while modifying role.');
    }
  };`;

code = code.replace(targetComponentStart, newComponentStart);

// 3. Add Change Role to RowActionMenu items
const targetRowActionMenuItems = `                              items={[
                                {
                                  label: 'View Customer',
                                  icon: <Eye size={14} />,
                                  onClick: () => handleOpenViewCustomer(user)
                                },
                                {
                                  label: 'Edit Customer',
                                  icon: <Pencil size={14} />,
                                  onClick: () => handleOpenEditCustomer(user)
                                },
                                {
                                  label: 'Delete Customer',`;

const newRowActionMenuItems = `                              items={[
                                {
                                  label: 'View Customer',
                                  icon: <Eye size={14} />,
                                  onClick: () => handleOpenViewCustomer(user)
                                },
                                {
                                  label: 'Edit Customer',
                                  icon: <Pencil size={14} />,
                                  onClick: () => handleOpenEditCustomer(user)
                                },
                                {
                                  label: 'Change Role',
                                  icon: <ShieldCheck size={14} />,
                                  onClick: () => handleOpenChangeRole(user)
                                },
                                {
                                  label: 'Delete Customer',`;

code = code.replace(targetRowActionMenuItems, newRowActionMenuItems);

// 4. Render ChangeRoleModal before the end of the return statement
const targetModalEnd = `{customerToDelete && (
        <DeleteConfirmModal`;

const newModalEnd = `{/* =========================================================================
          CHANGE CUSTOMER ROLE MODAL
          ========================================================================= */}
      {roleModalCustomer && (
        <ChangeRoleModal
          isOpen={Boolean(roleModalCustomer)}
          onClose={() => {
            if (!isSavingRole) {
              setRoleModalCustomer(null);
              setRoleChangeError(null);
            }
          }}
          onConfirm={handleConfirmRoleChange}
          customerName={roleModalCustomer.fullName || roleModalCustomer.name || 'Customer'}
          customerEmail={roleModalCustomer.email || ''}
          customerCode={roleModalCustomer.customerCode}
          currentRole={roleModalCustomer.role || 'user'}
          isLoading={isSavingRole}
          errorMessage={roleChangeError}
        />
      )}

      {customerToDelete && (
        <DeleteConfirmModal`;

code = code.replace(targetModalEnd, newModalEnd);

fs.writeFileSync(filePath, code, 'utf8');
console.log('Successfully updated src/components/views/UsersView.tsx with Change Role Action and Modal');

