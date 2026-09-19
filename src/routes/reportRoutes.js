import express from "express";

import {
  getReportSummary,
  getBookingReport,
  getServiceReport,
  getCustomerReport,
  getCategoryReport,
  getReviewReport,
} from "../controllers/reportController.js";

import { authenticate } from "../middleware/auth.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| TEST
|--------------------------------------------------------------------------
|
| GET /api/reports/ping
|
*/

router.get("/ping", (req, res) => {
  res.json({
    success: true,
    message: "Report routes are working.",
  });
});

/*
|--------------------------------------------------------------------------
| REPORTS
|--------------------------------------------------------------------------
*/

router.get("/summary", authenticate, getReportSummary);

router.get("/bookings", authenticate, getBookingReport);

router.get("/services", authenticate, getServiceReport);

router.get("/customers", authenticate, getCustomerReport);

router.get("/categories", authenticate, getCategoryReport);

router.get("/reviews", authenticate, getReviewReport);

export default router;
