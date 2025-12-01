import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateConstraint() {
  console.log('🔧 Updating audit_logs action constraint...');

  // Drop the old constraint
  const { error: dropError } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;'
  });

  if (dropError) {
    console.error('❌ Error dropping constraint:', dropError);
    process.exit(1);
  }

  console.log('✅ Old constraint dropped');

  // Add the new constraint with additional action types
  const { error: addError } = await supabase.rpc('exec_sql', {
    sql: `ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_check 
      CHECK (action IN (
        'asset_deleted', 
        'asset_created', 
        'asset_updated', 
        'user_created', 
        'user_updated',
        'user_deleted',
        'department_deleted',
        'category_deleted'
      ));`
  });

  if (addError) {
    console.error('❌ Error adding new constraint:', addError);
    process.exit(1);
  }

  console.log('✅ New constraint added successfully');
  console.log('🎉 Audit logs now support user_deleted, department_deleted, and category_deleted actions');
}

updateConstraint();
