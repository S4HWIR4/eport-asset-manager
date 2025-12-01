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
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function checkAuditLogs() {
  console.log('🔍 Checking audit logs...\n');

  try {
    // Get all audit logs
    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select(`
        *,
        performer:profiles!audit_logs_performed_by_fkey(email)
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('❌ Error fetching audit logs:', error.message);
      return;
    }

    console.log(`📋 Found ${logs?.length || 0} recent audit logs:\n`);

    logs?.forEach((log, index) => {
      console.log(`${index + 1}. ${log.action} - ${log.entity_type}`);
      console.log(`   Performed by: ${log.performer?.email || 'Unknown'}`);
      console.log(`   Created at: ${new Date(log.created_at).toLocaleString()}`);
      console.log(`   Entity ID: ${log.entity_id}`);
      if (log.entity_data) {
        console.log(`   Data: ${JSON.stringify(log.entity_data, null, 2)}`);
      }
      console.log('');
    });

    // Count by action type
    const { data: actionCounts, error: countError } = await supabase
      .from('audit_logs')
      .select('action');

    if (!countError && actionCounts) {
      const counts = actionCounts.reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {});

      console.log('📊 Audit log counts by action:');
      Object.entries(counts).forEach(([action, count]) => {
        console.log(`   ${action}: ${count}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAuditLogs();
