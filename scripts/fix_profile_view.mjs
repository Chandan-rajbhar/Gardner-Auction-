import fs from 'fs';

const filePath = 'src/components/views/ProfileView.tsx';
let code = fs.readFileSync(filePath, 'utf8');

const regex = /\/\*\s*const formattedDate = user\?\.createdAt[\s\S]*?const activeAvatarUrl = avatarPreviewUrl \|\| user\?\.avatarUrl;/;

const replacement = `  // --- DYNAMIC SUPABASE ROLE STATE ---
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
  }, [user?.id, user?.email, isEditMode]);

  const currentRoleRaw = dbRole || user?.role || '';
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
  const userDisplayPhone = user?.phone || phone || '—';
  const activeAvatarUrl = avatarPreviewUrl || user?.avatarUrl;`;

if (regex.test(code)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync(filePath, code, 'utf8');
  console.log('Successfully replaced dynamic role variables in ProfileView.tsx');
} else {
  console.log('Regex did not match in ProfileView.tsx');
}

