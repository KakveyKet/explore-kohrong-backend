import "dotenv/config";
import { sendTestEmail } from "../services/emailService.js";

const provider = String(process.env.EMAIL_PROVIDER || "gmail").toLowerCase();
const required = provider === "resend"
  ? ["RESEND_API_KEY", "RESEND_FROM_EMAIL", "BOOKING_NOTIFICATION_EMAIL"]
  : ["SMTP_USER", "SMTP_APP_PASSWORD", "BOOKING_NOTIFICATION_EMAIL"];

console.log("Email provider:", provider);
for (const key of required) {
  console.log(`${key}:`, String(process.env[key] || "").trim() ? "CONFIGURED" : "MISSING");
}
if (required.some((key) => !String(process.env[key] || "").trim())) {
  process.exit(1);
}

try {
  const result = await sendTestEmail();
  console.log("Email accepted by provider. Message ID:", result.messageId || "unknown");
  console.log("Check the recipient inbox, spam folder, and provider delivery logs.");
} catch (error) {
  console.error("EMAIL TEST FAILED:", error.message || String(error));
  process.exitCode = 1;
}
