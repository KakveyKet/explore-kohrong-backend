import mongoose from "mongoose";

import Service from "../models/Service.js";
import ServiceReview from "../models/ServiceReview.js";

import { asyncHandler } from "../utils/asyncHandler.js";

import { httpError } from "../utils/httpError.js";

/*
|--------------------------------------------------------------------------
| VALID OBJECT ID
|--------------------------------------------------------------------------
*/

function validateObjectId(value, fieldName = "ID") {
  const id = String(value || "").trim();

  if (
    !id ||
    id === "undefined" ||
    id === "null" ||
    !mongoose.isValidObjectId(id)
  ) {
    throw httpError(400, `Invalid ${fieldName}.`);
  }

  return id;
}

/*
|--------------------------------------------------------------------------
| AUTH USER ID
|--------------------------------------------------------------------------
*/

function getAuthenticatedUserId(req) {
  const candidates = [
    req.user?._id,
    req.user?.id,
    req.user?.userId,
    req.user?.user_id,
    req.user?.sub,
    req.user?.user?._id,
    req.user?.user?.id,
  ];

  const value = candidates.find(
    (item) => item !== undefined && item !== null && String(item).trim(),
  );

  const id = String(value || "").trim();

  if (!id || !mongoose.isValidObjectId(id)) {
    throw httpError(401, "Authentication required.");
  }

  return id;
}

/*
|--------------------------------------------------------------------------
| GET SERVICE REVIEWS
|--------------------------------------------------------------------------
|
| GET /api/services/:serviceId/reviews
|
| Public
|
*/

export const listServiceReviews = asyncHandler(async (req, res) => {
  const serviceId = validateObjectId(req.params.serviceId, "service ID");

  /*
      |--------------------------------------------------------------------------
      | CHECK SERVICE
      |--------------------------------------------------------------------------
      */

  const serviceExists = await Service.exists({
    _id: serviceId,
  });

  if (!serviceExists) {
    throw httpError(404, "Service not found.");
  }

  /*
      |--------------------------------------------------------------------------
      | LOAD REVIEWS
      |--------------------------------------------------------------------------
      */

  const reviews = await ServiceReview.find({
    service_id: serviceId,
    status: "ACTIVE",
  })
    .populate("customer_id", "firstName lastName username avatar")
    .sort({
      created_at: -1,
    })
    .lean();

  /*
      |--------------------------------------------------------------------------
      | RATING BREAKDOWN
      |--------------------------------------------------------------------------
      */

  const ratings = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  let totalRating = 0;

  for (const review of reviews) {
    const rating = Number(review.rating || 0);

    if (rating >= 1 && rating <= 5) {
      ratings[rating] += 1;

      totalRating += rating;
    }
  }

  /*
      |--------------------------------------------------------------------------
      | AVERAGE
      |--------------------------------------------------------------------------
      */

  const averageRating = reviews.length ? totalRating / reviews.length : 0;

  /*
      |--------------------------------------------------------------------------
      | RESPONSE
      |--------------------------------------------------------------------------
      */

  return res.json({
    reviews,

    summary: {
      total_reviews: reviews.length,

      average_rating: Number(averageRating.toFixed(1)),

      ratings,
    },
  });
});

/*
|--------------------------------------------------------------------------
| REVIEW ELIGIBILITY
|--------------------------------------------------------------------------
|
| GET /api/services/:serviceId/reviews/eligibility
|
| Any authenticated customer can review.
| Booking is NOT required.
|
*/

export const getReviewEligibility = asyncHandler(async (req, res) => {
  const serviceId = validateObjectId(req.params.serviceId, "service ID");

  const customerId = getAuthenticatedUserId(req);

  /*
      |--------------------------------------------------------------------------
      | SERVICE
      |--------------------------------------------------------------------------
      */

  const serviceExists = await Service.exists({
    _id: serviceId,
  });

  if (!serviceExists) {
    throw httpError(404, "Service not found.");
  }

  /*
      |--------------------------------------------------------------------------
      | CHECK EXISTING REVIEW
      |--------------------------------------------------------------------------
      */

  const existingReview = await ServiceReview.findOne({
    service_id: serviceId,

    customer_id: customerId,

    status: "ACTIVE",
  }).lean();

  if (existingReview) {
    return res.json({
      eligible: false,

      reviewed: true,

      reason: "You have already reviewed this service.",

      review: existingReview,
    });
  }

  /*
      |--------------------------------------------------------------------------
      | FREE TO REVIEW
      |--------------------------------------------------------------------------
      */

  return res.json({
    eligible: true,

    reviewed: false,

    reason: "",
  });
});

/*
|--------------------------------------------------------------------------
| CREATE REVIEW
|--------------------------------------------------------------------------
|
| POST /api/services/:serviceId/reviews
|
| No booking required.
|
*/

export const createServiceReview = asyncHandler(async (req, res) => {
  const serviceId = validateObjectId(req.params.serviceId, "service ID");

  const customerId = getAuthenticatedUserId(req);

  /*
      |--------------------------------------------------------------------------
      | INPUT
      |--------------------------------------------------------------------------
      */

  const rating = Number(req.body?.rating);

  const comment = String(req.body?.comment || "").trim();

  /*
      |--------------------------------------------------------------------------
      | RATING VALIDATION
      |--------------------------------------------------------------------------
      */

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw httpError(400, "Rating must be between 1 and 5.");
  }

  /*
      |--------------------------------------------------------------------------
      | COMMENT VALIDATION
      |--------------------------------------------------------------------------
      */

  if (comment.length > 1000) {
    throw httpError(400, "Review must be 1000 characters or fewer.");
  }

  /*
      |--------------------------------------------------------------------------
      | CHECK SERVICE
      |--------------------------------------------------------------------------
      */

  const serviceExists = await Service.exists({
    _id: serviceId,
  });

  if (!serviceExists) {
    throw httpError(404, "Service not found.");
  }

  /*
      |--------------------------------------------------------------------------
      | DUPLICATE REVIEW
      |--------------------------------------------------------------------------
      */

  const existingReview = await ServiceReview.findOne({
    service_id: serviceId,

    customer_id: customerId,
  });

  if (existingReview) {
    throw httpError(400, "You have already reviewed this service.");
  }

  /*
      |--------------------------------------------------------------------------
      | CREATE
      |--------------------------------------------------------------------------
      */

  const created = await ServiceReview.create({
    service_id: serviceId,

    customer_id: customerId,

    rating,

    comment,

    status: "ACTIVE",
  });

  /*
      |--------------------------------------------------------------------------
      | POPULATE CUSTOMER
      |--------------------------------------------------------------------------
      */

  const review = await ServiceReview.findById(created._id)
    .populate("customer_id", "firstName lastName username avatar")
    .lean();

  /*
      |--------------------------------------------------------------------------
      | RESPONSE
      |--------------------------------------------------------------------------
      */

  return res.status(201).json({
    message: "Thank you for your review.",

    review,
  });
});
