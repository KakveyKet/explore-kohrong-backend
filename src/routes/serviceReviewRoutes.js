import express from "express";

import {
  createServiceReview,
  getReviewEligibility,
  listServiceReviews,
} from "../controllers/serviceReviewController.js";

import { authenticate } from "../middleware/auth.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| PUBLIC REVIEWS
|--------------------------------------------------------------------------
*/

router.get("/:serviceId/reviews", listServiceReviews);

/*
|--------------------------------------------------------------------------
| ELIGIBILITY
|--------------------------------------------------------------------------
*/

router.get(
  "/:serviceId/reviews/eligibility",
  authenticate,
  getReviewEligibility,
);

/*
|--------------------------------------------------------------------------
| CREATE REVIEW
|--------------------------------------------------------------------------
*/

router.post("/:serviceId/reviews", authenticate, createServiceReview);

export default router;
