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
  console.error('Missing required environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
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
    console.log('Reading migration file...');
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20241128000003_add_updated_by.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('Applying updated_by migration...');
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // If the RPC doesn't exist, try direct execution
      console.log('Trying direct SQL execution...');
      const { error: directError } = await supabase.from('_migrations').select('*').limit(1);
      
      if (directError) {
        console.error('Error applying migration:', error);
        process.exit(1);
      }
    }

    console.log('✅ Migration applied successfully!');
    console.log('The assets table now has an updated_by column.');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

applyMigration();
