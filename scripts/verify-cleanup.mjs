import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function verifyCleanup() {
  console.log('🔍 Verifying database cleanup...\n');

  try {
    // Check profiles
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('email, role');

    if (profileError) {
      console.error('❌ Error fetching profiles:', profileError.message);
    } else {
      console.log(`👥 Profiles: ${profiles.length} users`);
      profiles.forEach(p => console.log(`   - ${p.email} (${p.role})`));
      console.log('');
    }

    // Check assets
    const { count: assetCount, error: assetError } = await supabase
      .from('assets')
      .select('*', { count: 'exact', head: true });

    if (assetError) {
      console.error('❌ Error counting assets:', assetError.message);
    } else {
      console.log(`📦 Assets: ${assetCount || 0}`);
    }

    // Check categories
    const { count: categoryCount, error: categoryError } = await supabase
      .from('categories')
      .select('*', { count: 'exact', head: true });

    if (categoryError) {
      console.error('❌ Error counting categories:', categoryError.message);
    } else {
      console.log(`📁 Categories: ${categoryCount || 0}`);
    }

    // Check departments
    const { count: departmentCount, error: departmentError } = await supabase
      .from('departments')
      .select('*', { count: 'exact', head: true });

    if (departmentError) {
      console.error('❌ Error counting departments:', departmentError.message);
    } else {
      console.log(`🏢 Departments: ${departmentCount || 0}`);
    }

    // Check deletion requests
    const { count: deletionRequestCount, error: deletionRequestError } = await supabase
      .from('deletion_requests')
      .select('*', { count: 'exact', head: true });

    if (deletionRequestError) {
      console.error('❌ Error counting deletion requests:', deletionRequestError.message);
    } else {
      console.log(`🗑️  Deletion Requests: ${deletionRequestCount || 0}`);
    }

    // Check audit logs
    const { count: auditLogCount, error: auditLogError } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true });

    if (auditLogError) {
      console.error('❌ Error counting audit logs:', auditLogError.message);
    } else {
      console.log(`📋 Audit Logs: ${auditLogCount || 0}`);
    }

    // Check auth users
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error listing auth users:', authError.message);
    } else {
      console.log(`\n🔐 Auth Users: ${authUsers.length}`);
      authUsers.forEach(u => console.log(`   - ${u.email}`));
    }

    console.log('\n✅ Verification complete!');

  } catch (error) {
    console.error('❌ Error during verification:', error.message);
    process.exit(1);
  }
}

verifyCleanup();
