import fs from 'fs';

const filePath = 'src/components/auth/LoginPage.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// Update useAuth destructured values
code = code.replace(
  'const { login, savedEmail } = useAuth();',
  'const { login, savedEmail, accessDeniedNotice } = useAuth();'
);

// Add useEffect for accessDeniedNotice
const targetEffect = `  React.useEffect(() => {
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, [savedEmail]);`;

const newEffect = `  React.useEffect(() => {
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, [savedEmail]);

  React.useEffect(() => {
    if (accessDeniedNotice) {
      setErrorMessage(accessDeniedNotice);
    }
  }, [accessDeniedNotice]);`;

code = code.replace(targetEffect, newEffect);

// Update error text check so 'Access denied' is never overridden
const targetErrorCheck = `        if (
          lower.includes('invalid email or password') ||
          lower.includes('invalid login credentials') ||
          lower.includes('invalid credentials')
        ) {
          displayMsg = 'Invalid email or password.';
        } else if (lower.includes('unauthorized') || lower.includes('not authorized')) {`;

const newErrorCheck = `        if (lower.includes('access denied')) {
          displayMsg = 'Access denied. Only Super Admin accounts are authorized to access the Admin Dashboard.';
        } else if (
          lower.includes('invalid email or password') ||
          lower.includes('invalid login credentials') ||
          lower.includes('invalid credentials')
        ) {
          displayMsg = 'Invalid email or password.';
        } else if (lower.includes('unauthorized') || lower.includes('not authorized')) {`;

code = code.replace(targetErrorCheck, newErrorCheck);

fs.writeFileSync(filePath, code, 'utf8');
console.log('Successfully updated src/components/auth/LoginPage.tsx');

