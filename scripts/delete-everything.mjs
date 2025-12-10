import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function deleteEverything() {
  console.log('🗑️  DELETING EVERYTHING FROM DATABASE...\n');
  console.log('⚠️  This will delete ALL data including ALL users!\n');

  try {
    // 1. Delete deletion requests
    console.log('🗑️  Deleting deletion requests...');
    const { error: deletionRequestError } = await supabase
      .from('deletion_requests')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deletionRequestError) {
      console.error(`⚠️  Warning: ${deletionRequestError.message}`);
    } else {
      console.log('✅ Deletion requests deleted\n');
    }

    // 2. Delete assets
    console.log('🗑️  Deleting assets...');
    const { error: assetError } = await supabase
      .from('assets')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (assetError) {
      console.error(`⚠️  Warning: ${assetError.message}`);
    } else {
      console.log('✅ Assets deleted\n');
    }

    // 3. Delete categories
    console.log('🗑️  Deleting categories...');
    const { error: categoryError } = await supabase
      .from('categories')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (categoryError) {
      console.error(`⚠️  Warning: ${categoryError.message}`);
    } else {
      console.log('✅ Categories deleted\n');
    }

    // 4. Delete departments
    console.log('🗑️  Deleting departments...');
    const { error: departmentError } = await supabase
      .from('departments')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (departmentError) {
      console.error(`⚠️  Warning: ${departmentError.message}`);
    } else {
      console.log('✅ Departments deleted\n');
    }

    // 5. Delete audit logs
    console.log('🗑️  Deleting audit logs...');
    const { error: auditError } = await supabase
      .from('audit_logs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (auditError) {
      console.error(`⚠️  Warning: ${auditError.message}`);
    } else {
      console.log('✅ Audit logs deleted\n');
    }

    // 6. Delete ALL profiles
    console.log('🗑️  Deleting ALL profiles...');
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (profileError) {
      console.error(`⚠️  Warning: ${profileError.message}`);
    } else {
      console.log('✅ All profiles deleted\n');
    }

    // 7. Delete ALL auth users in batches
    console.log('🗑️  Deleting ALL auth users...');
    let totalDeleted = 0;
    let hasMore = true;
    let iteration = 1;

    while (hasMore) {
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
      
      if (listError) {
        console.error(`⚠️  Warning: ${listError.message}`);
        break;
      }

      if (users.length === 0) {
        hasMore = false;
        break;
      }

      console.log(`   Batch ${iteration}: Deleting ${users.length} users...`);

      let deletedInBatch = 0;
      for (const user of users) {
        const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(user.id);
        if (!deleteAuthError) {
          deletedInBatch++;
          totalDeleted++;
        }
      }
      
      console.log(`   ✅ Deleted ${deletedInBatch} users in batch ${iteration}`);
      iteration++;

      // Safety check to prevent infinite loop
      if (iteration > 20) {
        console.log('   ⚠️  Reached maximum iterations, stopping...');
        break;
      }
    }

    console.log(`✅ Deleted ${totalDeleted} auth users total\n`);

    console.log('✨ Database completely wiped!\n');
    console.log('📊 All data deleted:');
    console.log('   - All deletion requests');
    console.log('   - All assets');
    console.log('   - All categories');
    console.log('   - All departments');
    console.log('   - All audit logs');
    console.log('   - All profiles');
    console.log(`   - All ${totalDeleted} auth users`);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

deleteEverything();
