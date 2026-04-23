import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config(); // Fallback to .env
import { sendSMS } from '../lib/sms';

/**
 * Test SMS script
 * Usage: npx tsx scratch/test-sms.ts [+2547XXXXXXXX]
 */

async function main() {
  const phone = process.argv[2] || '+254700000000'; // Default to a fake number if not provided
  const message = `Test message from ELP Voting System at ${new Date().toISOString()}`;

  console.log(`🚀 Starting SMS test...`);
  console.log(`📱 Target Phone: ${phone}`);
  console.log(`💬 Message: ${message}`);
  console.log(`---`);

  try {
    await sendSMS(phone, message);
    console.log(`---`);
    console.log(`✅ Test completed successfully!`);
    console.log(`Check the console logs above for simulation vs real sending.`);
  } catch (err: any) {
    console.error(`---`);
    console.error(`❌ Test failed!`);
    console.error(`Error: ${err.message}`);
  } finally {
    process.exit(0);
  }
}

main();
