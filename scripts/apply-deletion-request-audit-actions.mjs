import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('Applying deletion request audit actions migration...');

  try {
    // First, let's check if we can query the audit_logs table
    const { data, error } = await supabase
      .from('audit_logs')
      .select('action')
      .limit(1);

    if (error) {
      console.error('Error querying audit_logs:', error);
      return;
    }

    console.log('Successfully connected to database');
    console.log('\nPlease run the following SQL manually in your Supabase SQL Editor:');
    console.log('\n--- Start SQL ---');
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
    'department_deleted',
    'deletion_request_submitted',
    'deletion_request_cancelled',
    'deletion_request_approved',
    'deletion_request_rejected'
  ));
    `);
    console.log('--- End SQL ---\n');
    console.log('After running the SQL, press Enter to continue...');
  } catch (error) {
    console.error('Error:', error);
  }
}

applyMigration();
