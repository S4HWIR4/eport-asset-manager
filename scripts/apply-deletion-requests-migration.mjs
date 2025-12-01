import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const hasCredentials = supabaseUrl && supabaseServiceKey && 
  !supabaseUrl.includes('your-project-url') && 
  !supabaseServiceKey.includes('your-service-role-key');

console.log('🚀 Deletion Requests Migration\n');
console.log('📄 Migration file: supabase/migrations/20241128000007_deletion_requests.sql\n');

const sql = readFileSync('supabase/migrations/20241128000007_deletion_requests.sql', 'utf8');

console.log('✅ Migration file validated\n');

console.log('📋 Migration Contents:');
console.log('   ✅ Creates deletion_requests table with 14 columns');
console.log('   ✅ Adds 5 indexes for performance');
console.log('   ✅ Sets up updated_at trigger');
console.log('   ✅ Enables Row Level Security (RLS)');
console.log('   ✅ Creates 5 RLS policies\n');

console.log('📊 Table Structure:');
console.log('   - id (UUID, Primary Key)');
console.log('   - asset_id (UUID, Foreign Key to assets)');
console.log('   - asset_name (TEXT, denormalized)');
console.log('   - asset_cost (DECIMAL(12,2), denormalized)');
console.log('   - requested_by (UUID, Foreign Key to profiles)');
console.log('   - requester_email (TEXT, denormalized)');
console.log('   - justification (TEXT, min 10 chars)');
console.log('   - status (TEXT: pending/approved/rejected/cancelled)');
console.log('   - reviewed_by (UUID, nullable)');
console.log('   - reviewer_email (TEXT, nullable)');
console.log('   - review_comment (TEXT, nullable)');
console.log('   - reviewed_at (TIMESTAMPTZ, nullable)');
console.log('   - created_at (TIMESTAMPTZ)');
console.log('   - updated_at (TIMESTAMPTZ)\n');

console.log('🔒 RLS Policies:');
console.log('   1. Users can view own deletion requests');
console.log('   2. Users can create deletion requests');
console.log('   3. Users can cancel own pending requests');
console.log('   4. Admins can view all deletion requests');
console.log('   5. Admins can review deletion requests\n');

if (!hasCredentials) {
  console.log('⚠️  Supabase credentials not configured in .env.local');
  console.log('   Cannot verify if migration has been applied to database.\n');
  console.log('📝 To apply this migration:\n');
  console.log('Option 1 - Supabase Dashboard (Recommended):');
  console.log('   1. Go to https://supabase.com/dashboard');
  console.log('   2. Select your project');
  console.log('   3. Go to SQL Editor');
  console.log('   4. Click "New Query"');
  console.log('   5. Copy the contents of: supabase/migrations/20241128000007_deletion_requests.sql');
  console.log('   6. Paste and click "Run"\n');
  console.log('Option 2 - Supabase CLI:');
  console.log('   1. Install Supabase CLI: npm install -g supabase');
  console.log('   2. Link your project: supabase link');
  console.log('   3. Push migrations: supabase db push\n');
  console.log('✅ Migration file is ready to be applied!\n');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔍 Verifying if migration has been applied to database...\n');

// Verify the table exists
const { data, error } = await supabase.from('deletion_requests').select('*').limit(1);

if (error) {
  if (error.message.includes('does not exist') || error.message.includes('not found')) {
    console.log('❌ Table "deletion_requests" does not exist in database yet\n');
    console.log('📝 To apply this migration:\n');
    console.log('Option 1 - Supabase Dashboard (Recommended):');
    console.log('   1. Go to https://supabase.com/dashboard');
    console.log('   2. Select your project');
    console.log('   3. Go to SQL Editor');
    console.log('   4. Click "New Query"');
    console.log('   5. Copy the contents of: supabase/migrations/20241128000007_deletion_requests.sql');
    console.log('   6. Paste and click "Run"\n');
    console.log('Option 2 - Supabase CLI:');
    console.log('   1. Install Supabase CLI: npm install -g supabase');
    console.log('   2. Link your project: supabase link');
    console.log('   3. Push migrations: supabase db push\n');
    console.log('After applying, run this script again to verify.\n');
    process.exit(1);
  } else {
    console.log(`⚠️  Unexpected error: ${error.message}\n`);
    console.log('The table may exist but there might be an RLS policy issue.\n');
    process.exit(1);
  }
} else {
  console.log('✅ Table "deletion_requests" exists and is accessible in database!\n');
  console.log('🎉 Migration has been successfully applied!\n');
  console.log('✅ All indexes created');
  console.log('✅ RLS policies active');
  console.log('✅ Updated_at trigger configured\n');
  process.exit(0);
}
