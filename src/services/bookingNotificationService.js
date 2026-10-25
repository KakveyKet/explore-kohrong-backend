// src/services/bookingNotificationService.js

import nodemailer from "nodemailer";

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function retry(fn, attempts = 2) {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < attempts) {
        await sleep(800 * attempt);
      }
    }
  }

  throw lastError;
}

function normalizeNumber(value) {
  let number = String(value || "")
    .trim()
    .replace(/\D/g, "");

  if (number.startsWith("8550")) {
    number = `855${number.slice(4)}`;
  }

  if (number.startsWith("0")) {
    number = `855${number.slice(1)}`;
  }

  return number;
}

function safeDescription(booking) {
  if (
    booking?.description &&
    typeof booking.description === "object" &&
    !Array.isArray(booking.description)
  ) {
    return booking.description;
  }

  return {};
}

/*
|--------------------------------------------------------------------------
| HTML ESCAPE
|--------------------------------------------------------------------------
*/

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/*
|--------------------------------------------------------------------------
| BOOKING REFERENCE
|--------------------------------------------------------------------------
|
| Example:
|
| #10_22_2026_541
|
*/

export function getBookingReference(booking) {
  const id = String(booking?._id || "").trim();

  if (!id) {
    return "-";
  }

  let date = null;

  /*
  |--------------------------------------------------------------------------
  | CREATED_AT
  |--------------------------------------------------------------------------
  */

  if (booking?.created_at) {
    const parsed = new Date(booking.created_at);

    if (!Number.isNaN(parsed.getTime())) {
      date = parsed;
    }
  }

  /*
  |--------------------------------------------------------------------------
  | CREATEDAT
  |--------------------------------------------------------------------------
  */

  if (!date && booking?.createdAt) {
    const parsed = new Date(booking.createdAt);

    if (!Number.isNaN(parsed.getTime())) {
      date = parsed;
    }
  }

  /*
  |--------------------------------------------------------------------------
  | MONGODB OBJECT ID
  |--------------------------------------------------------------------------
  */

  if (!date && /^[a-fA-F0-9]{24}$/.test(id)) {
    const timestamp = parseInt(id.substring(0, 8), 16);

    const parsed = new Date(timestamp * 1000);

    if (!Number.isNaN(parsed.getTime())) {
      date = parsed;
    }
  }

  if (!date) {
    return `#${id.slice(-3)}`;
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Phnom_Penh",

    month: "2-digit",

    day: "2-digit",

    year: "numeric",
  }).formatToParts(date);

  const month = parts.find((part) => part.type === "month")?.value || "00";

  const day = parts.find((part) => part.type === "day")?.value || "00";

  const year = parts.find((part) => part.type === "year")?.value || "0000";

  return `#${month}_${day}_${year}_${id.slice(-3)}`;
}

/*
|--------------------------------------------------------------------------
| SERVICES
|--------------------------------------------------------------------------
*/

function getServices(booking) {
  if (Array.isArray(booking?.products_id)) {
    return booking.products_id.filter(
      (item) => item && typeof item === "object",
    );
  }

  return [];
}

function getServiceNames(booking) {
  const services = getServices(booking);

  const names = services.map((service) => service?.name).filter(Boolean);

  if (names.length) {
    return names.join(", ");
  }

  const description = safeDescription(booking);

  return description.service_name || "Service";
}

/*
|--------------------------------------------------------------------------
| CUSTOMER
|--------------------------------------------------------------------------
*/

function getCustomer(booking) {
  if (booking?.customer_id && typeof booking.customer_id === "object") {
    return booking.customer_id;
  }

  return {};
}

function getCustomerName(booking) {
  const customer = getCustomer(booking);

  const firstName = String(customer?.firstName || "").trim();

  const lastName = String(customer?.lastName || "").trim();

  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || customer?.username || "-";
}

/*
|--------------------------------------------------------------------------
| PAYMENT
|--------------------------------------------------------------------------
*/

function getPaymentLabel(booking) {
  const value = String(
    booking?.payment_method || booking?.paid_type || "",
  ).toUpperCase();

  if (value === "CASH" || value === "PAY_AT_CHECK_IN") {
    return "Pay at Check-in";
  }

  if (value === "BANK" || value === "BANK_TRANSFER") {
    return "Bank Transfer";
  }

  return value || "-";
}

/*
|--------------------------------------------------------------------------
| BOOKING MESSAGE
|--------------------------------------------------------------------------
*/

export function buildBookingMessage(booking) {
  const description = safeDescription(booking);

  const customer = getCustomer(booking);

  const reference = getBookingReference(booking);

  const serviceName = getServiceNames(booking);

  const bookingDate = description.booking_date || booking?.booking_date || "-";

  const bookingTime = description.booking_time || booking?.booking_time || "-";

  const people = description.people || booking?.people || 1;

  const note = description.note || booking?.note || "-";

  const channel = description.booking_channel || "-";

  const lines = [
    "NEW BOOKING - EXPLORE KOH RONG",
    "",
    `Reference: ${reference}`,
    `Service: ${serviceName}`,
    `Date: ${bookingDate}`,
    `Time: ${bookingTime}`,
    `Guests: ${people}`,
    `Payment: ${getPaymentLabel(booking)}`,
    `Total: $${Number(booking?.total_price || 0).toFixed(2)}`,
    `Preferred Contact: ${channel}`,
    "",
    `Customer: ${getCustomerName(booking)}`,
    `Phone: ${customer?.phone || "-"}`,
    `Email: ${customer?.email || "-"}`,
    "",
    `Special Request: ${note}`,
    "",
    "Status: PENDING",
    "",
    "Please check the Explore Koh Rong admin dashboard.",
  ];

  return lines.join("\n");
}

/*
|--------------------------------------------------------------------------
| EMAIL HTML
|--------------------------------------------------------------------------
*/

function buildBookingHtml(booking) {
  const description = safeDescription(booking);

  const customer = getCustomer(booking);

  const reference = getBookingReference(booking);

  const serviceName = getServiceNames(booking);

  const bookingDate = description.booking_date || booking?.booking_date || "-";

  const bookingTime = description.booking_time || booking?.booking_time || "-";

  const people = description.people || booking?.people || 1;

  const note = description.note || booking?.note || "-";

  const channel = description.booking_channel || "-";

  return `
    <div
      style="
        max-width: 680px;
        margin: 0 auto;
        font-family: Arial, Helvetica, sans-serif;
        color: #0f172a;
      "
    >
      <div
        style="
          background: #43B5E3;
          color: white;
          padding: 22px;
          border-radius: 12px 12px 0 0;
        "
      >
        <h2
          style="
            margin: 0;
            font-size: 22px;
          "
        >
          New Explore Koh Rong Booking
        </h2>

        <p
          style="
            margin: 8px 0 0;
            opacity: .9;
          "
        >
          ${escapeHtml(reference)}
        </p>
      </div>

      <div
        style="
          padding: 24px;
          border: 1px solid #e2e8f0;
          border-top: 0;
          border-radius: 0 0 12px 12px;
        "
      >
        <h3>Booking Information</h3>

        <table
          style="
            width: 100%;
            border-collapse: collapse;
          "
        >
          <tr>
            <td style="padding: 8px 0;">Service</td>
            <td
              style="
                padding: 8px 0;
                font-weight: bold;
              "
            >
              ${escapeHtml(serviceName)}
            </td>
          </tr>

          <tr>
            <td style="padding: 8px 0;">Date</td>
            <td style="padding: 8px 0;">
              ${escapeHtml(bookingDate)}
            </td>
          </tr>

          <tr>
            <td style="padding: 8px 0;">Time</td>
            <td style="padding: 8px 0;">
              ${escapeHtml(bookingTime)}
            </td>
          </tr>

          <tr>
            <td style="padding: 8px 0;">Guests</td>
            <td style="padding: 8px 0;">
              ${escapeHtml(people)}
            </td>
          </tr>

          <tr>
            <td style="padding: 8px 0;">Payment</td>
            <td style="padding: 8px 0;">
              ${escapeHtml(getPaymentLabel(booking))}
            </td>
          </tr>

          <tr>
            <td style="padding: 8px 0;">Total</td>
            <td
              style="
                padding: 8px 0;
                color: #319ECC;
                font-weight: bold;
              "
            >
              $${Number(booking?.total_price || 0).toFixed(2)}
            </td>
          </tr>

          <tr>
            <td style="padding: 8px 0;">Contact Via</td>
            <td style="padding: 8px 0;">
              ${escapeHtml(channel)}
            </td>
          </tr>
        </table>

        <hr
          style="
            margin: 20px 0;
            border: 0;
            border-top: 1px solid #e2e8f0;
          "
        />

        <h3>Customer</h3>

        <p>
          <strong>Name:</strong>
          ${escapeHtml(getCustomerName(booking))}
        </p>

        <p>
          <strong>Phone:</strong>
          ${escapeHtml(customer?.phone || "-")}
        </p>

        <p>
          <strong>Email:</strong>
          ${escapeHtml(customer?.email || "-")}
        </p>

        <p>
          <strong>Special Request:</strong><br>
          ${escapeHtml(note)}
        </p>

        <div
          style="
            margin-top: 24px;
            padding: 14px;
            background: #fef3c7;
            border-radius: 8px;
          "
        >
          Booking status:
          <strong>PENDING</strong>
        </div>
      </div>
    </div>
  `;
}

/*
|--------------------------------------------------------------------------
| EMAIL TRANSPORT
|--------------------------------------------------------------------------
*/

let transporter = null;

function getTransporter() {
  const user = String(process.env.SMTP_USER || "").trim();

  const pass = String(process.env.SMTP_PASS || "").trim();

  if (!user || !pass) {
    return null;
  }

  if (transporter) {
    return transporter;
  }

  const port = Number(process.env.SMTP_PORT || 465);

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",

    port,

    secure:
      String(process.env.SMTP_SECURE ?? port === 465).toLowerCase() === "true",

    auth: {
      user,
      pass,
    },
  });

  return transporter;
}

/*
|--------------------------------------------------------------------------
| SEND ADMIN EMAIL
|--------------------------------------------------------------------------
*/

export async function sendBookingEmail(booking) {
  const mailer = getTransporter();

  const recipient = String(process.env.BOOKING_NOTIFICATION_EMAIL || "").trim();

  if (!mailer) {
    return {
      status: "SKIPPED",

      error: "SMTP_USER or SMTP_PASS is not configured.",
    };
  }

  if (!recipient) {
    return {
      status: "SKIPPED",

      error: "BOOKING_NOTIFICATION_EMAIL is not configured.",
    };
  }

  const reference = getBookingReference(booking);

  const serviceName = getServiceNames(booking);

  const fromName = process.env.SMTP_FROM_NAME || "Explore Koh Rong";

  const fromEmail = process.env.SMTP_USER;

  try {
    const result = await retry(
      () =>
        mailer.sendMail({
          from: `"${fromName}" <${fromEmail}>`,

          to: recipient,

          subject: `${reference} - New Booking - ${serviceName}`,

          text: buildBookingMessage(booking),

          html: buildBookingHtml(booking),
        }),
      2,
    );

    return {
      status: "SENT",

      message_id: result?.messageId || "",

      sent_at: new Date().toISOString(),

      error: "",
    };
  } catch (error) {
    console.error("[BOOKING EMAIL ERROR]", error);

    return {
      status: "FAILED",

      message_id: "",

      sent_at: null,

      error: error?.message || "Unable to send email.",
    };
  }
}

/*
|--------------------------------------------------------------------------
| SEND WHATSAPP CLOUD API
|--------------------------------------------------------------------------
*/

export async function sendBookingWhatsApp(booking) {
  const enabled =
    String(process.env.WHATSAPP_ENABLED || "false").toLowerCase() === "true";

  if (!enabled) {
    return {
      status: "SKIPPED",

      error: "WhatsApp Cloud API is disabled.",
    };
  }

  const graphVersion = String(process.env.WHATSAPP_GRAPH_VERSION || "").trim();

  const phoneNumberId = String(
    process.env.WHATSAPP_PHONE_NUMBER_ID || "",
  ).trim();

  const accessToken = String(process.env.WHATSAPP_ACCESS_TOKEN || "").trim();

  const recipient = normalizeNumber(process.env.WHATSAPP_ADMIN_NUMBER);

  if (!graphVersion || !phoneNumberId || !accessToken || !recipient) {
    return {
      status: "SKIPPED",

      error: "WhatsApp Cloud API configuration is incomplete.",
    };
  }

  const url =
    `https://graph.facebook.com/` +
    `${graphVersion}/` +
    `${phoneNumberId}/messages`;

  const templateName = String(process.env.WHATSAPP_TEMPLATE_NAME || "").trim();

  let payload;

  /*
  |--------------------------------------------------------------------------
  | TEMPLATE
  |--------------------------------------------------------------------------
  |
  | Recommended for reliable business-initiated notifications.
  |
  | Create a simple approved template such as:
  |
  | "You have received a new Explore Koh Rong booking.
  | Please check the admin dashboard."
  |
  */

  if (templateName) {
    payload = {
      messaging_product: "whatsapp",

      recipient_type: "individual",

      to: recipient,

      type: "template",

      template: {
        name: templateName,

        language: {
          code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en_US",
        },
      },
    };
  } else {
    /*
    |--------------------------------------------------------------------------
    | TEXT
    |--------------------------------------------------------------------------
    */

    payload = {
      messaging_product: "whatsapp",

      recipient_type: "individual",

      to: recipient,

      type: "text",

      text: {
        preview_url: false,

        body: buildBookingMessage(booking),
      },
    };
  }

  try {
    const data = await retry(async () => {
      const response = await fetch(url, {
        method: "POST",

        headers: {
          Authorization: `Bearer ${accessToken}`,

          "Content-Type": "application/json",
        },

        body: JSON.stringify(payload),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(
          json?.error?.message || `WhatsApp API returned ${response.status}`,
        );
      }

      return json;
    }, 2);

    return {
      status: "SENT",

      message_id: data?.messages?.[0]?.id || "",

      sent_at: new Date().toISOString(),

      error: "",
    };
  } catch (error) {
    console.error("[BOOKING WHATSAPP ERROR]", error);

    return {
      status: "FAILED",

      message_id: "",

      sent_at: null,

      error: error?.message || "Unable to send WhatsApp notification.",
    };
  }
}

/*
|--------------------------------------------------------------------------
| SEND BOOKING NOTIFICATIONS
|--------------------------------------------------------------------------
|
| EMAIL IS ALWAYS ATTEMPTED.
|
| WhatsApp is additionally attempted when the customer selected WhatsApp.
|
*/

export async function sendBookingNotifications(booking) {
  const description = safeDescription(booking);

  const preferredChannel = String(
    description.booking_channel || "EMAIL",
  ).toUpperCase();

  /*
  |--------------------------------------------------------------------------
  | EMAIL
  |--------------------------------------------------------------------------
  */

  const email = await sendBookingEmail(booking);

  /*
  |--------------------------------------------------------------------------
  | WHATSAPP
  |--------------------------------------------------------------------------
  */

  let whatsapp = {
    status: "NOT_REQUESTED",

    message_id: "",

    sent_at: null,

    error: "",
  };

  if (preferredChannel === "WHATSAPP") {
    whatsapp = await sendBookingWhatsApp(booking);
  }

  return {
    preferred_channel: preferredChannel,

    email,

    whatsapp,

    attempted_at: new Date().toISOString(),
  };
}
