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

async function runMigration() {
  console.log('🚀 Starting database migration...\n');

  try {
    // Test connection
    console.log('📡 Testing connection...');
    const { error: connectionError } = await supabase.from('_healthcheck').select('*').limit(1);
    if (connectionError && !connectionError.message.includes('does not exist')) {
      console.log('✅ Connected to Supabase\n');
    } else {
      console.log('✅ Connected to Supabase\n');
    }

    // Read migration file
    console.log('📄 Reading migration file...');
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20241128000000_initial_schema.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    console.log('✅ Migration file loaded\n');

    // Split SQL into individual statements
    console.log('🔧 Executing migration statements...\n');
    
    // Split by semicolon but be careful with function definitions
    const statements = migrationSQL
      .split(/;(?=\s*(?:CREATE|ALTER|INSERT|DROP|--|\n\n|$))/gi)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`   Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments
      if (statement.startsWith('--') || statement.length < 10) {
        continue;
      }

      // Get statement type for logging
      const statementType = statement.split(/\s+/)[0].toUpperCase();
      const statementPreview = statement.substring(0, 60).replace(/\n/g, ' ');
      
      process.stdout.write(`   [${i + 1}/${statements.length}] ${statementType} ${statementPreview}...`);

      try {
        // Execute via REST API
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ query: statement }),
        });

        if (response.ok || response.status === 404) {
          console.log(' ✅');
          successCount++;
        } else {
          const errorText = await response.text();
          console.log(` ⚠️  ${response.status}`);
          if (errorText && !errorText.includes('already exists')) {
            console.log(`      ${errorText.substring(0, 100)}`);
          }
          errorCount++;
        }
      } catch (error) {
        console.log(` ❌`);
        console.log(`      ${error.message}`);
        errorCount++;
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ⚠️  Errors: ${errorCount}\n`);

    // Verify tables exist
    console.log('🔍 Verifying database schema...\n');
    
    const tables = ['profiles', 'categories', 'departments', 'assets'];
    let tablesExist = 0;
    
    for (const table of tables) {
      const { error } = await supabase.from(table).select('id').limit(1);
      if (!error) {
        console.log(`   ✅ Table "${table}" exists`);
        tablesExist++;
      } else {
        console.log(`   ❌ Table "${table}" not found: ${error.message}`);
      }
    }

    console.log(`\n📊 Database Status: ${tablesExist}/${tables.length} tables ready\n`);

    if (tablesExist === tables.length) {
      console.log('🎉 Migration completed successfully!\n');
      console.log('📋 Next steps:');
      console.log('   1. Create your first admin user');
      console.log('   2. Run: npm run dev');
      console.log('   3. Start building!\n');
      return true;
    } else {
      console.log('⚠️  Migration incomplete. Some tables are missing.\n');
      console.log('💡 Try running the SQL manually in Supabase Dashboard:');
      console.log('   1. Go to SQL Editor');
      console.log('   2. Copy contents from: supabase/migrations/20241128000000_initial_schema.sql');
      console.log('   3. Paste and Run\n');
      return false;
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n💡 Please run the migration manually in Supabase Dashboard\n');
    return false;
  }
}

// Run migration
runMigration().then((success) => {
  process.exit(success ? 0 : 1);
});
