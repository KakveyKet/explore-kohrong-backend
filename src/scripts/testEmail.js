import "dotenv/config";

import {
  sendTestEmail,
  verifyEmailTransport,
} from "../services/emailService.js";

async function run() {
  try {
    console.log("=================================");
    console.log("Explore Koh Rong Email Test");
    console.log("=================================");

    console.log("SMTP User:", process.env.SMTP_USER || "MISSING");

    console.log(
      "App Password:",
      process.env.SMTP_APP_PASSWORD
        ? "CONFIGURED"
        : "MISSING",
    );

    console.log(
      "Business Email:",
      process.env.BOOKING_NOTIFICATION_EMAIL || "MISSING",
    );

    console.log("");
    console.log("Testing Gmail SMTP connection...");

    await verifyEmailTransport();

    console.log("");
    console.log("Sending test email...");

    const result = await sendTestEmail();

    console.log("");
    console.log("✅ EMAIL SENT SUCCESSFULLY");
    console.log("Message ID:", result?.messageId);
    console.log(
      "Recipient:",
      process.env.BOOKING_NOTIFICATION_EMAIL,
    );

    process.exit(0);
  } catch (error) {
    console.error("");
    console.error("❌ EMAIL TEST FAILED");
    console.error("");

    console.error(
      "Message:",
      error?.message || error,
    );

    console.error(
      "Code:",
      error?.code || "-",
    );

    console.error(
      "Response:",
      error?.response || "-",
    );

    process.exit(1);
  }
}

run();
