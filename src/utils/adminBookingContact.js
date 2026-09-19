/*
|--------------------------------------------------------------------------
| CUSTOMER NAME
|--------------------------------------------------------------------------
*/

export function bookingCustomerName(booking) {
  const customer = booking?.customer_id;

  if (!customer) {
    return "Customer";
  }

  const firstName = customer?.firstName || "";

  const lastName = customer?.lastName || "";

  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || customer?.username || "Customer";
}

/*
|--------------------------------------------------------------------------
| CUSTOMER EMAIL
|--------------------------------------------------------------------------
*/

export function bookingCustomerEmail(booking) {
  return booking?.customer_id?.email || "";
}

/*
|--------------------------------------------------------------------------
| CUSTOMER PHONE
|--------------------------------------------------------------------------
*/

export function bookingCustomerPhone(booking) {
  return booking?.customer_id?.phone || "";
}

/*
|--------------------------------------------------------------------------
| BOOKING CHANNEL
|--------------------------------------------------------------------------
*/

export function bookingChannel(booking) {
  return String(booking?.description?.booking_channel || "")
    .trim()
    .toUpperCase();
}

/*
|--------------------------------------------------------------------------
| SERVICE NAMES
|--------------------------------------------------------------------------
*/

export function bookingServiceNames(booking) {
  const products = Array.isArray(booking?.products_id)
    ? booking.products_id
    : [];

  const names = products.map((product) => product?.name || "").filter(Boolean);

  return names.join(", ") || "Service";
}

/*
|--------------------------------------------------------------------------
| DATE
|--------------------------------------------------------------------------
*/

export function bookingDateLabel(booking) {
  const value = booking?.description?.booking_date;

  if (!value) {
    return "-";
  }

  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);

  if (!year || !month || !day) {
    return String(value);
  }

  const date = new Date(Date.UTC(year, month - 1, day));

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/*
|--------------------------------------------------------------------------
| TIME
|--------------------------------------------------------------------------
*/

export function bookingTimeLabel(booking) {
  const value = booking?.description?.booking_time;

  if (!value) {
    return "-";
  }

  const [hour, minute] = String(value).split(":").map(Number);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return String(value);
  }

  const date = new Date();

  date.setHours(hour, minute, 0, 0);

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/*
|--------------------------------------------------------------------------
| GUESTS
|--------------------------------------------------------------------------
*/

export function bookingGuestLabel(booking) {
  const people = Math.max(1, Number(booking?.description?.people || 1));

  return `${people} ${people === 1 ? "person" : "people"}`;
}

/*
|--------------------------------------------------------------------------
| NORMALIZE WHATSAPP PHONE
|--------------------------------------------------------------------------
|
| Examples:
|
| +855 88 579 2065
| -> 855885792065
|
| 0885792065
| -> 855885792065
|
| International numbers already beginning with
| their country code are kept.
|
*/

export function normalizeCustomerWhatsAppNumber(value) {
  let number = String(value || "").replace(/\D/g, "");

  if (!number) {
    return "";
  }

  /*
   * Cambodian local number.
   */

  if (number.startsWith("0")) {
    number = `855${number.slice(1)}`;
  }

  return number;
}

/*
|--------------------------------------------------------------------------
| REJECTION MESSAGE
|--------------------------------------------------------------------------
*/

export function buildBookingRejectMessage(booking, reason = "") {
  const name = bookingCustomerName(booking);

  const service = bookingServiceNames(booking);

  const date = bookingDateLabel(booking);

  const time = bookingTimeLabel(booking);

  const guests = bookingGuestLabel(booking);

  const cleanReason = String(reason || "").trim();

  const lines = [
    `Hello ${name},`,
    "",
    "Thank you for your booking request with Explore Koh Rong.",
    "",
    "Unfortunately, we are unable to confirm your booking at this time.",
    "",
    "Booking Details",
    "",
    `• Service: ${service}`,
    `• Date: ${date}`,
    `• Time: ${time}`,
    `• Guests: ${guests}`,
  ];

  if (cleanReason) {
    lines.push("", "Reason", "", cleanReason);
  }

  lines.push(
    "",
    "If you would like help choosing another date or service, please contact us.",
    "",
    "Thank you,",
    "Explore Koh Rong",
  );

  return lines.join("\n");
}

/*
|--------------------------------------------------------------------------
| WHATSAPP REJECTION URL
|--------------------------------------------------------------------------
*/

export function buildBookingRejectWhatsAppUrl(booking, reason = "") {
  const phone = normalizeCustomerWhatsAppNumber(bookingCustomerPhone(booking));

  if (!phone) {
    return "";
  }

  const message = buildBookingRejectMessage(booking, reason);

  return `https://wa.me/${phone}` + `?text=${encodeURIComponent(message)}`;
}

/*
|--------------------------------------------------------------------------
| EMAIL SUBJECT
|--------------------------------------------------------------------------
*/

export function buildBookingRejectEmailSubject(booking) {
  const service = bookingServiceNames(booking);

  return `Explore Koh Rong Booking Update - ${service}`;
}

/*
|--------------------------------------------------------------------------
| EMAIL REJECTION URL
|--------------------------------------------------------------------------
*/

export function buildBookingRejectEmailUrl(booking, reason = "") {
  const email = bookingCustomerEmail(booking);

  if (!email) {
    return "";
  }

  const subject = buildBookingRejectEmailSubject(booking);

  const body = buildBookingRejectMessage(booking, reason);

  return (
    "https://mail.google.com/mail/?view=cm" +
    "&fs=1" +
    `&to=${encodeURIComponent(email)}` +
    `&su=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`
  );
}
