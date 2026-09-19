import express from "express";

import {
  getBookings,
  getMyBookings,
  getBookingById,
  createBooking,
  updateBooking,
  acceptBooking,
  rejectBooking,
  deleteBooking,
} from "../controllers/bookingController.js";

import { authenticate, allowRoles } from "../middleware/auth.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| CUSTOMER
|--------------------------------------------------------------------------
*/

router.get("/mine", authenticate, getMyBookings);

router.post("/", authenticate, createBooking);

/*
|--------------------------------------------------------------------------
| ADMIN
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  authenticate,
  allowRoles("ADMIN", "SUPER_ADMIN", "STAFF"),
  getBookings,
);

router.get("/:id", authenticate, getBookingById);

router.patch(
  "/:id",
  authenticate,
  allowRoles("ADMIN", "SUPER_ADMIN", "STAFF"),
  updateBooking,
);

router.patch(
  "/:id/accept",
  authenticate,
  allowRoles("ADMIN", "SUPER_ADMIN", "STAFF"),
  acceptBooking,
);

router.patch(
  "/:id/reject",
  authenticate,
  allowRoles("ADMIN", "SUPER_ADMIN", "STAFF"),
  rejectBooking,
);

router.delete(
  "/:id",
  authenticate,
  allowRoles("ADMIN", "SUPER_ADMIN"),
  deleteBooking,
);

export default router;
