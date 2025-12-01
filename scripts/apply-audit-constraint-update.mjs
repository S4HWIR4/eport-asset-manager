import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function updateConstraint() {
  console.log('🔧 Updating audit_logs action constraint...\n');

  try {
    // First, let's check the current constraint
    const { data: constraints, error: checkError } = await supabase
      .from('information_schema.table_constraints')
      .select('*')
      .eq('table_name', 'audit_logs')
      .eq('constraint_type', 'CHECK');

    if (checkError) {
      console.log('Note: Could not check existing constraints (this is okay)');
    }

    // Since we can't execute raw SQL directly, we'll need to use the Supabase SQL editor
    // or apply the migration manually
    console.log('⚠️  Direct SQL execution is not available through the client.');
    console.log('\n📋 Please run the following SQL in your Supabase SQL Editor:\n');
    console.log('---');
    console.log(fs.readFileSync('supabase/migrations/20241128000004_add_deletion_audit_actions.sql', 'utf8'));
    console.log('---\n');
    console.log('Or use the Supabase CLI: supabase db push');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateConstraint();
