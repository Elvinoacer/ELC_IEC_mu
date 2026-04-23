import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config(); // Fallback to .env

import { sendSMS } from '../lib/sms';

/**
 * SMS Diagnostic Test Script
 * 
 * Usage: npx tsx scratch/test-sms.ts [+2547XXXXXXXX]
 * 
 * This script tests the full SMS pipeline and reports diagnostics.
 */

async function main() {
  const phone = process.argv[2] || '+254700000000';
  const message = `ELP Test SMS at ${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}`;

  console.log('╔══════════════════════════════════════════════╗');
  console.log('║       Africa\'s Talking SMS Diagnostic        ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log();

  // ── Environment Check ─────────────────────────────────────────────
  const username = process.env.AT_USERNAME || '(not set)';
  const apiKey = process.env.AT_API_KEY || '(not set)';
  const senderId = process.env.AT_SENDER_ID || '(not set)';

  console.log('📋 Environment Check:');
  console.log(`   AT_USERNAME  = ${username}`);
  console.log(`   AT_API_KEY   = ${apiKey ? apiKey.substring(0, 12) + '...' : '(not set)'}`);
  console.log(`   AT_SENDER_ID = ${senderId}`);
  console.log();

  const isSandbox = !username || username.toLowerCase() === 'sandbox';
  if (isSandbox) {
    console.log('⚠️  MODE: SANDBOX — no real SMS will be sent');
    console.log('   Set AT_USERNAME to your live AT username for real delivery.');
  } else {
    console.log(`✅ MODE: LIVE (username: ${username})`);
  }

  if (senderId && senderId !== '(not set)') {
    console.log(`⚠️  WARNING: AT_SENDER_ID is set to "${senderId}". Unless approved, this will cause rejection.`);
  }
  console.log();

  // ── Send Test ─────────────────────────────────────────────────────
  console.log(`📱 Sending to: ${phone}`);
  console.log(`💬 Message: ${message}`);
  console.log('─'.repeat(50));

  try {
    await sendSMS(phone, message);
    console.log('─'.repeat(50));
    console.log('✅ SMS send completed successfully!');
    console.log('   Check the sms_logs table and AT dashboard for delivery confirmation.');
  } catch (err: any) {
    console.log('─'.repeat(50));
    console.error('❌ SMS send FAILED!');
    console.error(`   Error: ${err.message}`);
    console.log();
    console.log('🔍 Troubleshooting:');
    if (err.message.includes('sandbox')) {
      console.log('   → AT_USERNAME is missing or set to "sandbox". Set it to your live username.');
    }
    if (err.message.includes('InvalidSenderId') || err.message.includes('402')) {
      console.log('   → Remove AT_SENDER_ID from your environment (set it to empty).');
    }
    if (err.message.includes('InsufficientBalance') || err.message.includes('405')) {
      console.log('   → Top up your Africa\'s Talking SMS balance.');
    }
    if (err.message.includes('InvalidPhoneNumber') || err.message.includes('403')) {
      console.log('   → Check the phone number format. Use E.164: +2547XXXXXXXX');
    }
    if (err.message.includes('valid phone number')) {
      console.log('   → The phone number failed SDK validation. Use E.164 format: +254XXXXXXXXX');
    }
  } finally {
    process.exit(0);
  }
}

main();
