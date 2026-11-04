import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ocsuqfabqsyrbsewcaez.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jc3VxZmFicXN5cmJzZXdjYWV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzUyMjgyMCwiZXhwIjoyMDg5MDk4ODIwfQ.HYys17PBfYfhNgfGAJTrGmsVhgKf_jXHcdRvr_A0ikk';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jc3VxZmFicXN5cmJzZXdjYWV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MjI4MjAsImV4cCI6MjA4OTA5ODgyMH0.ZxDwD3TIYg9dL2pvJPaTInLmlQu95Xv7BVB_PAezt9Q';

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const client = createClient(supabaseUrl, anonKey);

async function setAndVerifyAdminPassword() {
  const adminEmail = 'admin@tmsavannah.com';
  const newPassword = 'AdminOps2026!';

  // Find user
  const { data: { users }, error: listErr } = await adminClient.auth.admin.listUsers();
  const user = users.find(u => u.email.toLowerCase() === adminEmail.toLowerCase());
  
  if (!user) {
    console.error('User not found:', adminEmail);
    return;
  }

  console.log(`Setting password for ${adminEmail} (ID: ${user.id})...`);
  const { data: updated, error: updateErr } = await adminClient.auth.admin.updateUserById(user.id, {
    password: newPassword,
    email_confirm: true,
    user_metadata: { ...user.user_metadata, role: 'system_admin' }
  });

  if (updateErr) {
    console.error('Failed to update password:', updateErr);
    return;
  }
  console.log('✓ Password updated successfully to:', newPassword);

  // Also ensure profile has system_role = 'system_admin'
  const { error: pErr } = await adminClient.from('profiles').upsert({
    id: user.id,
    display_name: 'Master Ops Admin',
    system_role: 'system_admin'
  });
  if (pErr) console.warn('Profile upsert warning:', pErr);
  else console.log('✓ Profile system_role confirmed as system_admin');

  // Verify sign in
  console.log('Testing sign in with updated credentials...');
  const { data: authData, error: signInErr } = await client.auth.signInWithPassword({
    email: adminEmail,
    password: newPassword
  });

  if (signInErr) {
    console.error('Sign in test failed:', signInErr);
  } else {
    console.log('✓ Sign in successful! Session token generated for:', authData.user.email);
  }
}

setAndVerifyAdminPassword();
