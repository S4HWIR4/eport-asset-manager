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

async function addChrisZana() {
  console.log('🌱 Adding Chris Zana...\n');

  try {
    // 1. Check if user already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', 'chris.zana@eport.cloud')
      .single();

    let userId;

    if (existingUser) {
      console.log(`⚠️  User already exists: chris.zana@eport.cloud`);
      userId = existingUser.id;
    } else {
      // Create new user
      console.log('👤 Creating user...');
      const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email: 'chris.zana@eport.cloud',
        password: 'Password123',
        email_confirm: true,
        user_metadata: {
          full_name: 'Chris Zana',
        },
      });

      if (userError) {
        throw new Error(`Failed to create user: ${userError.message}`);
      }

      console.log(`✅ Created user: chris.zana@eport.cloud`);
      userId = userData.user.id;

      // Wait for trigger to create profile
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update profile with full name
      await supabase
        .from('profiles')
        .update({ full_name: 'Chris Zana' })
        .eq('id', userId);
    }

    // 2. Get categories and departments
    console.log('\n📦 Fetching categories and departments...');
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name');

    const { data: departments } = await supabase
      .from('departments')
      .select('id, name');

    const categoryMap = new Map(categories?.map(c => [c.name, c.id]) || []);
    const departmentMap = new Map(departments?.map(d => [d.name, d.id]) || []);

    // 3. Create assets for Chris Zana (Finance department)
    console.log('💼 Creating assets...\n');
    
    const assets = [
      {
        name: 'QuickBooks Enterprise License',
        date_purchased: '2024-08-01',
        cost: 1850.00,
        category: 'Software Licenses',
        department: 'Finance',
      },
      {
        name: 'HP LaserJet Pro Printer',
        date_purchased: '2024-08-15',
        cost: 399.99,
        category: 'Computer Equipment',
        department: 'Finance',
      },
    ];

    const assetsToCreate = assets.map(asset => ({
      name: asset.name,
      date_purchased: asset.date_purchased,
      cost: asset.cost,
      category_id: categoryMap.get(asset.category),
      department_id: departmentMap.get(asset.department),
      created_by: userId,
    }));

    const { data: createdAssets, error: assetError } = await supabase
      .from('assets')
      .insert(assetsToCreate)
      .select();

    if (assetError) {
      throw new Error(`Failed to create assets: ${assetError.message}`);
    }

    console.log(`✅ Created ${createdAssets.length} assets:`);
    createdAssets.forEach(a => console.log(`   - ${a.name} ($${a.cost})`));

    // 4. Create audit logs
    console.log('\n📝 Creating audit logs...');
    
    const auditLogs = createdAssets.map(asset => ({
      entity_type: 'asset',
      entity_id: asset.id,
      action: 'asset_created',
      performed_by: userId,
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
    console.log('✨ Chris Zana added successfully!\n');
    console.log('📋 Summary:');
    console.log('   Name: Chris Zana');
    console.log('   Email: chris.zana@eport.cloud');
    console.log('   Password: Password123');
    console.log('   Department: Finance');
    console.log('   Assets: 2');
    console.log('   - QuickBooks Enterprise License ($1,850.00)');
    console.log('   - HP LaserJet Pro Printer ($399.99)');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
addChrisZana();
