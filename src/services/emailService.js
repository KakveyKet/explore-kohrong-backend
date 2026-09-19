import "dotenv/config";

import nodemailer from "nodemailer";

/*
|--------------------------------------------------------------------------
| SMTP CONFIG
|--------------------------------------------------------------------------
*/

const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";

const smtpPort = Number(process.env.SMTP_PORT || 587);

const smtpSecure =
  String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";

const smtpUser = process.env.SMTP_USER;

const smtpPass = process.env.SMTP_PASS;

/*
|--------------------------------------------------------------------------
| VALIDATE CONFIG
|--------------------------------------------------------------------------
*/

function validateEmailConfig() {
  if (!smtpUser) {
    throw new Error("SMTP_USER is missing from backend .env");
  }

  if (!smtpPass) {
    throw new Error("SMTP_PASS is missing from backend .env");
  }
}

/*
|--------------------------------------------------------------------------
| TRANSPORTER
|--------------------------------------------------------------------------
*/

function createTransporter() {
  validateEmailConfig();

  return nodemailer.createTransport({
    host: smtpHost,

    port: smtpPort,

    secure: smtpSecure,

    auth: {
      user: smtpUser,

      pass: smtpPass,
    },
  });
}

/*
|--------------------------------------------------------------------------
| ESCAPE HTML
|--------------------------------------------------------------------------
*/

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/*
|--------------------------------------------------------------------------
| PASSWORD RESET EMAIL
|--------------------------------------------------------------------------
*/

export async function sendPasswordResetEmail({ email, name, resetUrl }) {
  /*
   * Create transporter only when
   * actually sending an email.
   */

  const transporter = createTransporter();

  const businessName = process.env.EMAIL_FROM_NAME || "Explore Koh Rong";

  const fromAddress = process.env.EMAIL_FROM_ADDRESS || smtpUser;

  const logoUrl =
    process.env.EMAIL_LOGO_URL ||
    "https://res.cloudinary.com/dvljcimlz/image/upload/v1789279845/kohrongLogo_dbpydc.png";

  const safeName = escapeHtml(name || "there");

  const safeResetUrl = escapeHtml(resetUrl);

  const safeLogoUrl = escapeHtml(logoUrl);

  const text = `
Hello ${name || "there"},

We received a request to reset your Explore Koh Rong password.

Reset your password:
${resetUrl}

This link expires in 15 minutes.

If you did not request this password reset, you can ignore this email.

Explore Koh Rong
  `.trim();

  const html = `
    <!DOCTYPE html>

    <html lang="en">
      <head>
        <meta charset="UTF-8" />

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />

        <title>
          Reset Password
        </title>
      </head>

      <body
        style="
          margin:0;
          padding:0;
          background:#f8fafc;
          font-family:Arial,Helvetica,sans-serif;
          color:#334155;
        "
      >
        <table
          role="presentation"
          width="100%"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="
            background:#f8fafc;
            padding:32px 16px;
          "
        >
          <tr>
            <td align="center">
              <table
                role="presentation"
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                  max-width:560px;
                  background:#ffffff;
                  border:1px solid #e2e8f0;
                  border-radius:20px;
                "
              >
                <tr>
                  <td
                    style="
                      padding:32px;
                    "
                  >
                    <!-- LOGO -->

                    <div
                      style="
                        text-align:center;
                        margin-bottom:24px;
                      "
                    >
                      <img
                        src="${safeLogoUrl}"
                        alt="Explore Koh Rong"
                        style="
                          max-width:170px;
                          max-height:100px;
                          object-fit:contain;
                        "
                      />
                    </div>

                    <!-- TITLE -->

                    <h1
                      style="
                        margin:0;
                        text-align:center;
                        font-size:26px;
                        color:#0f172a;
                      "
                    >
                      Reset Your Password
                    </h1>

                    <!-- GREETING -->

                    <p
                      style="
                        margin:24px 0 0;
                        font-size:15px;
                        line-height:1.7;
                        color:#64748b;
                      "
                    >
                      Hello ${safeName},
                    </p>

                    <p
                      style="
                        margin:12px 0 0;
                        font-size:15px;
                        line-height:1.7;
                        color:#64748b;
                      "
                    >
                      We received a request to reset your
                      Explore Koh Rong account password.
                    </p>

                    <!-- BUTTON -->

                    <div
                      style="
                        margin:28px 0;
                        text-align:center;
                      "
                    >
                      <a
                        href="${safeResetUrl}"
                        style="
                          display:inline-block;
                          padding:13px 28px;
                          border-radius:999px;
                          background:#258ff3;
                          color:#ffffff;
                          font-size:14px;
                          font-weight:600;
                          text-decoration:none;
                        "
                      >
                        Reset Password
                      </a>
                    </div>

                    <p
                      style="
                        margin:0;
                        font-size:14px;
                        line-height:1.7;
                        color:#64748b;
                      "
                    >
                      This password reset link expires in
                      <strong>
                        15 minutes
                      </strong>.
                    </p>

                    <p
                      style="
                        margin:12px 0 0;
                        font-size:14px;
                        line-height:1.7;
                        color:#64748b;
                      "
                    >
                      If you did not request this password reset,
                      you can safely ignore this email.
                    </p>

                    <div
                      style="
                        margin-top:28px;
                        padding-top:20px;
                        border-top:1px solid #e2e8f0;
                        text-align:center;
                        font-size:12px;
                        color:#94a3b8;
                      "
                    >
                      Explore Koh Rong
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return transporter.sendMail({
    from: `"${businessName}" <${fromAddress}>`,

    to: email,

    subject: "Reset your Explore Koh Rong password",

    text,

    html,
  });
}
