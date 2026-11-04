import fs from 'fs';

const filePath = 'src/components/views/ProfileView.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// 1. Add state for dynamic Supabase role
const targetBeforeVariables = `  /*
  const formattedDate = user?.createdAt 
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : 'Oct 21, 2026';
  */`;

const dynamicRoleLogic = `  // --- DYNAMIC SUPABASE ROLE STATE ---
  const [dbRole, setDbRole] = useState<string | null>(() => user?.role || null);
  const [isLoadingRole, setIsLoadingRole] = useState<boolean>(!user?.role);

  // Dynamic fetch & realtime synchronization from Supabase database record
  useEffect(() => {
    let isMounted = true;
    if (!user?.id && !user?.email) {
      setIsLoadingRole(false);
      return;
    }

    const fetchLiveRole = async () => {
      setIsLoadingRole(true);
      try {
        const cleanEmail = (user.email || '').toLowerCase().trim();
        const { data, error } = await supabase
          .from('users')
          .select('role, full_name, phone, title, avatar_url')
          .or(\`id.eq.\${user.id},email.eq.\${cleanEmail}\`)
          .maybeSingle();

        if (error) {
          console.warn('[ProfileView] Error fetching live database role:', error.message);
        }

        if (data && isMounted) {
          const rawRole = (data.role || 'user').toLowerCase().trim();
          setDbRole(rawRole);
          if (data.full_name && !isEditMode) setFullName(data.full_name);
          if (data.phone && !isEditMode) setPhone(data.phone);
          if (data.title && !isEditMode) setTitle(data.title);
        } else if (isMounted) {
          setDbRole(user.role || 'user');
        }
      } catch (err) {
        console.warn('[ProfileView] Exception fetching live role:', err);
        if (isMounted) setDbRole(user.role || 'user');
      } finally {
        if (isMounted) setIsLoadingRole(false);
      }
    };

    fetchLiveRole();

    // Subscribe to live Realtime changes in Supabase public.users for this user
    const channel = supabase
      .channel(\`realtime:profile_view_\${user.id}\`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: \`id=eq.\${user.id}\`
        },
        (payload: any) => {
          if (payload?.new && isMounted) {
            const updatedRole = (payload.new.role || 'user').toLowerCase().trim();
            setDbRole(updatedRole);
            if (payload.new.full_name && !isEditMode) setFullName(payload.new.full_name);
            if (payload.new.phone && !isEditMode) setPhone(payload.new.phone);
            if (payload.new.title && !isEditMode) setTitle(payload.new.title);
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.email, isEditMode]);`;

// Replace targetBeforeVariables with dynamicRoleLogic
code = code.replace(targetBeforeVariables, dynamicRoleLogic);

// 2. Replace hardcoded fallbacks
const targetVars = `  const userDisplayName = user?.name || fullName || 'Chandan Kumar';
  const userDisplayEmail = user?.email || 'chandan873605@gmail.com';
  const userDisplayRole = user?.role ? user.role.replace('_', ' ').toUpperCase() : 'SUPER ADMIN';
  const userDisplayTitle = user?.title || title || 'Master Auctioneer & Executive Admin';
  const userDisplayPhone = user?.phone || phone || '(406) 555-0192';`;

const newVars = `  const currentRoleRaw = dbRole || user?.role || '';
  const userDisplayName = user?.name || fullName || '';
  const userDisplayEmail = user?.email || '';
  const userDisplayRole = isLoadingRole 
    ? 'LOADING ROLE...'
    : currentRoleRaw 
      ? (currentRoleRaw === 'super_admin' ? 'SUPER ADMIN' : currentRoleRaw === 'user' ? 'USER' : currentRoleRaw.replace(/[_s]+/g, ' ').toUpperCase())
      : 'USER';
  const rolePolicyText = userDisplayRole === 'SUPER ADMIN'
    ? 'Full Rostrum & Vault Clearance'
    : 'Standard Saleroom Access (User Policy)';
  const userDisplayTitle = user?.title || title || 'Saleroom Administrator';
  const userDisplayPhone = user?.phone || phone || '—';`;

code = code.replace(targetVars, newVars);

// 3. Update Policy text in JSX
code = code.replace(
  '<span className="role-display-policy">Full Rostrum &amp; Vault Clearance</span>',
  '<span className="role-display-policy">{rolePolicyText}</span>'
);

code = code.replace(
  '<span className="role-display-policy">Full Rostrum &amp; Vault Clearance (Protected)</span>',
  '<span className="role-display-policy">{rolePolicyText} (Protected)</span>'
);

// 4. Update role tag color to match role
code = code.replace(
  '<ShieldCheck size={13} color="#059669" />',
  '<ShieldCheck size={13} color={userDisplayRole === "SUPER ADMIN" ? "#059669" : "#3b82f6"} />'
);

fs.writeFileSync(filePath, code, 'utf8');
console.log('Successfully updated src/components/views/ProfileView.tsx with dynamic Supabase role');

