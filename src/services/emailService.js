import "dotenv/config";
import nodemailer from "nodemailer";

/*
|--------------------------------------------------------------------------
| EXPLORE KOH RONG - EMAIL SERVICE
|--------------------------------------------------------------------------
| Provider: Gmail API (HTTPS)
| Sender: Explore Koh Rong <explorekohrong@gmail.com>
|
| No Gmail SMTP connection
| No Resend
| No Gmail App Password required
|--------------------------------------------------------------------------
*/

// ======================================================
// CONFIGURATION
// ======================================================

const SMTP_USER = String(process.env.SMTP_USER || "").trim();

const BUSINESS_EMAIL = String(
  process.env.BOOKING_NOTIFICATION_EMAIL || "",
).trim();

// Fixed sender display name.
// This ignores an incorrect SMTP_FROM_NAME in .env.
const FROM_NAME = "Explore Koh Rong";

const GMAIL_CLIENT_ID = String(process.env.GMAIL_CLIENT_ID || "").trim();

const GMAIL_CLIENT_SECRET = String(
  process.env.GMAIL_CLIENT_SECRET || "",
).trim();

const GMAIL_REFRESH_TOKEN = String(
  process.env.GMAIL_REFRESH_TOKEN || "",
).trim();

// ======================================================
// MIME MESSAGE COMPOSER
// ======================================================

// Build email content locally.
// streamTransport does not connect to SMTP.

const mimeComposer = nodemailer.createTransport({
  streamTransport: true,
  buffer: true,
  newline: "unix",
});

// ======================================================
// GMAIL OAUTH TOKEN
// ======================================================

let cachedToken = "";
let tokenExpiresAt = 0;
let tokenRequest = null;

function validateGmailSettings() {
  const missing = [];

  if (!SMTP_USER) {
    missing.push("SMTP_USER");
  }

  if (!GMAIL_CLIENT_ID) {
    missing.push("GMAIL_CLIENT_ID");
  }

  if (!GMAIL_CLIENT_SECRET) {
    missing.push("GMAIL_CLIENT_SECRET");
  }

  if (!GMAIL_REFRESH_TOKEN) {
    missing.push("GMAIL_REFRESH_TOKEN");
  }

  if (missing.length > 0) {
    throw new Error(`Missing Gmail configuration: ${missing.join(", ")}`);
  }

  if (typeof fetch !== "function") {
    throw new Error("Node.js 18 or later is required.");
  }
}

async function getAccessToken() {
  validateGmailSettings();

  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  if (tokenRequest) {
    return tokenRequest;
  }

  tokenRequest = (async () => {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",

      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },

      body: new URLSearchParams({
        client_id: GMAIL_CLIENT_ID,
        client_secret: GMAIL_CLIENT_SECRET,
        refresh_token: GMAIL_REFRESH_TOKEN,
        grant_type: "refresh_token",
      }),

      signal: AbortSignal.timeout(15000),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.access_token) {
      throw new Error(
        `Gmail OAuth failed (${response.status}) ` +
          `[${data.error || "unknown_error"}]: ` +
          `${data.error_description || "Unable to obtain access token"}`,
      );
    }

    cachedToken = data.access_token;

    const expiresIn = Number(data.expires_in || 3600);

    tokenExpiresAt = Date.now() + Math.max(60, expiresIn - 120) * 1000;

    return cachedToken;
  })();

  try {
    return await tokenRequest;
  } finally {
    tokenRequest = null;
  }
}

// ======================================================
// SENDER INFORMATION
// ======================================================

function fromAddress() {
  return {
    name: FROM_NAME,
    address: SMTP_USER,
  };
}

// ======================================================
// SEND EMAIL VIA GMAIL API
// ======================================================

async function sendMail(options) {
  validateGmailSettings();

  try {
    // Build MIME message locally.
    // Sender name is always Explore Koh Rong.

    const mime = await mimeComposer.sendMail({
      ...options,
      from: fromAddress(),
    });

    const raw = mime.message.toString("base64url");

    const accessToken = await getAccessToken();

    // Gmail HTTPS API.
    // Does not use blocked SMTP ports.

    const response = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",

        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          raw,
        }),

        signal: AbortSignal.timeout(20000),
      },
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.id) {
      throw new Error(
        `Gmail API send failed (${response.status}): ${
          data.error?.message || "Unknown Gmail API error"
        }`,
      );
    }

    console.log("[GMAIL API] Email accepted:", {
      messageId: data.id,
      from: `${FROM_NAME} <${SMTP_USER}>`,
    });

    return {
      messageId: data.id,
      provider: "gmail-api",
    };
  } catch (error) {
    console.error("[GMAIL API] Email delivery failed:", error.message);

    throw error;
  }
}

// ======================================================
// VERIFY GMAIL API
// ======================================================

export async function verifyEmailTransport() {
  await getAccessToken();

  console.log("[GMAIL API] OAuth authorization verified.");

  return true;
}

// ======================================================
// HTML HELPERS
// ======================================================

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function emailLayout(title, innerHtml) {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />
      </head>

      <body
        style="
          margin:0;
          padding:22px;
          background:#f5f8fb;
          font-family:Arial,sans-serif;
          color:#173043;
        "
      >
        <div
          style="
            max-width:640px;
            margin:0 auto;
            background:#ffffff;
            border:1px solid #e6edf3;
            border-radius:12px;
            overflow:hidden;
          "
        >
          <div
            style="
              background:#43b5e3;
              color:#ffffff;
              padding:22px 26px;
            "
          >
            <h2 style="margin:0">
              ${escapeHtml(title)}
            </h2>
          </div>

          <div
            style="
              padding:26px;
              line-height:1.7;
            "
          >
            ${innerHtml}
          </div>

          <div
            style="
              padding:14px 26px;
              background:#f7fbfd;
              color:#667788;
              font-size:12px;
            "
          >
            Explore Koh Rong
          </div>
        </div>
      </body>
    </html>
  `;
}

function detailRow(label, value) {
  return `
    <tr>
      <td
        style="
          padding:8px 12px 8px 0;
          color:#64748b;
          vertical-align:top;
        "
      >
        ${escapeHtml(label)}
      </td>

      <td
        style="
          padding:8px 0;
          font-weight:600;
        "
      >
        ${escapeHtml(value)}
      </td>
    </tr>
  `;
}

// ======================================================
// BOOKING REFERENCE
// ======================================================

// Preserve AD:001, AD:002, etc.
// Old records fall back to their MongoDB ID.

export function getBookingReference(booking) {
  const number = String(booking?.booking_number || "").trim();

  if (number) {
    return number;
  }

  const id = String(booking?._id || "").trim();

  return id ? `#${id.slice(-6)}` : "-";
}

// ======================================================
// BOOKING DATA HELPERS
// ======================================================

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

  const services = Array.isArray(booking?.products_id)
    ? booking.products_id
    : [];

  const serviceNames = services
    .filter((item) => item && typeof item === "object" && item.name)
    .map((item) => String(item.name));

  const customerName =
    `${String(c.firstName || "").trim()} ${String(c.lastName || "").trim()}`.trim() ||
    c.displayName ||
    c.username ||
    "Customer";

  const paymentMethod = String(
    booking?.payment_method || booking?.paid_type || "CASH",
  ).toUpperCase();

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

function bookingTable(d) {
  return `
    <table
      style="
        border-collapse:collapse;
        width:100%;
        font-size:14px;
      "
    >
      ${detailRow("Reference", d.ref)}
      ${detailRow("Service", d.service)}
      ${detailRow("Date", d.date)}
      ${detailRow("Time", d.time)}
      ${detailRow("Guests", d.guests)}
      ${detailRow("Payment", d.payment)}
      ${detailRow("Total", `$${d.total}`)}
    </table>
  `;
}

// ======================================================
// SEND TEST EMAIL
// ======================================================

export async function sendTestEmail() {
  if (!BUSINESS_EMAIL) {
    throw new Error("BOOKING_NOTIFICATION_EMAIL is missing.");
  }

  const text = [
    "Explore Koh Rong",
    "",
    "Gmail API email delivery test.",
    "",
    `Sender: ${FROM_NAME}`,
    `Email: ${SMTP_USER}`,
    "",
    "This email confirms the Gmail API send request.",
  ].join("\n");

  const html = emailLayout(
    "Email Delivery Test",
    `
      <h3>Explore Koh Rong</h3>

      <p>
        This is a test email from
        Explore Koh Rong.
      </p>

      <p>
        <b>Sender:</b> ${escapeHtml(FROM_NAME)}
        <br>

        <b>Email:</b> ${escapeHtml(SMTP_USER)}
      </p>

      <p>
        Gmail API accepted this test message.
      </p>
    `,
  );

  return sendMail({
    to: BUSINESS_EMAIL,

    subject: "Explore Koh Rong - Email Delivery Test",

    text,
    html,
  });
}

// ======================================================
// BUSINESS BOOKING EMAIL
// ======================================================

export async function sendBusinessBookingEmail(booking) {
  if (!BUSINESS_EMAIL) {
    throw new Error("BOOKING_NOTIFICATION_EMAIL is missing.");
  }

  const d = bookingData(booking);

  const text = [
    `New booking: ${d.ref}`,
    "",
    `Service: ${d.service}`,
    `Date: ${d.date}`,
    `Time: ${d.time}`,
    `Guests: ${d.guests}`,
    `Payment: ${d.payment}`,
    `Total: $${d.total}`,
    "",
    `Customer: ${d.customerName}`,
    `Email: ${d.customerEmail || "-"}`,
    `Phone: ${d.customerPhone || "-"}`,
    `Preferred contact: ${d.channel}`,
    `Special request: ${d.note || "-"}`,
    "",
    "Status: PENDING",
  ].join("\n");

  const html = emailLayout(
    `New Booking — ${d.ref}`,
    `
      <p>
        A new booking has been submitted
        to Explore Koh Rong.
      </p>

      ${bookingTable(d)}

      <hr
        style="
          border:0;
          border-top:1px solid #e2e8f0;
          margin:20px 0;
        "
      />

      <h3>Customer Information</h3>

      <p>
        <b>Name:</b>
        ${escapeHtml(d.customerName)}
        <br>

        <b>Email:</b>
        ${escapeHtml(d.customerEmail || "-")}
        <br>

        <b>Phone:</b>
        ${escapeHtml(d.customerPhone || "-")}
        <br>

        <b>Preferred Contact:</b>
        ${escapeHtml(d.channel)}
      </p>

      <h3>Special Request</h3>

      <p>
        ${escapeHtml(d.note || "-")}
      </p>

      <p>
        <b>Status: PENDING</b>
      </p>
    `,
  );

  const result = await sendMail({
    to: BUSINESS_EMAIL,

    subject: `${d.ref} - New Booking - ${d.service}`,

    text,
    html,
  });

  console.log("[BUSINESS EMAIL SENT]", d.ref, result.messageId);

  return result;
}

// ======================================================
// CUSTOMER BOOKING EMAIL
// ======================================================

export async function sendCustomerBookingEmail(booking) {
  const d = bookingData(booking);

  if (!d.customerEmail) {
    return {
      skipped: true,
      reason: "Customer email is missing.",
    };
  }

  const text = [
    `Hello ${d.customerName},`,
    "",
    "Thank you for booking with Explore Koh Rong.",
    "",
    `Booking Reference: ${d.ref}`,
    `Service: ${d.service}`,
    `Date: ${d.date}`,
    `Time: ${d.time}`,
    `Guests: ${d.guests}`,
    `Payment: ${d.payment}`,
    `Total: $${d.total}`,
    "",
    "Status: PENDING",
    "",
    "Our team will review your booking request.",
  ].join("\n");

  const html = emailLayout(
    `Booking Received — ${d.ref}`,
    `
      <p>
        Hello
        <b>${escapeHtml(d.customerName)}</b>,
      </p>

      <p>
        Thank you for booking with
        Explore Koh Rong.
      </p>

      <p>
        We have received your booking request.
      </p>

      ${bookingTable(d)}

      <p>
        <b>Status: PENDING</b>
      </p>

      <p>
        We will contact you after reviewing
        your booking.
      </p>

      <p>
        Thank you for choosing Explore Koh Rong.
      </p>
    `,
  );

  const result = await sendMail({
    to: d.customerEmail,

    subject: `Booking Received - ${d.ref}`,

    text,
    html,
  });

  console.log("[CUSTOMER EMAIL SENT]", d.ref, result.messageId);

  return result;
}

// ======================================================
// SEND BUSINESS AND CUSTOMER BOOKING EMAILS
// ======================================================

// Required by bookingController.js.
//
// Each send is handled independently so a
// failure in one notification does not stop
// the other notification.

export async function sendBookingEmails(booking) {
  const result = {
    business: {
      status: "PENDING",
      message_id: "",
      sent_at: null,
      error: "",
    },

    customer: {
      status: "PENDING",
      message_id: "",
      sent_at: null,
      error: "",
    },
  };

  // --------------------------------------------------
  // BUSINESS EMAIL
  // --------------------------------------------------

  try {
    const message = await sendBusinessBookingEmail(booking);

    result.business = {
      status: "SENT",
      message_id: message.messageId || "",
      sent_at: new Date().toISOString(),
      error: "",
    };
  } catch (error) {
    console.error("[BUSINESS BOOKING EMAIL FAILED]", error.message);

    result.business = {
      status: "FAILED",
      message_id: "",
      sent_at: null,
      error: error.message || "Unable to send business email.",
    };
  }

  // --------------------------------------------------
  // CUSTOMER EMAIL
  // --------------------------------------------------

  try {
    const message = await sendCustomerBookingEmail(booking);

    if (message.skipped) {
      result.customer = {
        status: "SKIPPED",
        message_id: "",
        sent_at: null,
        error: message.reason,
      };
    } else {
      result.customer = {
        status: "SENT",
        message_id: message.messageId || "",
        sent_at: new Date().toISOString(),
        error: "",
      };
    }
  } catch (error) {
    console.error("[CUSTOMER BOOKING EMAIL FAILED]", error.message);

    result.customer = {
      status: "FAILED",
      message_id: "",
      sent_at: null,
      error: error.message || "Unable to send customer email.",
    };
  }

  return result;
}

// ======================================================
// PASSWORD RESET EMAIL
// ======================================================

// Supports both:
//
// sendPasswordResetEmail({
//   email,
//   resetUrl,
//   name
// })
//
// and:
//
// sendPasswordResetEmail(email, resetUrl, name)
//
// Required by passwordResetController.js.

export async function sendPasswordResetEmail(arg1, arg2 = "", arg3 = "") {
  const options =
    arg1 && typeof arg1 === "object" && !Array.isArray(arg1)
      ? {
          email: arg1.email || arg1.to || arg1.recipient,

          resetUrl: arg1.resetUrl || arg1.resetURL || arg1.url || arg1.link,

          name:
            arg1.name ||
            arg1.displayName ||
            arg1.username ||
            arg1.firstName ||
            "Customer",
        }
      : {
          email: arg1,
          resetUrl: arg2,
          name: arg3 || "Customer",
        };

  const email = String(options.email || "").trim();

  const resetUrl = String(options.resetUrl || "").trim();

  const name = String(options.name || "Customer").trim();

  if (!email) {
    throw new Error("Password reset email recipient is missing.");
  }

  if (!/^https?:\/\//i.test(resetUrl)) {
    throw new Error("A valid password reset URL is required.");
  }

  const text = [
    `Hello ${name},`,
    "",
    "We received a request to reset your password.",
    "",
    `Reset your password: ${resetUrl}`,
    "",
    "If you did not request this, ignore this email.",
  ].join("\n");

  const html = emailLayout(
    "Reset Your Password",
    `
      <p>
        Hello ${escapeHtml(name)},
      </p>

      <p>
        We received a request to reset your
        Explore Koh Rong password.
      </p>

      <p>
        <a
          href="${escapeHtml(resetUrl)}"
          style="
            display:inline-block;
            background:#43b5e3;
            color:#ffffff;
            padding:12px 22px;
            border-radius:8px;
            text-decoration:none;
          "
        >
          Reset Password
        </a>
      </p>

      <p>
        If you did not request this,
        you can safely ignore this email.
      </p>
    `,
  );

  return sendMail({
    to: email,

    subject: "Reset Your Password - Explore Koh Rong",

    text,
    html,
  });
}
