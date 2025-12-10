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

async function fixUserProfiles() {
  console.log('🔧 Fixing user profiles...\n');

  try {
    // Get all auth users
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      throw new Error(`Failed to list users: ${listError.message}`);
    }

    console.log(`Found ${users.length} auth users\n`);

    // Find the three users we just created (with timestamp in email)
    const targetUsers = users.filter(u => 
      u.email?.includes('moses.marimo+') || 
      u.email?.includes('bruce.francis+') || 
      u.email?.includes('sibs.sibanda+')
    );

    console.log(`Found ${targetUsers.length} users to fix:\n`);

    for (const user of targetUsers) {
      console.log(`Checking ${user.email}...`);
      
      // Get the profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error(`   ❌ Profile not found: ${profileError.message}`);
        
        // Create the profile if it doesn't exist
        console.log(`   Creating profile...`);
        const { error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email, // Use the actual auth email
            role: 'user',
            full_name: user.user_metadata?.full_name || null,
          });
        
        if (createError) {
          console.error(`   ❌ Failed to create profile: ${createError.message}`);
        } else {
          console.log(`   ✅ Profile created`);
        }
      } else {
        console.log(`   ✅ Profile exists`);
        console.log(`      Profile email: ${profile.email}`);
        console.log(`      Auth email: ${user.email}`);
        
        // Update profile to match auth email
        if (profile.email !== user.email) {
          console.log(`   Updating profile email to match auth...`);
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ email: user.email })
            .eq('id', user.id);
          
          if (updateError) {
            console.error(`   ❌ Failed to update: ${updateError.message}`);
          } else {
            console.log(`   ✅ Profile email updated`);
          }
        }
      }
      console.log('');
    }

    console.log('✨ Profile fix completed!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixUserProfiles();
