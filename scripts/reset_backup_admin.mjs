import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ocsuqfabqsyrbsewcaez.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jc3VxZmFicXN5cmJzZXdjYWV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzUyMjgyMCwiZXhwIjoyMDg5MDk4ODIwfQ.HYys17PBfYfhNgfGAJTrGmsVhgKf_jXHcdRvr_A0ikk';

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function updateMemurugat() {
  const email = 'memurugat@gmail.com';
  const newPassword = 'AdminOps2026!';

  const { data: { users } } = await adminClient.auth.admin.listUsers();
  const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
  if (user) {
    await adminClient.auth.admin.updateUserById(user.id, {
      password: newPassword,
      email_confirm: true,
      user_metadata: { ...user.user_metadata, role: 'system_admin' }
    });
    console.log(`✓ Updated backup admin ${email} with password: ${newPassword}`);
  }
}

updateMemurugat();
