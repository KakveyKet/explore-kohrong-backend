import express from "express";

import {
  acceptBooking,
  createBooking,
  getBooking,
  getBookings,
  getMyBookings,
  rejectBooking,
  resendBookingEmail,
} from "../controllers/bookingController.js";

import { authenticate, allowRoles } from "../middleware/auth.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| CREATE BOOKING
|--------------------------------------------------------------------------
*/

router.post("/", authenticate, createBooking);

/*
|--------------------------------------------------------------------------
| MY BOOKINGS
|--------------------------------------------------------------------------
*/

router.get("/mine", authenticate, getMyBookings);

/*
|--------------------------------------------------------------------------
| ADMIN BOOKINGS
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  authenticate,
  allowRoles("SUPER_ADMIN", "ADMIN", "STAFF"),
  getBookings,
);

/*
|--------------------------------------------------------------------------
| RESEND EMAIL
|--------------------------------------------------------------------------
*/

router.post(
  "/:id/resend-email",
  authenticate,
  allowRoles("SUPER_ADMIN", "ADMIN", "STAFF"),
  resendBookingEmail,
);

/*
|--------------------------------------------------------------------------
| ACCEPT
|--------------------------------------------------------------------------
*/

router.patch(
  "/:id/accept",
  authenticate,
  allowRoles("SUPER_ADMIN", "ADMIN", "STAFF"),
  acceptBooking,
);

/*
|--------------------------------------------------------------------------
| REJECT
|--------------------------------------------------------------------------
*/

router.patch(
  "/:id/reject",
  authenticate,
  allowRoles("SUPER_ADMIN", "ADMIN", "STAFF"),
  rejectBooking,
);

/*
|--------------------------------------------------------------------------
| DETAIL
|--------------------------------------------------------------------------
*/

router.get("/:id", authenticate, getBooking);

export default router;
