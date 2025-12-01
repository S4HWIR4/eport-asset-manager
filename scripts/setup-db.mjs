import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing credentials in .env.local');
  process.exit(1);
}

console.log('🚀 Setting up Supabase database...\n');
console.log(`📍 URL: ${supabaseUrl}\n`);

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setup() {
  try {
    // Read migration
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20241128000000_initial_schema.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    console.log('📄 Loaded migration file\n');
    console.log('🔧 Executing SQL via Supabase Management API...\n');

    // Use Supabase Management API to execute SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ query: sql }),
    });

    console.log(`Response status: ${response.status}\n`);

    // Check if tables exist
    console.log('🔍 Verifying tables...\n');
    
    const tables = ['profiles', 'categories', 'departments', 'assets'];
    
    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('id').limit(1);
      if (!error) {
        console.log(`✅ ${table}`);
      } else {
        console.log(`❌ ${table}: ${error.message}`);
      }
    }

    console.log('\n✅ Setup complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setup();
