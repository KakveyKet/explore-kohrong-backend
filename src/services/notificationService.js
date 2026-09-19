import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function money(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value || 0);
}

export async function sendAdminNewBookingEmail(booking) {
  if (!resend || !process.env.ADMIN_EMAIL || !process.env.EMAIL_FROM) return;

  const names = (booking.products_id || []).map((item) => item.name).join(', ');

  await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: process.env.ADMIN_EMAIL,
    subject: `New booking ${booking._id}`,
    html: `
      <h2>New booking received</h2>
      <p>Customer: ${booking.customer_id?.username || ''}</p>
      <p>Email: ${booking.customer_id?.email || ''}</p>
      <p>Services: ${names}</p>
      <p>Total: ${money(booking.total_price)}</p>
      <p>Payment: ${booking.payment_method}</p>
      <p>Status: ${booking.status}</p>
    `,
  });
}

export async function sendCustomerBookingAcceptedEmail(booking) {
  if (!resend || !process.env.EMAIL_FROM || !booking.customer_id?.email) return;

  const names = (booking.products_id || []).map((item) => item.name).join(', ');

  await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: booking.customer_id.email,
    subject: 'Your Explore Koh Rong booking is confirmed',
    html: `
      <h2>Booking confirmed</h2>
      <p>Hello ${booking.customer_id.username},</p>
      <p>Your booking has been accepted.</p>
      <p>Services: ${names}</p>
      <p>Total: ${money(booking.total_price)}</p>
    `,
  });
}

export async function sendTelegramNewBooking(booking) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) return;

  const names = (booking.products_id || []).map((item) => item.name).join(', ');
  const details =
    booking.description && typeof booking.description === 'object'
      ? booking.description
      : {};

  const text = [
    '🆕 New Explore Koh Rong booking',
    `Booking: ${booking._id}`,
    `Customer: ${booking.customer_id?.username || ''}`,
    `Email: ${booking.customer_id?.email || ''}`,
    `Services: ${names}`,
    `Date: ${details.booking_date || '-'}`,
    `Time: ${details.booking_time || '-'}`,
    `People: ${details.people || '-'}`,
    `Total: ${money(booking.total_price)}`,
    `Payment: ${booking.payment_method}`,
    `Status: ${booking.status}`,
  ].join('\n');

  const response = await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Telegram notification failed: ${response.status}`);
  }
}
