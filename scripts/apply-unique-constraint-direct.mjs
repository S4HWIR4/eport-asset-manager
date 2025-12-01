import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

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

console.log('🚀 Applying unique constraint for one pending request per asset\n');

// First, check if there are any duplicate pending requests that would violate the constraint
const { data: duplicates, error: checkError } = await supabase
  .from('deletion_requests')
  .select('asset_id')
  .eq('status', 'pending');

if (checkError) {
  console.error('❌ Error checking for duplicates:', checkError.message);
  process.exit(1);
}

// Count duplicates
const assetCounts = {};
if (duplicates) {
  duplicates.forEach(req => {
    assetCounts[req.asset_id] = (assetCounts[req.asset_id] || 0) + 1;
  });
  
  const duplicateAssets = Object.entries(assetCounts).filter(([_, count]) => count > 1);
  
  if (duplicateAssets.length > 0) {
    console.log('⚠️  Found assets with multiple pending requests:');
    duplicateAssets.forEach(([assetId, count]) => {
      console.log(`   Asset ${assetId}: ${count} pending requests`);
    });
    console.log('\n❌ Cannot apply unique constraint with existing duplicates.');
    console.log('   Please resolve these duplicates first (cancel or approve extra requests).\n');
    process.exit(1);
  }
}

console.log('✅ No duplicate pending requests found\n');
console.log('📝 The unique constraint must be applied via SQL Editor:\n');
console.log('1. Go to https://supabase.com/dashboard');
console.log('2. Select your project');
console.log('3. Go to SQL Editor');
console.log('4. Run this SQL:\n');
console.log('CREATE UNIQUE INDEX IF NOT EXISTS idx_one_pending_per_asset');
console.log('  ON public.deletion_requests(asset_id)');
console.log('  WHERE status = \'pending\';\n');
console.log('✅ Ready to apply constraint!\n');
