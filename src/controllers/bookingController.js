import mongoose from "mongoose";
import ServiceBooking from "../models/ServiceBooking.js";
import Service from "../models/Service.js";
import { nextBookingNumber } from "../services/bookingNumberService.js";
import { sendBookingEmails } from "../services/emailService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { httpError } from "../utils/httpError.js";

function currentUserId(req) {
  return req.user?._id || req.user?.id || req.auth?.userId || null;
}

function currentRole(req) {
  const role = req.role || req.user?.role || req.user?.roleId || req.auth?.role || "";
  return String(typeof role === "object" ? role?.name || role?.role || "" : role).toUpperCase();
}

function isAdmin(req) {
  return ["ADMIN", "SUPER_ADMIN"].includes(currentRole(req));
}

function isValidId(value) {
  return mongoose.isValidObjectId(String(value || ""));
}

function normalizeProductIds(body = {}) {
  const ids = Array.isArray(body.products_id) ? [...body.products_id] : [];
  if (body.service_id) ids.push(body.service_id);
  return [...new Set(ids.map((item) => String(item || "").trim()).filter(Boolean))];
}

function normalizePayment(value) {
  const payment = String(value || "CASH").toUpperCase();
  return ["BANK", "BANK_TRANSFER"].includes(payment)
    ? { paid_type: "BANK", payment_method: "BANK_TRANSFER" }
    : { paid_type: "CASH", payment_method: "PAY_AT_CHECK_IN" };
}

function normalizeDescription(body, services) {
  const source =
    body.description && typeof body.description === "object" && !Array.isArray(body.description)
      ? body.description
      : {};
  const primaryService = services[0];
  return {
    booking_date: source.booking_date || body.booking_date || "",
    booking_time: source.booking_time || body.booking_time || "",
    people: Number(source.people ?? body.people ?? 1),
    note: String(source.note ?? body.note ?? "").trim(),
    booking_channel: ["EMAIL", "WHATSAPP"].includes(
      String(source.booking_channel || body.booking_channel || "EMAIL").toUpperCase(),
    )
      ? String(source.booking_channel || body.booking_channel || "EMAIL").toUpperCase()
      : "EMAIL",
    service_id: String(primaryService?._id || ""),
    service_name: services.map((s) => s.name).filter(Boolean).join(", "),
    service_price: Number(primaryService?.price || 0),
  };
}

async function populateBooking(booking) {
  if (!booking) return booking;
  await booking.populate([
    { path: "products_id" },
    { path: "customer_id", select: "username email phone firstName lastName displayName" },
  ]);
  return booking;
}

function emitBooking(req, eventName, booking) {
  try {
    req.app.get("io")?.to("admins").emit(eventName, booking);
  } catch (error) {
    console.error("[BOOKING SOCKET ERROR]", error);
  }
}

function assignEmailResult(booking, emailResult) {
  const description =
    booking.description && typeof booking.description === "object" && !Array.isArray(booking.description)
      ? booking.description
      : {};

  booking.description = {
    ...description,
    notification: { ...(description.notification || {}), email: emailResult },
  };
  // Description is a Mongoose Mixed path.
  booking.markModified("description");
}

/**
 * POST /api/bookings
 * Save the booking first, send emails second. Failure to email does not
 * cancel the reservation or re-use the allocated AD number.
 */
export const createBooking = asyncHandler(async (req, res) => {
  const userId = currentUserId(req);
  if (!userId) throw httpError(401, "Authentication required.");

  const productIds = normalizeProductIds(req.body);
  if (!productIds.length) throw httpError(400, "Please select a service.");
  if (productIds.some((id) => !isValidId(id))) {
    throw httpError(400, "Invalid service ID.");
  }

  const services = await Service.find({ _id: { $in: productIds }, status: "ACTIVE" });
  if (services.length !== productIds.length) {
    throw httpError(400, "One or more selected services are unavailable.");
  }

  const description = normalizeDescription(req.body, services);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(description.booking_date)) {
    throw httpError(400, "Please select a valid booking date.");
  }
  if (!/^\d{2}:\d{2}$/.test(description.booking_time)) {
    throw httpError(400, "Please select a valid booking time.");
  }
  if (!Number.isInteger(description.people) || description.people < 1) {
    throw httpError(400, "Guests must be a positive whole number.");
  }

  // Price is calculated from the database, not trusted from the browser.
  const totalPrice = services.reduce((sum, s) => sum + Number(s.price || 0), 0);
  const payment = normalizePayment(req.body.payment_method || req.body.paid_type);

  const bookingNumber = await nextBookingNumber();
  const booking = await ServiceBooking.create({
    booking_number: bookingNumber,
    products_id: productIds,
    customer_id: userId,
    total_price: totalPrice,
    description,
    status: "PENDING",
    ...payment,
    created_at: new Date(),
    updated_at: new Date(),
    created_by: userId,
    updated_by: userId,
  });

  let fullBooking = booking;
  try {
    fullBooking = await populateBooking(booking);
  } catch (error) {
    // Booking already exists; keep the success response even if population fails.
    console.error("[BOOKING POPULATE ERROR]", error);
  }

  emitBooking(req, "booking:new", fullBooking);
  console.log("✅ BOOKING CREATED:", bookingNumber);

  let emailResult;
  try {
    emailResult = await sendBookingEmails(fullBooking);
  } catch (error) {
    console.error("[BOOKING EMAIL ERROR]", error);
    emailResult = {
      business: { status: "FAILED", error: error.message || "Email send failed." },
      customer: { status: "FAILED", error: error.message || "Email send failed." },
    };
  }

  try {
    assignEmailResult(fullBooking, emailResult);
    await fullBooking.save();
  } catch (error) {
    console.error("[BOOKING EMAIL STATUS SAVE ERROR]", error);
  }

  return res.status(201).json({
    message: "Booking submitted successfully.",
    booking: fullBooking,
    notification: { email: emailResult },
  });
});

export const getMyBookings = asyncHandler(async (req, res) => {
  const userId = currentUserId(req);
  if (!userId) throw httpError(401, "Authentication required.");
  const bookings = await ServiceBooking.find({ customer_id: userId })
    .populate("products_id")
    .populate("customer_id", "username email phone firstName lastName displayName")
    .sort({ created_at: -1 });
  return res.json({ bookings });
});

export const getBookings = asyncHandler(async (req, res) => {
  if (!isAdmin(req)) throw httpError(403, "Access denied.");
  const bookings = await ServiceBooking.find()
    .populate("products_id")
    .populate("customer_id", "username email phone firstName lastName displayName")
    .sort({ created_at: -1 });
  return res.json({ bookings });
});

export const getBooking = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) throw httpError(400, "Invalid booking ID.");
  const booking = await ServiceBooking.findById(req.params.id)
    .populate("products_id")
    .populate("customer_id", "username email phone firstName lastName displayName");
  if (!booking) throw httpError(404, "Booking not found.");
  if (
    !isAdmin(req) &&
    String(booking.customer_id?._id || booking.customer_id) !== String(currentUserId(req))
  ) {
    throw httpError(403, "Access denied.");
  }
  return res.json({ booking });
});

export const acceptBooking = asyncHandler(async (req, res) => {
  if (!isAdmin(req)) throw httpError(403, "Access denied.");
  const booking = await ServiceBooking.findById(req.params.id);
  if (!booking) throw httpError(404, "Booking not found.");
  booking.status = "ACCEPT";
  booking.updated_by = currentUserId(req);
  await booking.save();
  await populateBooking(booking);
  emitBooking(req, "booking:updated", booking);
  return res.json({ message: "Booking accepted.", booking });
});

export const rejectBooking = asyncHandler(async (req, res) => {
  if (!isAdmin(req)) throw httpError(403, "Access denied.");
  const booking = await ServiceBooking.findById(req.params.id);
  if (!booking) throw httpError(404, "Booking not found.");
  booking.status = "REJECT";
  booking.updated_by = currentUserId(req);
  const description =
    booking.description && typeof booking.description === "object" ? booking.description : {};
  booking.description = {
    ...description,
    reject_reason: String(req.body?.reason || req.body?.message || "").trim(),
  };
  booking.markModified("description");
  await booking.save();
  await populateBooking(booking);
  emitBooking(req, "booking:updated", booking);
  return res.json({ message: "Booking rejected.", booking });
});

export const resendBookingEmail = asyncHandler(async (req, res) => {
  if (!isAdmin(req)) throw httpError(403, "Access denied.");
  const booking = await ServiceBooking.findById(req.params.id);
  if (!booking) throw httpError(404, "Booking not found.");
  await populateBooking(booking);
  const emailResult = await sendBookingEmails(booking);
  assignEmailResult(booking, emailResult);
  await booking.save();
  return res.json({
    message: "Booking email processed.",
    booking_number: booking.booking_number,
    notification: { email: emailResult },
  });
});
