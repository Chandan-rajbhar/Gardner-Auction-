import fs from 'fs';

const filePath = 'src/App.tsx';
let code = fs.readFileSync(filePath, 'utf8');

const target = `  if (!user) {
    return <AuthPage />;
  }`;

const replacement = `  // Strict Super Admin route protection across all dashboard views and direct URL navigation
  if (!user || user.role !== 'super_admin') {
    return <AuthPage />;
  }`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync(filePath, code, 'utf8');
  console.log('Successfully updated src/App.tsx with strict super_admin route protection');
} else {
  console.log('Target not found or already updated in src/App.tsx');
}

