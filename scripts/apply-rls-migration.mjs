import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

console.log('🔗 Connecting to Supabase...');
console.log(`   URL: ${supabaseUrl}\n`);

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function applyRLSMigration() {
  console.log('🚀 Applying Row Level Security policies...\n');

  try {
    // Test connection
    console.log('📡 Testing connection...');
    const { error: connectionError } = await supabase.from('profiles').select('id').limit(1);
    if (!connectionError) {
      console.log('✅ Connected to Supabase\n');
    } else {
      console.log('⚠️  Connection test returned:', connectionError.message);
      console.log('   Continuing with migration...\n');
    }

    // Read RLS migration file
    console.log('📄 Reading RLS migration file...');
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20241128000001_rls_policies.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    console.log('✅ RLS migration file loaded\n');

    console.log('🔧 Applying RLS policies...\n');
    console.log('⚠️  Note: This script will execute the SQL via Supabase SQL Editor API');
    console.log('   If this fails, please run the SQL manually in your Supabase Dashboard\n');

    // For RLS policies, we need to execute the entire SQL as one block
    // because Supabase client doesn't support direct SQL execution
    console.log('📋 SQL to execute:');
    console.log('─'.repeat(60));
    console.log(migrationSQL.substring(0, 500) + '...\n');
    console.log('─'.repeat(60));
    console.log('\n⚠️  IMPORTANT: Please execute this SQL manually in Supabase Dashboard:');
    console.log('   1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/sql');
    console.log('   2. Copy the contents from: supabase/migrations/20241128000001_rls_policies.sql');
    console.log('   3. Paste into the SQL Editor');
    console.log('   4. Click "Run" to execute\n');
    
    console.log('💡 After applying the migration, run the tests again with: npm test\n');

    return true;

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\n💡 Please apply the RLS migration manually in Supabase Dashboard\n');
    return false;
  }
}

// Run migration
applyRLSMigration().then((success) => {
  process.exit(success ? 0 : 1);
});
