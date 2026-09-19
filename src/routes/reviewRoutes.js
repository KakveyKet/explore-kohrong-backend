import express from "express";

import {
  listReviews,
  getReview,
  createReview,
  deleteReview,
} from "../controllers/reviewController.js";

import { authenticate, allowRoles } from "../middleware/auth.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| PUBLIC
|--------------------------------------------------------------------------
|
| Anyone can read reviews.
|
*/

router.get("/", listReviews);

router.get("/:id", getReview);

/*
|--------------------------------------------------------------------------
| CUSTOMER
|--------------------------------------------------------------------------
|
| Customer submits review.
| It appears publicly immediately.
|
*/

router.post("/", authenticate, allowRoles("CUSTOMER"), createReview);

/*
|--------------------------------------------------------------------------
| ADMIN DELETE
|--------------------------------------------------------------------------
|
| STAFF cannot delete reviews.
|
*/

router.delete(
  "/:id",
  authenticate,
  allowRoles("SUPER_ADMIN", "ADMIN"),
  deleteReview,
);

export default router;
