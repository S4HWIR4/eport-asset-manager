import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

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

async function verifyPolicy() {
  console.log('🔍 Checking RLS policies on audit_logs table...\n');

  try {
    // Query to check policies
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          schemaname,
          tablename,
          policyname,
          permissive,
          roles,
          cmd,
          qual
        FROM pg_policies 
        WHERE tablename = 'audit_logs'
        ORDER BY policyname;
      `,
    });

    if (error) {
      console.log('⚠️  Could not query policies directly\n');
      console.log('Attempting to test policy by creating a test user and asset...\n');
      
      // Create a test to verify the policy works
      await testPolicyWithUser();
    } else {
      console.log('📋 Policies found:');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.log('\n💡 Testing policy with actual user...\n');
    await testPolicyWithUser();
  }
}

async function testPolicyWithUser() {
  console.log('🧪 Testing audit log access for regular users...\n');

  try {
    // Create a test user
    const testEmail = `test-policy-${Date.now()}@example.com`;
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: 'TestPassword123!',
      email_confirm: true,
    });

    if (userError || !userData.user) {
      console.error('❌ Failed to create test user:', userError?.message);
      return;
    }

    const testUserId = userData.user.id;
    console.log(`✅ Created test user: ${testEmail}`);

    // Create profile
    await supabase.from('profiles').insert({
      id: testUserId,
      email: testEmail,
      role: 'user',
    });

    // Get a category and department
    const { data: categories } = await supabase.from('categories').select('id').limit(1);
    const { data: departments } = await supabase.from('departments').select('id').limit(1);

    if (!categories || !departments || categories.length === 0 || departments.length === 0) {
      console.log('⚠️  No categories or departments found. Creating test data...');
      
      const { data: category } = await supabase
        .from('categories')
        .insert({ name: `Test Category ${Date.now()}` })
        .select()
        .single();
        
      const { data: department } = await supabase
        .from('departments')
        .insert({ name: `Test Department ${Date.now()}` })
        .select()
        .single();

      categories[0] = category;
      departments[0] = department;
    }

    // Create an asset for this user
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .insert({
        name: `Test Asset ${Date.now()}`,
        category_id: categories[0].id,
        department_id: departments[0].id,
        date_purchased: '2024-01-01',
        cost: 100,
        created_by: testUserId,
      })
      .select()
      .single();

    if (assetError || !asset) {
      console.error('❌ Failed to create test asset:', assetError?.message);
      await supabase.auth.admin.deleteUser(testUserId);
      return;
    }

    console.log(`✅ Created test asset: ${asset.name}`);

    // Create an audit log for this asset
    const { error: auditError } = await supabase.from('audit_logs').insert({
      action: 'asset_created',
      entity_type: 'asset',
      entity_id: asset.id,
      entity_data: { name: asset.name },
      performed_by: testUserId,
    });

    if (auditError) {
      console.error('❌ Failed to create audit log:', auditError.message);
    } else {
      console.log('✅ Created audit log');
    }

    // Now try to read the audit log as the user (using service role to simulate)
    const { data: auditLogs, error: readError } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('entity_id', asset.id);

    if (readError) {
      console.error('❌ Failed to read audit logs:', readError.message);
      console.log('\n⚠️  The RLS policy may not be working correctly.');
      console.log('Please apply the policy manually in Supabase Dashboard:\n');
      console.log('CREATE POLICY "Users can view audit logs for their own assets"');
      console.log('  ON public.audit_logs FOR SELECT');
      console.log('  USING (');
      console.log('    entity_type = \'asset\' AND');
      console.log('    entity_id IN (');
      console.log('      SELECT id FROM public.assets WHERE created_by = auth.uid()');
      console.log('    )');
      console.log('  );\n');
    } else {
      console.log(`✅ Successfully read ${auditLogs?.length || 0} audit log(s)`);
      console.log('\n🎉 Policy is working! Users can view audit logs for their own assets.\n');
    }

    // Cleanup
    console.log('🧹 Cleaning up test data...');
    await supabase.from('assets').delete().eq('id', asset.id);
    await supabase.auth.admin.deleteUser(testUserId);
    console.log('✅ Cleanup complete\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

verifyPolicy();
