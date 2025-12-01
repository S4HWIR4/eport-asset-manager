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

// User credentials
const ADMIN_USER = {
  email: 'dev.sahwira@gmail.com',
};

const REGULAR_USER = {
  email: 'rumbi@eport.cloud',
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

const ASSETS = [
  // Admin-created assets (3)
  {
    name: 'Dell Latitude 5520 Laptop',
    date_purchased: '2024-01-15',
    cost: 1299.99,
    category: 'Computer Equipment',
    department: 'IT Department',
    createdBy: 'admin',
  },
  {
    name: 'Executive Office Desk',
    date_purchased: '2024-02-10',
    cost: 899.50,
    category: 'Office Furniture',
    department: 'Human Resources',
    createdBy: 'admin',
  },
  {
    name: 'Toyota Camry 2023',
    date_purchased: '2023-12-01',
    cost: 28500.00,
    category: 'Vehicles',
    department: 'Operations',
    createdBy: 'admin',
  },
  // User-created assets (2)
  {
    name: 'Microsoft Office 365 License',
    date_purchased: '2024-01-01',
    cost: 149.99,
    category: 'Software Licenses',
    department: 'Finance',
    createdBy: 'user',
  },
  {
    name: 'Cisco Catalyst 48-Port Switch',
    date_purchased: '2024-03-05',
    cost: 2499.00,
    category: 'Network Equipment',
    department: 'IT Department',
    createdBy: 'user',
  },
];

async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n');

  try {
    // 1. Create or get existing users
    console.log('👤 Setting up users...');
    
    // Create admin user if doesn't exist
    let adminUser = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('email', ADMIN_USER.email)
      .single()
      .then(res => res.data);

    if (!adminUser) {
      console.log(`Creating admin user: ${ADMIN_USER.email}...`);
      
      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: ADMIN_USER.email,
        password: 'Password123',
        email_confirm: true,
      });

      if (authError) {
        throw new Error(`Failed to create admin user in Auth: ${authError.message}`);
      }

      // Create profile (should be automatic via trigger, but let's ensure it)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          email: ADMIN_USER.email,
          role: 'admin',
        })
        .select()
        .single();

      if (profileError) {
        throw new Error(`Failed to create admin profile: ${profileError.message}`);
      }

      adminUser = profileData;
      console.log(`✅ Created admin user: ${ADMIN_USER.email}`);
    } else {
      // Ensure user is admin
      if (adminUser.role !== 'admin') {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ role: 'admin' })
          .eq('id', adminUser.id);

        if (updateError) {
          console.warn(`⚠️  Warning: Could not update user role to admin: ${updateError.message}`);
        } else {
          console.log(`✅ Updated ${ADMIN_USER.email} role to admin`);
        }
      } else {
        console.log(`✅ Found existing admin user: ${adminUser.email}`);
      }
    }

    // Create regular user if doesn't exist
    let regularUser = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('email', REGULAR_USER.email)
      .single()
      .then(res => res.data);

    if (!regularUser) {
      console.log(`Creating regular user: ${REGULAR_USER.email}...`);
      
      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: REGULAR_USER.email,
        password: 'Password123',
        email_confirm: true,
      });

      if (authError) {
        throw new Error(`Failed to create regular user in Auth: ${authError.message}`);
      }

      // Create profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          email: REGULAR_USER.email,
          role: 'user',
        })
        .select()
        .single();

      if (profileError) {
        throw new Error(`Failed to create regular user profile: ${profileError.message}`);
      }

      regularUser = profileData;
      console.log(`✅ Created regular user: ${REGULAR_USER.email}`);
    } else {
      console.log(`✅ Found existing regular user: ${regularUser.email}`);
    }

    console.log('');

    // 2. Seed categories
    console.log('📁 Seeding categories...');
    const { error: categoryError } = await supabase
      .from('categories')
      .insert(
        CATEGORIES.map(name => ({
          name,
          created_by: adminUser.id,
        }))
      );

    if (categoryError) {
      if (categoryError.code === '23505') {
        console.error('❌ Database already contains data!');
        console.error('');
        console.error('💡 To reseed the database, first run the cleanup script:');
        console.error('   node scripts/cleanup-database.mjs');
        console.error('');
        console.error('   Then run the seeder again:');
        console.error('   npm run db:seed');
        console.error('');
        process.exit(1);
      }
      throw new Error(`Failed to create categories: ${categoryError.message}`);
    }

    console.log(`✅ Created ${CATEGORIES.length} categories`);
    CATEGORIES.forEach(c => console.log(`   - ${c}`));
    console.log('');

    // 3. Seed departments
    console.log('🏢 Seeding departments...');
    const { error: departmentError } = await supabase
      .from('departments')
      .insert(
        DEPARTMENTS.map(name => ({
          name,
          created_by: adminUser.id,
        }))
      );

    if (departmentError) {
      throw new Error(`Failed to create departments: ${departmentError.message}`);
    }

    console.log(`✅ Created ${DEPARTMENTS.length} departments`);
    DEPARTMENTS.forEach(d => console.log(`   - ${d}`));
    console.log('');

    // 4. Get category and department IDs for assets
    console.log('📦 Preparing to seed assets...');
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name');

    const { data: departments } = await supabase
      .from('departments')
      .select('id, name');

    const categoryMap = new Map(categories?.map(c => [c.name, c.id]) || []);
    const departmentMap = new Map(departments?.map(d => [d.name, d.id]) || []);

    // 5. Seed assets
    console.log('💼 Seeding assets...');
    
    const assetsToCreate = ASSETS.map(asset => ({
      name: asset.name,
      date_purchased: asset.date_purchased,
      cost: asset.cost,
      category_id: categoryMap.get(asset.category),
      department_id: departmentMap.get(asset.department),
      created_by: asset.createdBy === 'admin' ? adminUser.id : regularUser.id,
    }));

    const { data: createdAssets, error: assetError } = await supabase
      .from('assets')
      .insert(assetsToCreate)
      .select();

    if (assetError) {
      throw new Error(`Failed to create assets: ${assetError.message}`);
    }

    const adminAssets = ASSETS.filter(a => a.createdBy === 'admin').length;
    const userAssets = ASSETS.filter(a => a.createdBy === 'user').length;

    console.log(`✅ Created ${ASSETS.length} assets`);
    console.log(`   - ${adminAssets} created by admin`);
    console.log(`   - ${userAssets} created by user`);
    ASSETS.forEach(a => console.log(`   - ${a.name} (${a.createdBy})`));

    // 6. Create audit logs for the created assets
    console.log('');
    console.log('📝 Creating audit logs for assets...');
    
    const auditLogs = createdAssets.map((asset, index) => ({
      entity_type: 'asset',
      entity_id: asset.id,
      action: 'asset_created',
      performed_by: asset.created_by,
      entity_data: {
        name: asset.name,
        cost: asset.cost,
        date_purchased: asset.date_purchased,
        category_id: asset.category_id,
        department_id: asset.department_id,
      },
    }));

    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert(auditLogs);

    if (auditError) {
      console.warn(`⚠️  Warning: Could not create audit logs: ${auditError.message}`);
    } else {
      console.log(`✅ Created ${auditLogs.length} audit log entries`);
    }

    console.log('');
    console.log('✨ Database seeding completed successfully!\n');
    console.log('📋 Summary:');
    console.log(`   👤 Admin User: ${ADMIN_USER.email} (Password: Password123)`);
    console.log(`   👤 Regular User: ${REGULAR_USER.email} (Password: Password123)`);
    console.log(`   📁 Categories: ${CATEGORIES.length}`);
    console.log(`   🏢 Departments: ${DEPARTMENTS.length}`);
    console.log(`   💼 Assets: ${ASSETS.length} (${adminAssets} by admin, ${userAssets} by user)`);
    console.log(`   📝 Audit Logs: ${auditLogs.length}`);
    console.log('');
    console.log('🚀 You can now login at http://localhost:3000');
    console.log(`   Email: ${ADMIN_USER.email}`);
    console.log(`   Password: Password123\n`);

  } catch (error) {
    console.error('❌ Error during seeding:', error.message);
    process.exit(1);
  }
}

// Run the seeder
seedDatabase();
