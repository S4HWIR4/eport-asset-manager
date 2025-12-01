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

// Default admin credentials
const DEFAULT_ADMIN = {
  email: 'dev.sahwira@gmail.com',
  password: 'Password123',
  fullName: 'Admin User',
};

// Seed data
const CATEGORIES = [
  'Computer Equipment',
  'Office Furniture',
  'Vehicles',
  'Software Licenses',
  'Network Equipment',
];

const DEPARTMENTS = [
  'IT Department',
  'Human Resources',
  'Finance',
  'Operations',
  'Marketing',
];

async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n');

  try {
    // 1. Create default admin user
    console.log('👤 Creating default admin user...');
    
    // Check if admin already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('email', DEFAULT_ADMIN.email)
      .single();

    let adminUserId;

    if (existingUser) {
      console.log(`✅ Admin user already exists: ${existingUser.email}`);
      adminUserId = existingUser.id;
      
      // Ensure role is admin
      if (existingUser.role !== 'admin') {
        console.log('   Updating role to admin...');
        await supabase
          .from('profiles')
          .update({ role: 'admin' })
          .eq('id', existingUser.id);
        console.log('   ✅ Role updated to admin');
      }
    } else {
      // Create new admin user
      const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email: DEFAULT_ADMIN.email,
        password: DEFAULT_ADMIN.password,
        email_confirm: true,
        user_metadata: {
          full_name: DEFAULT_ADMIN.fullName,
        },
      });

      if (userError) {
        throw new Error(`Failed to create admin user: ${userError.message}`);
      }

      adminUserId = userData.user.id;
      console.log(`✅ Admin user created: ${DEFAULT_ADMIN.email}`);

      // Wait for trigger to create profile
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update profile to admin role
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          role: 'admin',
          full_name: DEFAULT_ADMIN.fullName 
        })
        .eq('id', adminUserId);

      if (profileError) {
        console.warn(`⚠️  Warning: Could not set admin role: ${profileError.message}`);
      } else {
        console.log('   ✅ Admin role set');
      }
    }

    console.log('');

    // 2. Seed categories
    console.log('📁 Seeding categories...');
    const { data: existingCategories } = await supabase
      .from('categories')
      .select('name');

    const existingCategoryNames = new Set(existingCategories?.map(c => c.name) || []);
    const categoriesToCreate = CATEGORIES.filter(name => !existingCategoryNames.has(name));

    if (categoriesToCreate.length > 0) {
      const { error: categoryError } = await supabase
        .from('categories')
        .insert(
          categoriesToCreate.map(name => ({
            name,
            created_by: adminUserId,
          }))
        );

      if (categoryError) {
        console.error(`⚠️  Warning: Could not create some categories: ${categoryError.message}`);
      } else {
        console.log(`✅ Created ${categoriesToCreate.length} categories`);
      }
    } else {
      console.log('✅ All categories already exist');
    }

    // Show all categories
    const { data: allCategories } = await supabase
      .from('categories')
      .select('name')
      .order('name');
    
    if (allCategories) {
      console.log(`   Total categories: ${allCategories.length}`);
      allCategories.forEach(c => console.log(`   - ${c.name}`));
    }

    console.log('');

    // 3. Seed departments
    console.log('🏢 Seeding departments...');
    const { data: existingDepartments } = await supabase
      .from('departments')
      .select('name');

    const existingDepartmentNames = new Set(existingDepartments?.map(d => d.name) || []);
    const departmentsToCreate = DEPARTMENTS.filter(name => !existingDepartmentNames.has(name));

    if (departmentsToCreate.length > 0) {
      const { error: departmentError } = await supabase
        .from('departments')
        .insert(
          departmentsToCreate.map(name => ({
            name,
            created_by: adminUserId,
          }))
        );

      if (departmentError) {
        console.error(`⚠️  Warning: Could not create some departments: ${departmentError.message}`);
      } else {
        console.log(`✅ Created ${departmentsToCreate.length} departments`);
      }
    } else {
      console.log('✅ All departments already exist');
    }

    // Show all departments
    const { data: allDepartments } = await supabase
      .from('departments')
      .select('name')
      .order('name');
    
    if (allDepartments) {
      console.log(`   Total departments: ${allDepartments.length}`);
      allDepartments.forEach(d => console.log(`   - ${d.name}`));
    }

    console.log('');
    console.log('✨ Database seeding completed successfully!\n');
    console.log('📋 Summary:');
    console.log(`   Admin User: ${DEFAULT_ADMIN.email}`);
    console.log(`   Password: ${DEFAULT_ADMIN.password}`);
    console.log(`   Categories: ${allCategories?.length || 0}`);
    console.log(`   Departments: ${allDepartments?.length || 0}`);
    console.log('');
    console.log('🚀 Next steps:');
    console.log('   1. Run: npm run dev');
    console.log('   2. Navigate to: http://localhost:3000');
    console.log(`   3. Login with: ${DEFAULT_ADMIN.email}\n`);

  } catch (error) {
    console.error('❌ Error during seeding:', error.message);
    process.exit(1);
  }
}

// Run the seeder
seedDatabase();
