import "dotenv/config";
import nodemailer from "nodemailer";

/*
|--------------------------------------------------------------------------
| GMAIL SMTP CONFIGURATION
|--------------------------------------------------------------------------
|
| Same .env for local and production:
|
| SMTP_USER=explorekohrong@gmail.com
| SMTP_APP_PASSWORD=your_google_app_password
| SMTP_FROM_NAME=Explore Koh Rong
| BOOKING_NOTIFICATION_EMAIL=explorekohrong@gmail.com
|
| No Resend.
| No EMAIL_PROVIDER.
| No OAuth.
|
*/

const SMTP_USER = String(process.env.SMTP_USER || "").trim();

const SMTP_APP_PASSWORD = String(process.env.SMTP_APP_PASSWORD || "")
  .replace(/\s/g, "")
  .trim();

const BUSINESS_EMAIL = String(
  process.env.BOOKING_NOTIFICATION_EMAIL || "",
).trim();

const FROM_NAME = String(
  process.env.SMTP_FROM_NAME || "Explore Koh Rong",
).trim();

/*
|--------------------------------------------------------------------------
| GMAIL TRANSPORTER
|--------------------------------------------------------------------------
*/

let transporter = null;

function mailer() {
  if (!SMTP_USER || !SMTP_APP_PASSWORD) {
    throw new Error(
      "SMTP_USER or SMTP_APP_PASSWORD is missing from backend/.env",
    );
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",

      port: 587,

      secure: false,

      requireTLS: true,

      auth: {
        user: SMTP_USER,
        pass: SMTP_APP_PASSWORD,
      },

      connectionTimeout: 10000,

      greetingTimeout: 10000,

      socketTimeout: 15000,

      tls: {
        minVersion: "TLSv1.2",
      },
    });
  }

  return transporter;
}

/*
|--------------------------------------------------------------------------
| SENDER ADDRESS
|--------------------------------------------------------------------------
*/

function fromAddress() {
  return {
    name: FROM_NAME,
    address: SMTP_USER,
  };
}

/*
|--------------------------------------------------------------------------
| SEND EMAIL
|--------------------------------------------------------------------------
*/

async function sendMail(options) {
  const mailOptions = {
    from: fromAddress(),
    ...options,
  };

  try {
    const result = await mailer().sendMail(mailOptions);

    console.log("[EMAIL SENT]", {
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
    });

    return result;
  } catch (error) {
    console.error("[EMAIL SEND FAILED]", {
      code: error.code || "",
      message: error.message || "Unknown error",
    });

    throw error;
  }
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
| New:
| AD:001
| AD:002
| AD:003
|
| Old bookings retain MongoDB fallback.
|
*/

export function getBookingReference(booking) {
  const number = String(booking?.booking_number || "").trim();

  if (number) {
    return number;
  }

  const id = String(booking?._id || "").trim();

  return id ? `#${id.slice(-6)}` : "-";
}

/*
|--------------------------------------------------------------------------
| BOOKING DESCRIPTION
|--------------------------------------------------------------------------
*/

function descriptionOf(booking) {
  const description = booking?.description;

  if (
    description &&
    typeof description === "object" &&
    !Array.isArray(description)
  ) {
    return description;
  }

  return {};
}

/*
|--------------------------------------------------------------------------
| CUSTOMER
|--------------------------------------------------------------------------
*/

function customerOf(booking) {
  const customer = booking?.customer_id;

  if (customer && typeof customer === "object") {
    return customer;
  }

  return {};
}

/*
|--------------------------------------------------------------------------
| BOOKING DATA
|--------------------------------------------------------------------------
*/

function bookingData(booking) {
  const description = descriptionOf(booking);

  const customer = customerOf(booking);

  const services = Array.isArray(booking?.products_id)
    ? booking.products_id
    : [];

  const serviceNames = services
    .filter((item) => item && typeof item === "object" && item.name)
    .map((item) => String(item.name));

  const fullName = [customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  const customerName =
    fullName ||
    customer.displayName ||
    customer.username ||
    description.customer_name ||
    "Customer";

  const paymentMethod = String(
    booking?.payment_method || booking?.paid_type || "CASH",
  ).toUpperCase();

  const payment = ["BANK", "BANK_TRANSFER"].includes(paymentMethod)
    ? "Bank Transfer"
    : "Pay at Check-in";

  return {
    ref: getBookingReference(booking),

    service: serviceNames.join(", ") || description.service_name || "Service",

    date: String(description.booking_date || booking?.booking_date || "-"),

    time: String(description.booking_time || booking?.booking_time || "-"),

    guests: Number(description.people ?? booking?.people ?? 1),

    payment,

    total: Number(booking?.total_price || 0).toFixed(2),

    note: String(description.note || booking?.note || "-").trim(),

    channel: String(description.booking_channel || "EMAIL").toUpperCase(),

    customerName: String(customerName),

    customerEmail: String(
      customer.email ||
        description.customer_email ||
        booking?.customer_email ||
        "",
    ).trim(),

    customerPhone: String(
      customer.phone ||
        description.customer_phone ||
        booking?.customer_phone ||
        "",
    ).trim(),
  };
}

/*
|--------------------------------------------------------------------------
| EMAIL HTML LAYOUT
|--------------------------------------------------------------------------
*/

function emailLayout(title, content) {
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
            <h2 style="margin:0;">
              ${escapeHtml(title)}
            </h2>
          </div>

          <div
            style="
              padding:26px;
              line-height:1.7;
            "
          >
            ${content}
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

/*
|--------------------------------------------------------------------------
| BOOKING DETAIL ROW
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| BOOKING SUMMARY TABLE
|--------------------------------------------------------------------------
*/

function bookingTable(data) {
  return `
    <table
      style="
        border-collapse:collapse;
        width:100%;
        font-size:14px;
      "
    >
      ${detailRow("Invoice Number", data.ref)}
      ${detailRow("Service", data.service)}
      ${detailRow("Date", data.date)}
      ${detailRow("Time", data.time)}
      ${detailRow("Guests", data.guests)}
      ${detailRow("Payment", data.payment)}
      ${detailRow("Total", `$${data.total}`)}
    </table>
  `;
}

/*
|--------------------------------------------------------------------------
| VERIFY GMAIL CONNECTION
|--------------------------------------------------------------------------
*/

export async function verifyEmailTransport() {
  try {
    await mailer().verify();

    console.log("[SMTP] Gmail connection verified successfully.");

    return true;
  } catch (error) {
    console.error("[SMTP VERIFICATION FAILED]", error.message);

    throw error;
  }
}

/*
|--------------------------------------------------------------------------
| SEND TEST EMAIL
|--------------------------------------------------------------------------
*/

export async function sendTestEmail() {
  if (!BUSINESS_EMAIL) {
    throw new Error("BOOKING_NOTIFICATION_EMAIL is missing.");
  }

  return sendMail({
    to: BUSINESS_EMAIL,

    subject: "Explore Koh Rong - Email Delivery Test",

    text: "Explore Koh Rong email delivery test.",

    html: emailLayout(
      "Email Delivery Test",
      `
        <h3>Gmail Test Successful</h3>

        <p>
          This is a test email from
          Explore Koh Rong.
        </p>

        <p>
          Your email sending service is working.
        </p>
      `,
    ),
  });
}

/*
|--------------------------------------------------------------------------
| BUSINESS BOOKING EMAIL
|--------------------------------------------------------------------------
*/

export async function sendBusinessBookingEmail(booking) {
  if (!BUSINESS_EMAIL) {
    throw new Error("BOOKING_NOTIFICATION_EMAIL is missing.");
  }

  const data = bookingData(booking);

  const text = [
    `New Booking: ${data.ref}`,
    "",
    `Service: ${data.service}`,
    `Date: ${data.date}`,
    `Time: ${data.time}`,
    `Guests: ${data.guests}`,
    `Payment: ${data.payment}`,
    `Total: $${data.total}`,
    "",
    `Customer: ${data.customerName}`,
    `Email: ${data.customerEmail || "-"}`,
    `Phone: ${data.customerPhone || "-"}`,
    "",
    `Preferred Contact: ${data.channel}`,
    `Special Request: ${data.note}`,
    "",
    "Status: PENDING",
  ].join("\n");

  const html = emailLayout(
    `New Booking — ${data.ref}`,
    `
      <p>
        A new booking has been submitted
        to Explore Koh Rong.
      </p>

      ${bookingTable(data)}

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
        ${escapeHtml(data.customerName)}
        <br />

        <b>Email:</b>
        ${escapeHtml(data.customerEmail || "-")}
        <br />

        <b>Phone:</b>
        ${escapeHtml(data.customerPhone || "-")}
        <br />

        <b>Contact Via:</b>
        ${escapeHtml(data.channel)}
      </p>

      <h3>Special Request</h3>

      <p>
        ${escapeHtml(data.note || "-")}
      </p>

      <p>
        <b>Status: PENDING</b>
      </p>
    `,
  );

  const result = await sendMail({
    to: BUSINESS_EMAIL,

    subject: `${data.ref} - New Booking - ${data.service}`,

    text,

    html,
  });

  console.log("[BUSINESS EMAIL SENT]", data.ref, result.messageId);

  return result;
}

/*
|--------------------------------------------------------------------------
| CUSTOMER BOOKING EMAIL
|--------------------------------------------------------------------------
*/

export async function sendCustomerBookingEmail(booking) {
  const data = bookingData(booking);

  if (!data.customerEmail) {
    return {
      skipped: true,
      reason: "Customer email is missing.",
    };
  }

  const text = [
    `Hello ${data.customerName},`,
    "",
    "Thank you for booking with Explore Koh Rong.",
    "",
    `Invoice Number: ${data.ref}`,
    `Service: ${data.service}`,
    `Date: ${data.date}`,
    `Time: ${data.time}`,
    `Guests: ${data.guests}`,
    `Total: $${data.total}`,
    "",
    "Status: PENDING",
    "",
    "We will review your booking request.",
  ].join("\n");

  const html = emailLayout(
    `Booking Received — ${data.ref}`,
    `
      <p>
        Hello
        <b>${escapeHtml(data.customerName)}</b>,
      </p>

      <p>
        Thank you for choosing Explore Koh Rong.
        We have received your booking request.
      </p>

      ${bookingTable(data)}

      <p>
        <b>Status: PENDING</b>
      </p>

      <p>
        Our team will review your booking
        and contact you after confirmation.
      </p>

      <p>
        Thank you for choosing Explore Koh Rong.
      </p>
    `,
  );

  const result = await sendMail({
    to: data.customerEmail,

    subject: `Booking Received - ${data.ref}`,

    text,

    html,
  });

  console.log("[CUSTOMER EMAIL SENT]", data.ref, result.messageId);

  return result;
}

/*
|--------------------------------------------------------------------------
| SEND BOTH BOOKING EMAILS
|--------------------------------------------------------------------------
|
| Send business and customer notifications.
|
| Failures are handled independently so one
| email failure does not prevent the other.
|
*/

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

  /*
  |--------------------------------------------------------------------------
  | BUSINESS EMAIL
  |--------------------------------------------------------------------------
  */

  try {
    const message = await sendBusinessBookingEmail(booking);

    result.business = {
      status: "SENT",
      message_id: message.messageId || "",
      sent_at: new Date().toISOString(),
      error: "",
    };
  } catch (error) {
    console.error("[BUSINESS EMAIL FAILED]", error.message);

    result.business = {
      status: "FAILED",
      message_id: "",
      sent_at: null,
      error: error.message || "Unable to send business email.",
    };
  }

  /*
  |--------------------------------------------------------------------------
  | CUSTOMER EMAIL
  |--------------------------------------------------------------------------
  */

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
    console.error("[CUSTOMER EMAIL FAILED]", error.message);

    result.customer = {
      status: "FAILED",
      message_id: "",
      sent_at: null,
      error: error.message || "Unable to send customer email.",
    };
  }

  return result;
}

/*
|--------------------------------------------------------------------------
| PASSWORD RESET EMAIL
|--------------------------------------------------------------------------
|
| Supports:
|
| sendPasswordResetEmail({
|   email,
|   resetUrl,
|   name
| })
|
| Also supports positional arguments:
|
| sendPasswordResetEmail(email, resetUrl, name)
|
*/

export async function sendPasswordResetEmail(arg1, arg2 = "", arg3 = "") {
  let options;

  if (arg1 && typeof arg1 === "object" && !Array.isArray(arg1)) {
    options = {
      email: arg1.email || arg1.to || arg1.recipient,

      resetUrl: arg1.resetUrl || arg1.resetURL || arg1.url || arg1.link,

      name:
        arg1.name ||
        arg1.displayName ||
        arg1.username ||
        arg1.firstName ||
        "Customer",
    };
  } else {
    options = {
      email: arg1,
      resetUrl: arg2,
      name: arg3 || "Customer",
    };
  }

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
        We received a request to reset
        your Explore Koh Rong password.
      </p>

      <p>
        <a
          href="${escapeHtml(resetUrl)}"
          style="
            display:inline-block;
            background:#43b5e3;
            color:#ffffff;
            padding:12px 22px;
            text-decoration:none;
            border-radius:8px;
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
