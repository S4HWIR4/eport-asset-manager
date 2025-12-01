import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function updateConstraint() {
  try {
    console.log('🚀 Updating audit_logs action constraint...\n');

    // First, drop the existing constraint
    console.log('1. Dropping existing constraint...');
    const { error: dropError } = await supabase.rpc('exec', {
      sql: 'ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;'
    });

    if (dropError) {
      console.log('⚠️  Note: Could not drop constraint (may not exist or RPC not available)');
      console.log('   This is okay if the constraint doesn\'t exist yet.');
    } else {
      console.log('✅ Constraint dropped');
    }

    // Add the new constraint with all action types
    console.log('\n2. Adding new constraint with all action types...');
    const { error: addError } = await supabase.rpc('exec', {
      sql: `ALTER TABLE public.audit_logs 
        ADD CONSTRAINT audit_logs_action_check 
        CHECK (action IN (
          'asset_deleted',
          'asset_created',
          'asset_updated',
          'user_created',
          'user_updated',
          'category_created',
          'category_updated',
          'category_deleted',
          'department_created',
          'department_updated',
          'department_deleted'
        ));`
    });

    if (addError) {
      console.error('❌ Error adding constraint:', addError.message);
      console.log('\n📝 Please run this SQL manually in Supabase SQL Editor:');
      console.log(`
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;

ALTER TABLE public.audit_logs 
  ADD CONSTRAINT audit_logs_action_check 
  CHECK (action IN (
    'asset_deleted',
    'asset_created',
    'asset_updated',
    'user_created',
    'user_updated',
    'category_created',
    'category_updated',
    'category_deleted',
    'department_created',
    'department_updated',
    'department_deleted'
  ));
      `);
    } else {
      console.log('✅ Constraint added successfully!');
    }

    console.log('\n🎉 Done!');
  } catch (error) {
    console.error('❌ Error:', error);
    console.log('\n📝 Please run the migration SQL manually in Supabase SQL Editor.');
    process.exit(1);
  }
}

updateConstraint();
