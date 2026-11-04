import fs from 'fs';

const filePath = 'src/components/views/ProfileView.tsx';
let code = fs.readFileSync(filePath, 'utf8');

if (!code.includes("from '../../lib/supabase'")) {
  const target = "import { useAuth } from '../../context/AuthContext';";
  const replacement = "import { useAuth } from '../../context/AuthContext';\nimport { supabase } from '../../lib/supabase';";
  code = code.replace(target, replacement);
  fs.writeFileSync(filePath, code, 'utf8');
  console.log('Successfully added supabase import to src/components/views/ProfileView.tsx');
} else {
  console.log('supabase is already imported in ProfileView.tsx');
}

