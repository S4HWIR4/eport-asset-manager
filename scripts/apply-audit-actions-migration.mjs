import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

async function applyMigration() {
  try {
    console.log('🚀 Applying audit actions migration...\n');

    // Read the migration file
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20241128000005_add_category_department_audit_actions.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration SQL:');
    console.log(migrationSQL);
    console.log('');

    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // Try direct execution if RPC doesn't work
      console.log('⚠️  RPC method failed, trying direct execution...\n');
      
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const statement of statements) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        const { error: execError } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (execError) {
          console.error(`❌ Error: ${execError.message}`);
        } else {
          console.log('✅ Success');
        }
      }
    } else {
      console.log('✅ Migration applied successfully!');
    }

    console.log('\n🎉 Done!');
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    process.exit(1);
  }
}

applyMigration();
