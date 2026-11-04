import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ocsuqfabqsyrbsewcaez.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jc3VxZmFicXN5cmJzZXdjYWV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzUyMjgyMCwiZXhwIjoyMDg5MDk4ODIwfQ.HYys17PBfYfhNgfGAJTrGmsVhgKf_jXHcdRvr_A0ikk';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('Error listing users:', error);
    return;
  }
  console.log(`Found ${users.length} users in auth.users:`);
  for (const u of users) {
    console.log(`- ID: ${u.id} | Email: ${u.email} | Confirmed: ${Boolean(u.email_confirmed_at)} | Metadata:`, u.user_metadata);
  }

  const { data: profiles, error: pError } = await supabase.from('profiles').select('*');
  if (pError) {
    console.error('Error fetching profiles:', pError);
  } else {
    console.log(`Found ${profiles.length} profiles:`);
    for (const p of profiles) {
      console.log(`- Profile: ${p.id} | ${p.display_name} | system_role: ${p.system_role}`);
    }
  }
}

main();
