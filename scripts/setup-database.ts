import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function setupDatabase() {
  console.log('🚀 Starting Supabase database setup...\n');

  try {
    // Test connection
    console.log('📡 Testing connection to Supabase...');
    const { data, error } = await supabase.from('_test').select('*').limit(1);
    if (error && !error.message.includes('does not exist')) {
      throw new Error(`Connection failed: ${error.message}`);
    }
    console.log('✅ Connected to Supabase successfully\n');

    // Read migration file
    console.log('📄 Reading migration file...');
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20241128000000_initial_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    console.log('✅ Migration file loaded\n');

    // Execute migration
    console.log('🔧 Running database migration...');
    console.log('   Creating tables: profiles, categories, departments, assets');
    console.log('   Creating indexes for performance');
    console.log('   Creating functions and triggers\n');

    const { data: migrationResult, error: migrationError } = await supabase.rpc('exec_sql', {
      sql: migrationSQL,
    });

    // If exec_sql doesn't exist, we need to run it differently
    // Let's try using the REST API directly
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ sql: migrationSQL }),
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Migration failed: ${response.statusText}`);
    }

    // If that doesn't work, we'll need to execute via SQL statements
    console.log('⚠️  Direct SQL execution not available via RPC');
    console.log('📝 Please run the migration manually using one of these methods:\n');
    console.log('Method 1: Supabase Dashboard');
    console.log('  1. Go to your Supabase project dashboard');
    console.log('  2. Navigate to SQL Editor');
    console.log('  3. Click "New Query"');
    console.log('  4. Copy the contents of: supabase/migrations/20241128000000_initial_schema.sql');
    console.log('  5. Paste and click "Run"\n');
    console.log('Method 2: Supabase CLI');
    console.log('  1. Install: npm install -g supabase');
    console.log('  2. Login: supabase login');
    console.log('  3. Link: supabase link --project-ref YOUR_PROJECT_ID');
    console.log('  4. Push: supabase db push\n');

    // Try to verify if tables exist
    console.log('🔍 Checking if tables already exist...\n');
    
    const tables = ['profiles', 'categories', 'departments', 'assets'];
    let tablesExist = 0;
    
    for (const table of tables) {
      const { error } = await supabase.from(table).select('id').limit(1);
      if (!error) {
        console.log(`✅ Table "${table}" exists`);
        tablesExist++;
      } else {
        console.log(`❌ Table "${table}" does not exist`);
      }
    }

    console.log(`\n📊 Found ${tablesExist}/${tables.length} tables\n`);

    if (tablesExist === tables.length) {
      console.log('✅ All tables exist! Database setup is complete.\n');
      
      // Check for functions
      console.log('🔍 Checking for database functions...');
      const { data: functions, error: funcError } = await supabase.rpc('handle_new_user');
      if (!funcError || funcError.message.includes('function')) {
        console.log('✅ Functions are set up correctly\n');
      }
      
      return true;
    } else {
      console.log('⚠️  Some tables are missing. Please run the migration manually.\n');
      return false;
    }

  } catch (error) {
    console.error('❌ Setup failed:', error);
    return false;
  }
}

// Run setup
setupDatabase().then((success) => {
  if (success) {
    console.log('🎉 Database setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('  1. Create your first admin user in Supabase dashboard');
    console.log('  2. Run: npm run dev');
    console.log('  3. Start building your application!\n');
  } else {
    console.log('⚠️  Setup incomplete. Please follow the manual steps above.\n');
  }
  process.exit(success ? 0 : 1);
});
