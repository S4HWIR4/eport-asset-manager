import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const KEEP_EMAILS = ['dev.sahwira@gmail.com', 'rumbi@eport.cloud'];

async function cleanupDatabase() {
  console.log('🧹 Starting database cleanup...\n');

  try {
    // 1. Get the user IDs to keep
    console.log('📋 Finding users to keep...');
    const { data: usersToKeep, error: userError } = await supabase
      .from('profiles')
      .select('id, email')
      .in('email', KEEP_EMAILS);

    if (userError) {
      throw new Error(`Failed to fetch users: ${userError.message}`);
    }

    if (!usersToKeep || usersToKeep.length === 0) {
      console.error('❌ No users found with the specified emails');
      process.exit(1);
    }

    const keepUserIds = usersToKeep.map(u => u.id);
    console.log(`✅ Found ${usersToKeep.length} users to keep:`);
    usersToKeep.forEach(u => console.log(`   - ${u.email} (${u.id})`));
    console.log('');

    // 2. Delete deletion requests (must be first due to foreign keys)
    console.log('🗑️  Deleting deletion requests...');
    const { error: deletionRequestError } = await supabase
      .from('deletion_requests')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deletionRequestError) {
      console.error(`⚠️  Warning: Failed to delete deletion requests: ${deletionRequestError.message}`);
    } else {
      console.log('✅ Deletion requests deleted\n');
    }

    // 3. Delete assets (must be before categories/departments due to foreign keys)
    console.log('🗑️  Deleting assets...');
    const { error: assetError } = await supabase
      .from('assets')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (assetError) {
      console.error(`⚠️  Warning: Failed to delete assets: ${assetError.message}`);
    } else {
      console.log('✅ Assets deleted\n');
    }

    // 4. Delete categories
    console.log('🗑️  Deleting categories...');
    const { error: categoryError } = await supabase
      .from('categories')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (categoryError) {
      console.error(`⚠️  Warning: Failed to delete categories: ${categoryError.message}`);
    } else {
      console.log('✅ Categories deleted\n');
    }

    // 5. Delete departments
    console.log('🗑️  Deleting departments...');
    const { error: departmentError } = await supabase
      .from('departments')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (departmentError) {
      console.error(`⚠️  Warning: Failed to delete departments: ${departmentError.message}`);
    } else {
      console.log('✅ Departments deleted\n');
    }

    // 6. Delete audit logs (optional - keeps history clean)
    console.log('🗑️  Deleting audit logs...');
    const { error: auditError } = await supabase
      .from('audit_logs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (auditError) {
      console.error(`⚠️  Warning: Failed to delete audit logs: ${auditError.message}`);
    } else {
      console.log('✅ Audit logs deleted\n');
    }

    // 7. Delete users (profiles) except the ones to keep
    console.log('🗑️  Deleting users (except specified accounts)...');
    
    // Get all users first
    const { data: allUsers, error: getAllError } = await supabase
      .from('profiles')
      .select('id, email');
    
    if (getAllError) {
      console.error(`⚠️  Warning: Failed to get all users: ${getAllError.message}`);
    } else {
      const usersToDelete = allUsers.filter(u => !keepUserIds.includes(u.id));
      
      let deletedCount = 0;
      for (const user of usersToDelete) {
        const { error: deleteError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', user.id);
        
        if (deleteError) {
          console.error(`⚠️  Failed to delete user ${user.email}: ${deleteError.message}`);
        } else {
          deletedCount++;
        }
      }
      
      console.log(`✅ Deleted ${deletedCount} users\n`);
    }

    // 8. Delete auth users (from Supabase Auth) except the ones to keep
    console.log('🗑️  Deleting auth users (except specified accounts)...');
    
    // Get all auth users
    const { data: { users: allAuthUsers }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error(`⚠️  Warning: Failed to list auth users: ${listError.message}`);
    } else {
      const authUsersToDelete = allAuthUsers.filter(
        user => !KEEP_EMAILS.includes(user.email || '')
      );

      let deletedCount = 0;
      for (const user of authUsersToDelete) {
        const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(user.id);
        if (deleteAuthError) {
          console.error(`⚠️  Failed to delete auth user ${user.email}: ${deleteAuthError.message}`);
        } else {
          deletedCount++;
        }
      }
      
      console.log(`✅ Deleted ${deletedCount} auth users\n`);
    }

    console.log('✨ Database cleanup completed successfully!');
    console.log(`\n📊 Remaining users:`);
    usersToKeep.forEach(u => console.log(`   - ${u.email}`));

  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    process.exit(1);
  }
}

// Run the cleanup
cleanupDatabase();
