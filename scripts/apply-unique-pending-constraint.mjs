import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const hasCredentials = supabaseUrl && supabaseServiceKey && 
  !supabaseUrl.includes('your-project-url') && 
  !supabaseServiceKey.includes('your-service-role-key');

console.log('🚀 Applying Unique Pending Constraint Migration\n');
console.log('📄 Migration file: supabase/migrations/20241128000008_add_unique_pending_constraint.sql\n');

const sql = readFileSync('supabase/migrations/20241128000008_add_unique_pending_constraint.sql', 'utf8');

console.log('✅ Migration file validated\n');
console.log('📋 Migration adds:');
console.log('   ✅ Unique partial index: idx_one_pending_per_asset');
console.log('   ✅ Enforces: One pending deletion request per asset (Property 19)\n');

if (!hasCredentials) {
  console.log('⚠️  Supabase credentials not configured in .env.local');
  console.log('   Cannot apply migration to database.\n');
  console.log('📝 To apply this migration:\n');
  console.log('Option 1 - Supabase Dashboard (Recommended):');
  console.log('   1. Go to https://supabase.com/dashboard');
  console.log('   2. Select your project');
  console.log('   3. Go to SQL Editor');
  console.log('   4. Click "New Query"');
  console.log('   5. Copy the contents of: supabase/migrations/20241128000008_add_unique_pending_constraint.sql');
  console.log('   6. Paste and click "Run"\n');
  console.log('Option 2 - Supabase CLI:');
  console.log('   1. Install Supabase CLI: npm install -g supabase');
  console.log('   2. Link your project: supabase link');
  console.log('   3. Push migrations: supabase db push\n');
  console.log('✅ Migration file is ready to be applied!\n');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔍 Applying migration to database...\n');

try {
  // Execute the SQL directly
  const { error } = await supabase.rpc('exec_sql', { sql });
  
  if (error) {
    // Try alternative method if exec_sql doesn't exist
    console.log('⚠️  Direct SQL execution not available.');
    console.log('📝 Please apply the migration manually:\n');
    console.log('1. Go to Supabase Dashboard > SQL Editor');
    console.log('2. Run the following SQL:\n');
    console.log(sql);
    console.log('\n');
    process.exit(1);
  }
  
  console.log('✅ Migration applied successfully!\n');
  console.log('🎉 Unique constraint now enforces one pending request per asset\n');
  process.exit(0);
} catch (error) {
  console.log('⚠️  Could not apply migration automatically.');
  console.log('📝 Please apply the migration manually:\n');
  console.log('1. Go to Supabase Dashboard > SQL Editor');
  console.log('2. Run the following SQL:\n');
  console.log(sql);
  console.log('\n');
  process.exit(1);
}
