import mongoose from "mongoose";

import Review from "../models/Review.js";

import Service from "../models/Service.js";

import { asyncHandler } from "../utils/asyncHandler.js";

import { httpError } from "../utils/httpError.js";

/*
|--------------------------------------------------------------------------
| GET REVIEWS
|--------------------------------------------------------------------------
|
| Public:
|
| GET /api/reviews
|
| Service:
|
| GET /api/reviews?product_id=SERVICE_ID
|
| No approval filtering anymore.
|
*/

export const listReviews = asyncHandler(async (req, res) => {
  const filter = {};

  /*
      |--------------------------------------------------------------------------
      | SERVICE FILTER
      |--------------------------------------------------------------------------
      */

  if (req.query.product_id) {
    const productId = String(req.query.product_id);

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw httpError(400, "Invalid service ID");
    }

    filter.product_id = productId;
  }

  /*
      |--------------------------------------------------------------------------
      | LOAD REVIEWS
      |--------------------------------------------------------------------------
      */

  const reviews = await Review.find(filter)

    .populate("user_review_id", "username email")

    .populate("product_id", "name thumbnail price")

    .populate("review_comment.user_id", "username email")

    .sort({
      created_at: -1,
    });

  return res.json({
    success: true,

    count: reviews.length,

    reviews,
  });
});

/*
|--------------------------------------------------------------------------
| GET ONE REVIEW
|--------------------------------------------------------------------------
*/

export const getReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id)

    .populate("user_review_id", "username email")

    .populate("product_id", "name thumbnail price")

    .populate("review_comment.user_id", "username email");

  if (!review) {
    throw httpError(404, "Review not found");
  }

  return res.json({
    success: true,

    review,
  });
});

/*
|--------------------------------------------------------------------------
| CREATE REVIEW
|--------------------------------------------------------------------------
|
| CUSTOMER ONLY
|
| Review becomes public immediately.
|
*/

export const createReview = asyncHandler(async (req, res) => {
  const { product_id, rate, text } = req.body;

  /*
      |--------------------------------------------------------------------------
      | CUSTOMER ONLY
      |--------------------------------------------------------------------------
      */

  if (req.user.role !== "CUSTOMER") {
    throw httpError(403, "Only customers can submit reviews");
  }

  /*
      |--------------------------------------------------------------------------
      | SERVICE ID
      |--------------------------------------------------------------------------
      */

  if (!product_id) {
    throw httpError(400, "Service is required");
  }

  if (!mongoose.Types.ObjectId.isValid(product_id)) {
    throw httpError(400, "Invalid service ID");
  }

  /*
      |--------------------------------------------------------------------------
      | SERVICE EXISTS
      |--------------------------------------------------------------------------
      */

  const service = await Service.findById(product_id);

  if (!service) {
    throw httpError(404, "Service not found");
  }

  /*
      |--------------------------------------------------------------------------
      | RATING
      |--------------------------------------------------------------------------
      */

  const numericRate = Number(rate);

  if (!Number.isInteger(numericRate) || numericRate < 1 || numericRate > 5) {
    throw httpError(400, "Rating must be between 1 and 5");
  }

  /*
      |--------------------------------------------------------------------------
      | COMMENT
      |--------------------------------------------------------------------------
      */

  const cleanText = String(text || "").trim();

  if (!cleanText) {
    throw httpError(400, "Review comment is required");
  }

  if (cleanText.length > 1500) {
    throw httpError(400, "Review cannot exceed 1500 characters");
  }

  /*
      |--------------------------------------------------------------------------
      | DUPLICATE REVIEW
      |--------------------------------------------------------------------------
      |
      | One customer can review
      | one service only once.
      |
      */

  const existing = await Review.findOne({
    user_review_id: req.user._id,

    product_id: service._id,
  });

  if (existing) {
    throw httpError(409, "You have already reviewed this service");
  }

  /*
      |--------------------------------------------------------------------------
      | CREATE
      |--------------------------------------------------------------------------
      |
      | No status.
      | No approval.
      |
      */

  const review = await Review.create({
    user_review_id: req.user._id,

    product_id: service._id,

    rate: numericRate,

    review_comment: [
      {
        user_id: req.user._id,

        text: cleanText,
      },
    ],

    created_by: req.user._id,

    updated_by: req.user._id,
  });

  /*
      |--------------------------------------------------------------------------
      | POPULATE
      |--------------------------------------------------------------------------
      */

  const result = await Review.findById(review._id)

    .populate("user_review_id", "username email")

    .populate("product_id", "name thumbnail price")

    .populate("review_comment.user_id", "username email");

  /*
      |--------------------------------------------------------------------------
      | RETURN
      |--------------------------------------------------------------------------
      */

  return res.status(201).json({
    success: true,

    message: "Review submitted successfully",

    review: result,
  });
});

/*
|--------------------------------------------------------------------------
| DELETE REVIEW
|--------------------------------------------------------------------------
|
| SUPER_ADMIN / ADMIN only
|
*/

export const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    throw httpError(404, "Review not found");
  }

  await review.deleteOne();

  return res.json({
    success: true,

    message: "Review deleted successfully",
  });
});
