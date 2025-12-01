import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testAuditInsert() {
  console.log('🧪 Testing audit log insert with new action types...\n');

  // Get a test admin user
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .limit(1);

  if (!profiles || profiles.length === 0) {
    console.error('❌ No admin user found for testing');
    process.exit(1);
  }

  const adminId = profiles[0].id;

  // Test all CRUD action types
  const actionTypes = [
    'asset_created', 'asset_updated', 'asset_deleted',
    'user_created', 'user_updated', 'user_deleted',
    'category_created', 'category_updated', 'category_deleted',
    'department_created', 'department_updated', 'department_deleted'
  ];

  const testResults = [];
  
  for (const action of actionTypes) {
    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        action: action,
        entity_type: action.split('_')[0], // Extract entity type from action
        entity_id: '00000000-0000-0000-0000-000000000000',
        entity_data: { test: true },
        performed_by: adminId,
      })
      .select();

    if (error) {
      testResults.push({ action, success: false, error: error.message });
    } else {
      testResults.push({ action, success: true });
      // Clean up immediately
      if (data && data[0]) {
        await supabase.from('audit_logs').delete().eq('id', data[0].id);
      }
    }
  }

  const failedTests = testResults.filter(r => !r.success);
  
  if (failedTests.length > 0) {
    console.error(`❌ ${failedTests.length} action type(s) failed:\n`);
    failedTests.forEach(t => console.log(`   - ${t.action}: ${t.error}`));
    console.log('\n⚠️  The constraint needs to be updated manually.');
    console.log('Please run this SQL in your Supabase SQL Editor:\n');
    console.log('ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;');
    console.log(`ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_check 
  CHECK (action IN (
    'asset_created',
    'asset_updated',
    'asset_deleted', 
    'user_created', 
    'user_updated',
    'user_deleted',
    'category_created',
    'category_updated',
    'category_deleted',
    'department_created',
    'department_updated',
    'department_deleted'
  ));`);
    process.exit(1);
  }

  console.log('✅ Successfully tested all audit log action types');
  console.log('🎉 Constraint is already updated!');
  console.log(`\n📊 Tested ${actionTypes.length} action types - all passed!`);
}

testAuditInsert();
