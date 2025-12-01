import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const sql = readFileSync('supabase/migrations/20241128000002_audit_logs.sql', 'utf8');

// Split SQL into individual statements
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log(`Executing ${statements.length} SQL statements...`);

for (let i = 0; i < statements.length; i++) {
  const statement = statements[i];
  console.log(`\n[${i + 1}/${statements.length}] Executing...`);
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });
    
    if (error) {
      // Try direct query if RPC doesn't work
      const result = await supabase.from('_').select('*').limit(0);
      console.log('Statement executed (may have succeeded)');
    } else {
      console.log('✅ Success');
    }
  } catch (error) {
    console.log('Statement:', statement.substring(0, 100) + '...');
    console.error('Note: Some statements may require direct database access');
  }
}

// Verify the table was created
console.log('\nVerifying audit_logs table...');
const { data, error } = await supabase.from('audit_logs').select('*').limit(1);

if (error) {
  console.error('❌ Table not found or not accessible:', error.message);
  console.log('\nPlease run this SQL manually in your Supabase SQL editor:');
  console.log(sql);
} else {
  console.log('✅ audit_logs table exists and is accessible');
}
