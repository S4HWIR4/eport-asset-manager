import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import * as readline from 'readline';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function createAdmin() {
  console.log('🔐 Create Admin User\n');
  console.log('=' .repeat(50) + '\n');

  try {
    const email = await question('Enter admin email: ');
    const password = await question('Enter admin password (min 6 chars): ');
    const fullName = await question('Enter full name (optional): ');

    console.log('\n🔧 Creating admin user...\n');

    // Create user with admin.createUser
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: email.trim(),
      password: password.trim(),
      email_confirm: true,
      user_metadata: {
        full_name: fullName.trim() || null,
      },
    });

    if (userError) {
      console.error('❌ Failed to create user:', userError.message);
      rl.close();
      process.exit(1);
    }

    console.log('✅ User created:', userData.user.email);
    console.log('   User ID:', userData.user.id);

    // Wait a moment for the trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update profile to admin role
    console.log('\n🔧 Setting admin role...\n');

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', userData.user.id)
      .select()
      .single();

    if (profileError) {
      console.error('❌ Failed to update profile:', profileError.message);
      console.log('\n⚠️  User created but role not set to admin.');
      console.log('   Please manually update in Supabase Dashboard:');
      console.log('   1. Go to Table Editor → profiles');
      console.log(`   2. Find user: ${email}`);
      console.log('   3. Change role to "admin"\n');
    } else {
      console.log('✅ Admin role set successfully!');
      console.log('\n📋 Admin User Details:');
      console.log(`   Email: ${profileData.email}`);
      console.log(`   Role: ${profileData.role}`);
      console.log(`   ID: ${profileData.id}`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('\n🎉 Admin user created successfully!\n');
    console.log('🚀 Next steps:');
    console.log('   1. Run: npm run dev');
    console.log('   2. Navigate to: http://localhost:3000');
    console.log(`   3. Login with: ${email}\n`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    rl.close();
  }
}

createAdmin();
