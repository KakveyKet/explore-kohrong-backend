import "dotenv/config";
import nodemailer from "nodemailer";

/**
 * Email delivery providers:
 * - EMAIL_PROVIDER=resend: Resend HTTPS API on port 443 (recommended for DigitalOcean)
 * - EMAIL_PROVIDER=gmail: existing Gmail SMTP for local development
 *
 * Never expose API keys or SMTP credentials to the frontend.
 */
const EMAIL_PROVIDER = String(process.env.EMAIL_PROVIDER || "gmail")
  .trim()
  .toLowerCase();
const RESEND_API_KEY = String(process.env.RESEND_API_KEY || "").trim();
const RESEND_FROM_EMAIL = String(process.env.RESEND_FROM_EMAIL || "").trim();
const SMTP_USER = String(process.env.SMTP_USER || "").trim();
const SMTP_APP_PASSWORD = String(process.env.SMTP_APP_PASSWORD || "")
  .replace(/\s/g, "")
  .trim();
const BUSINESS_EMAIL = String(process.env.BOOKING_NOTIFICATION_EMAIL || "").trim();
const FROM_NAME = String(process.env.SMTP_FROM_NAME || "Explore Koh Rong").trim();

let transporter;
function mailer() {
  if (!SMTP_USER || !SMTP_APP_PASSWORD) {
    throw new Error("SMTP_USER or SMTP_APP_PASSWORD is missing in the backend environment.");
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: SMTP_USER, pass: SMTP_APP_PASSWORD },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }
  return transporter;
}

function validateResendConfiguration() {
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is missing in the backend environment.");
  }
  if (!RESEND_FROM_EMAIL) {
    throw new Error("RESEND_FROM_EMAIL is missing; use an address on your verified sending domain.");
  }
  if (typeof fetch !== "function") {
    throw new Error("Node.js 18 or later is required for the Resend HTTP API.");
  }
}

function fromAddress() {
  return { name: FROM_NAME, address: SMTP_USER };
}

async function resendSendMail({ to, subject, text, html, replyTo }) {
  validateResendConfiguration();

  const payload = {
    from: `${FROM_NAME} <${RESEND_FROM_EMAIL}>`,
    to: Array.isArray(to) ? to : [to],
    subject,
    text,
    html,
  };
  if (replyTo) payload.reply_to = replyTo;

  let response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "User-Agent": "explore-kohrong-booking/1.0",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12000),
    });
  } catch (error) {
    throw new Error(`Resend network error: ${error.message || String(error)}`);
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body?.id) {
    const detail = body?.message || body?.error?.message || response.statusText || "Unknown API error";
    throw new Error(`Resend API ${response.status}: ${detail}`);
  }
  // Match Nodemailer's result shape so existing booking code works unchanged.
  return { messageId: body.id, provider: "resend" };
}

async function sendMail(options) {
  if (EMAIL_PROVIDER === "resend") {
    return resendSendMail(options);
  }
  if (EMAIL_PROVIDER === "gmail") {
    return mailer().sendMail({ from: fromAddress(), ...options });
  }
  throw new Error(`Unsupported EMAIL_PROVIDER: ${EMAIL_PROVIDER}`);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// The database-assigned number is canonical. Legacy records retain a stable fallback.
export function getBookingReference(booking) {
  const number = String(booking?.booking_number || "").trim();
  if (number) return number;
  const id = String(booking?._id || "").trim();
  return id ? `#${id.slice(-6)}` : "-";
}

function descriptionOf(booking) {
  return booking?.description && typeof booking.description === "object"
    ? booking.description
    : {};
}
function customerOf(booking) {
  return booking?.customer_id && typeof booking.customer_id === "object"
    ? booking.customer_id
    : {};
}
function bookingData(booking) {
  const d = descriptionOf(booking);
  const c = customerOf(booking);
  const services = Array.isArray(booking?.products_id) ? booking.products_id : [];
  const serviceNames = services
    .filter((item) => item && typeof item === "object" && item.name)
    .map((item) => String(item.name));
  const customerName =
    `${String(c.firstName || "").trim()} ${String(c.lastName || "").trim()}`.trim() ||
    c.displayName || c.username || "Customer";
  const paymentMethod = String(booking?.payment_method || booking?.paid_type || "CASH").toUpperCase();
  return {
    ref: getBookingReference(booking),
    service: serviceNames.join(", ") || d.service_name || "Service",
    date: String(d.booking_date || booking?.booking_date || "-"),
    time: String(d.booking_time || booking?.booking_time || "-"),
    guests: Number(d.people ?? booking?.people ?? 1),
    payment: ["BANK", "BANK_TRANSFER"].includes(paymentMethod)
      ? "Bank Transfer"
      : "Pay at Check-in",
    total: Number(booking?.total_price || 0).toFixed(2),
    note: String(d.note || booking?.note || "-").trim(),
    channel: String(d.booking_channel || "EMAIL").toUpperCase(),
    customerName: String(customerName),
    customerEmail: String(c.email || "").trim(),
    customerPhone: String(c.phone || "").trim(),
  };
}
function emailLayout(title, innerHtml) {
  return `<!doctype html><html><body style="margin:0;padding:22px;background:#f5f8fb;font-family:Arial,sans-serif;color:#173043">
  <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e6edf3;border-radius:12px;overflow:hidden">
    <div style="background:#43b5e3;color:#fff;padding:22px 26px"><h2 style="margin:0">${escapeHtml(title)}</h2></div>
    <div style="padding:26px;line-height:1.7">${innerHtml}</div>
    <div style="padding:14px 26px;background:#f7fbfd;color:#667788;font-size:12px">Explore Koh Rong</div>
  </div></body></html>`;
}
function detailRow(label, value) {
  return `<tr><td style="padding:8px 12px 8px 0;color:#64748b;vertical-align:top">${escapeHtml(label)}</td><td style="padding:8px 0;font-weight:600">${escapeHtml(value)}</td></tr>`;
}
function bookingTable(d) {
  return `<table style="border-collapse:collapse;width:100%;font-size:14px">
    ${detailRow("Reference", d.ref)}
    ${detailRow("Service", d.service)}
    ${detailRow("Date", d.date)}
    ${detailRow("Time", d.time)}
    ${detailRow("Guests", d.guests)}
    ${detailRow("Payment", d.payment)}
    ${detailRow("Total", `$${d.total}`)}
  </table>`;
}
export async function verifyEmailTransport() {
  if (EMAIL_PROVIDER === "resend") {
    validateResendConfiguration();
    console.log("Resend settings present. Use sendTestEmail() to verify actual delivery.");
    return true;
  }
  await mailer().verify();
  console.log("Gmail SMTP connection verified");
  return true;
}
export async function sendTestEmail() {
  if (!BUSINESS_EMAIL) throw new Error("BOOKING_NOTIFICATION_EMAIL is missing.");
  return sendMail({
    to: BUSINESS_EMAIL,
    subject: "Explore Koh Rong - Email Delivery Test",
    text: "Explore Koh Rong email delivery test.",
    html: emailLayout("Email Delivery Test", "<p>Email delivery test from Explore Koh Rong.</p>"),
  });
}
export async function sendBusinessBookingEmail(booking) {
  if (!BUSINESS_EMAIL) throw new Error("BOOKING_NOTIFICATION_EMAIL is missing.");
  const d = bookingData(booking);
  const text = [
    `New booking: ${d.ref}`,
    `Service: ${d.service}`,
    `Date: ${d.date}`,
    `Time: ${d.time}`,
    `Guests: ${d.guests}`,
    `Payment: ${d.payment}`,
    `Total: $${d.total}`,
    `Customer: ${d.customerName}`,
    `Email: ${d.customerEmail || "-"}`,
    `Phone: ${d.customerPhone || "-"}`,
    `Preferred contact: ${d.channel}`,
    `Note: ${d.note || "-"}`,
    "Status: PENDING",
  ].join("\n");
  const html = emailLayout(
    `New Booking — ${d.ref}`,
    `${bookingTable(d)}<hr style="border:0;border-top:1px solid #e2e8f0;margin:20px 0"/>
    <h3>Customer</h3><p><b>Name:</b> ${escapeHtml(d.customerName)}<br/>
    <b>Email:</b> ${escapeHtml(d.customerEmail || "-")}<br/>
    <b>Phone:</b> ${escapeHtml(d.customerPhone || "-")}<br/>
    <b>Preferred contact:</b> ${escapeHtml(d.channel)}</p>
    <h3>Special Request</h3><p>${escapeHtml(d.note || "-")}</p>
    <p><b>Status: PENDING</b></p>`,
  );
  const result = await sendMail({
    to: BUSINESS_EMAIL,
    subject: `${d.ref} - New Booking - ${d.service}`,
    text,
    html,
  });
  console.log("✅ Business booking email sent:", d.ref, result.messageId);
  return result;
}
export async function sendCustomerBookingEmail(booking) {
  const d = bookingData(booking);
  if (!d.customerEmail) return { skipped: true, reason: "Customer email is missing." };
  const text = [
    `Hello ${d.customerName},`,
    "Thank you for booking with Explore Koh Rong.",
    `Booking Reference: ${d.ref}`,
    `Service: ${d.service}`,
    `Date: ${d.date}`,
    `Time: ${d.time}`,
    `Guests: ${d.guests}`,
    `Total: $${d.total}`,
    "Status: PENDING — we will review your request.",
  ].join("\n");
  const html = emailLayout(
    `Booking Received — ${d.ref}`,
    `<p>Hello <b>${escapeHtml(d.customerName)}</b>, thank you for booking with Explore Koh Rong.</p>
     ${bookingTable(d)}<p><b>Status: PENDING</b></p>
     <p>We will contact you after reviewing your booking.</p>`,
  );
  const result = await sendMail({
    to: d.customerEmail,
    subject: `Booking Received - ${d.ref}`,
    text,
    html,
  });
  console.log("✅ Customer booking email sent:", d.ref, result.messageId);
  return result;
}
export async function sendBookingEmails(booking) {
  const result = {
    business: { status: "PENDING", message_id: "", sent_at: null, error: "" },
    customer: { status: "PENDING", message_id: "", sent_at: null, error: "" },
  };
  try {
    const message = await sendBusinessBookingEmail(booking);
    result.business = {
      status: "SENT",
      message_id: message.messageId || "",
      sent_at: new Date().toISOString(),
      error: "",
    };
  } catch (error) {
    console.error("❌ Business booking email failed:", error);
    result.business = {
      status: "FAILED", message_id: "", sent_at: null, error: error.message || "Email failed.",
    };
  }
  try {
    const message = await sendCustomerBookingEmail(booking);
    result.customer = message.skipped
      ? { status: "SKIPPED", message_id: "", sent_at: null, error: message.reason }
      : { status: "SENT", message_id: message.messageId || "", sent_at: new Date().toISOString(), error: "" };
  } catch (error) {
    console.error("❌ Customer booking email failed:", error);
    result.customer = {
      status: "FAILED", message_id: "", sent_at: null, error: error.message || "Email failed.",
    };
  }
  return result;
}

// Preserve the export consumed by passwordResetController.js.
export async function sendPasswordResetEmail(arg1, arg2 = "", arg3 = "") {
  const options = arg1 && typeof arg1 === "object" && !Array.isArray(arg1)
    ? {
        email: arg1.email || arg1.to || arg1.recipient,
        resetUrl: arg1.resetUrl || arg1.resetURL || arg1.url || arg1.link,
        name: arg1.name || arg1.displayName || arg1.username || arg1.firstName || "Customer",
      }
    : { email: arg1, resetUrl: arg2, name: arg3 || "Customer" };
  const email = String(options.email || "").trim();
  const resetUrl = String(options.resetUrl || "").trim();
  const name = String(options.name || "Customer").trim();
  if (!email) throw new Error("Password reset email recipient is missing.");
  if (!/^https?:\/\//i.test(resetUrl)) throw new Error("A valid password reset URL is required.");
  const text = `Hello ${name},\n\nReset your Explore Koh Rong password: ${resetUrl}\n\nIf this was not you, ignore this message.`;
  const html = emailLayout(
    "Reset Your Password",
    `<p>Hello ${escapeHtml(name)},</p><p>Use this link to reset your password:</p>
    <p><a href="${escapeHtml(resetUrl)}" style="color:#238cc6">${escapeHtml(resetUrl)}</a></p>
    <p>If you did not request this, you can ignore the message.</p>`,
  );
  return sendMail({
    to: email,
    subject: "Reset Your Password - Explore Koh Rong",
    text,
    html,
  });
}
