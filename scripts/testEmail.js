import "dotenv/config";

import {
  sendTestEmail,
  verifyEmailTransport,
} from "../services/emailService.js";

async function run() {
  try {
    console.log("Testing Gmail SMTP...");

    /*
    |--------------------------------------------------------------------------
    | VERIFY CONNECTION
    |--------------------------------------------------------------------------
    */

    await verifyEmailTransport();

    /*
    |--------------------------------------------------------------------------
    | SEND TEST EMAIL
    |--------------------------------------------------------------------------
    */

    const result = await sendTestEmail();

    console.log("✅ Test email sent successfully.");

    console.log("Message ID:", result?.messageId);

    console.log("Recipient:", process.env.BOOKING_NOTIFICATION_EMAIL);

    process.exit(0);
  } catch (error) {
    console.error("❌ EMAIL TEST FAILED");

    console.error(error);

    process.exit(1);
  }
}

run();
