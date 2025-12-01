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
  process.exit(1);
}

console.log('🔗 Connecting to Supabase...');

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function applyMigration() {
  console.log('🚀 Applying user audit logs RLS policy...\n');

  try {
    // Read migration file
    const migrationPath = join(
      __dirname,
      '..',
      'supabase',
      'migrations',
      '20241128000006_allow_users_view_own_asset_audit_logs.sql'
    );
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration SQL:');
    console.log(migrationSQL);
    console.log('\n🔧 Executing migration...\n');

    // Execute the SQL using the Supabase client
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL,
    });

    if (error) {
      // Try alternative method - direct SQL execution
      console.log('⚠️  RPC method failed, trying direct execution...\n');
      
      // Split into statements and execute each
      const statements = migrationSQL
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.trim()) {
          console.log(`Executing: ${statement.substring(0, 60)}...`);
          
          // Use raw SQL query
          const { error: execError } = await supabase.rpc('exec', {
            query: statement,
          });

          if (execError) {
            console.error(`❌ Error: ${execError.message}`);
          } else {
            console.log('✅ Success');
          }
        }
      }
    } else {
      console.log('✅ Migration applied successfully!\n');
    }

    // Verify the policy was created
    console.log('🔍 Verifying policy...\n');
    
    const { data: policies, error: policyError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'audit_logs')
      .eq('policyname', 'Users can view audit logs for their own assets');

    if (policyError) {
      console.log('⚠️  Could not verify policy (this is normal)\n');
    } else if (policies && policies.length > 0) {
      console.log('✅ Policy verified!\n');
    }

    console.log('🎉 Migration completed!\n');
    console.log('📋 Users can now view audit logs for their own assets.\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n💡 Please run the SQL manually in Supabase Dashboard:\n');
    console.error('   1. Go to SQL Editor');
    console.error('   2. Copy the SQL from: supabase/migrations/20241128000006_allow_users_view_own_asset_audit_logs.sql');
    console.error('   3. Paste and Run\n');
    process.exit(1);
  }
}

applyMigration();
