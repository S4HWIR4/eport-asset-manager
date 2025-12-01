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

// New users to create
const NEW_USERS = [
  {
    email: 'moses.marimo@eport.cloud',
    password: 'Password123',
    fullName: 'Moses Marimo',
    role: 'user',
    department: 'IT Department',
  },
  {
    email: 'bruce.francis@eport.cloud',
    password: 'Password123',
    fullName: 'Bruce Francis',
    role: 'user',
    department: 'Marketing',
  },
  {
    email: 'sibs.sibanda@eport.cloud',
    password: 'Password123',
    fullName: 'Sibs Sibanda',
    role: 'user',
    department: 'Operations',
  },
];

// Assets for each user (2 per user)
const USER_ASSETS = {
  'moses.marimo@eport.cloud': [
    {
      name: 'MacBook Pro 16" M3',
      date_purchased: '2024-06-15',
      cost: 2499.00,
      category: 'Computer Equipment',
      department: 'IT Department',
    },
    {
      name: 'Dell UltraSharp 27" Monitor',
      date_purchased: '2024-06-20',
      cost: 549.99,
      category: 'Computer Equipment',
      department: 'IT Department',
    },
  ],
  'bruce.francis@eport.cloud': [
    {
      name: 'Adobe Creative Cloud License',
      date_purchased: '2024-05-01',
      cost: 599.88,
      category: 'Software Licenses',
      department: 'Marketing',
    },
    {
      name: 'Canon EOS R6 Camera',
      date_purchased: '2024-07-10',
      cost: 2499.00,
      category: 'Computer Equipment',
      department: 'Marketing',
    },
  ],
  'sibs.sibanda@eport.cloud': [
    {
      name: 'Toyota Hilux 2024',
      date_purchased: '2024-04-15',
      cost: 35000.00,
      category: 'Vehicles',
      department: 'Operations',
    },
    {
      name: 'Warehouse Management System License',
      date_purchased: '2024-03-20',
      cost: 1200.00,
      category: 'Software Licenses',
      department: 'Operations',
    },
  ],
};

async function seedAdditionalUsers() {
  console.log('🌱 Seeding additional users and assets...\n');

  try {
    const createdUsers = [];

    // 1. Create new users
    console.log('👤 Creating new users...');
    
    for (const user of NEW_USERS) {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', user.email)
        .single();

      if (existingUser) {
        console.log(`⚠️  User already exists: ${user.email}`);
        createdUsers.push({
          id: existingUser.id,
          email: user.email,
          fullName: user.fullName,
          department: user.department,
        });
        continue;
      }

      // Create new user
      const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          full_name: user.fullName,
        },
      });

      if (userError) {
        console.error(`❌ Failed to create user ${user.email}: ${userError.message}`);
        continue;
      }

      console.log(`✅ Created user: ${user.email}`);

      // Wait for trigger to create profile
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update profile with full name
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          full_name: user.fullName,
        })
        .eq('id', userData.user.id);

      if (profileError) {
        console.warn(`⚠️  Warning: Could not update profile for ${user.email}: ${profileError.message}`);
      }

      createdUsers.push({
        id: userData.user.id,
        email: user.email,
        fullName: user.fullName,
        department: user.department,
      });
    }

    console.log(`\n✅ Total users ready: ${createdUsers.length}`);
    createdUsers.forEach(u => console.log(`   - ${u.fullName} (${u.email})`));
    console.log('');

    // 2. Get category and department IDs
    console.log('📦 Fetching categories and departments...');
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name');

    const { data: departments } = await supabase
      .from('departments')
      .select('id, name');

    const categoryMap = new Map(categories?.map(c => [c.name, c.id]) || []);
    const departmentMap = new Map(departments?.map(d => [d.name, d.id]) || []);

    console.log(`✅ Found ${categories?.length || 0} categories and ${departments?.length || 0} departments\n`);

    // 3. Create assets for each user
    console.log('💼 Creating assets for users...');
    
    let totalAssetsCreated = 0;
    const allAuditLogs = [];

    for (const user of createdUsers) {
      const userAssets = USER_ASSETS[user.email];
      
      if (!userAssets || userAssets.length === 0) {
        console.log(`⚠️  No assets defined for ${user.email}`);
        continue;
      }

      console.log(`\n   Creating assets for ${user.fullName}:`);

      const assetsToCreate = userAssets.map(asset => ({
        name: asset.name,
        date_purchased: asset.date_purchased,
        cost: asset.cost,
        category_id: categoryMap.get(asset.category),
        department_id: departmentMap.get(asset.department),
        created_by: user.id,
      }));

      const { data: createdAssets, error: assetError } = await supabase
        .from('assets')
        .insert(assetsToCreate)
        .select();

      if (assetError) {
        console.error(`   ❌ Failed to create assets for ${user.email}: ${assetError.message}`);
        continue;
      }

      console.log(`   ✅ Created ${createdAssets.length} assets:`);
      createdAssets.forEach(a => console.log(`      - ${a.name} ($${a.cost})`));

      totalAssetsCreated += createdAssets.length;

      // Create audit logs for these assets
      const auditLogs = createdAssets.map(asset => ({
        entity_type: 'asset',
        entity_id: asset.id,
        action: 'asset_created',
        performed_by: user.id,
        entity_data: {
          name: asset.name,
          cost: asset.cost,
          date_purchased: asset.date_purchased,
          category_id: asset.category_id,
          department_id: asset.department_id,
        },
      }));

      allAuditLogs.push(...auditLogs);
    }

    // 4. Insert all audit logs
    if (allAuditLogs.length > 0) {
      console.log('\n📝 Creating audit logs...');
      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert(allAuditLogs);

      if (auditError) {
        console.warn(`⚠️  Warning: Could not create audit logs: ${auditError.message}`);
      } else {
        console.log(`✅ Created ${allAuditLogs.length} audit log entries`);
      }
    }

    console.log('');
    console.log('✨ Additional users and assets seeded successfully!\n');
    console.log('📋 Summary:');
    console.log(`   New Users: ${createdUsers.length}`);
    createdUsers.forEach(u => {
      const assetCount = USER_ASSETS[u.email]?.length || 0;
      console.log(`   - ${u.fullName} (${assetCount} assets)`);
    });
    console.log(`   Total Assets Created: ${totalAssetsCreated}`);
    console.log(`   Audit Logs Created: ${allAuditLogs.length}`);
    console.log('');
    console.log('🔑 Login credentials for new users:');
    NEW_USERS.forEach(u => {
      console.log(`   ${u.fullName}: ${u.email} / ${u.password}`);
    });
    console.log('');

  } catch (error) {
    console.error('❌ Error during seeding:', error.message);
    process.exit(1);
  }
}

// Run the seeder
seedAdditionalUsers();
