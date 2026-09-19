import mongoose from "mongoose";

import ServiceBooking from "../models/ServiceBooking.js";
import Service from "../models/Service.js";
import Category from "../models/Category.js";
import User from "../models/User.js";

/*
|--------------------------------------------------------------------------
| LOCAL ASYNC HANDLER
|--------------------------------------------------------------------------
|
| We use a local name so we don't depend on the export style
| of your existing asyncHandler utility.
|
*/

function handleAsync(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function numberValue(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

/*
|--------------------------------------------------------------------------
| BOOKING STATUS GROUP
|--------------------------------------------------------------------------
*/

function bookingStatusGroup(status) {
  const value = normalizeStatus(status);

  if (["ACCEPT", "ACCEPTED", "CONFIRMED"].includes(value)) {
    return "confirmed";
  }

  if (["REJECT", "REJECTED"].includes(value)) {
    return "rejected";
  }

  if (["CANCELLED", "CANCELED"].includes(value)) {
    return "cancelled";
  }

  if (value === "COMPLETED") {
    return "completed";
  }

  return "pending";
}

/*
|--------------------------------------------------------------------------
| DATE FILTER
|--------------------------------------------------------------------------
*/

function buildDateFilter(query) {
  const filter = {};

  const start = String(query.start_date || query.startDate || "").trim();

  const end = String(query.end_date || query.endDate || "").trim();

  if (!start && !end) {
    return filter;
  }

  filter.created_at = {};

  if (start) {
    const date = new Date(`${start}T00:00:00.000Z`);

    if (!Number.isNaN(date.getTime())) {
      filter.created_at.$gte = date;
    }
  }

  if (end) {
    const date = new Date(`${end}T23:59:59.999Z`);

    if (!Number.isNaN(date.getTime())) {
      filter.created_at.$lte = date;
    }
  }

  if (!Object.keys(filter.created_at).length) {
    delete filter.created_at;
  }

  return filter;
}

/*
|--------------------------------------------------------------------------
| SAFE REVIEW COLLECTION
|--------------------------------------------------------------------------
|
| This avoids crashing if you haven't created/imported Review.js yet.
|
*/

async function getReviewsCollection() {
  const db = mongoose.connection.db;

  if (!db) {
    return null;
  }

  const existing = await db
    .listCollections(
      {
        name: "reviews",
      },
      {
        nameOnly: true,
      },
    )
    .toArray();

  if (!existing.length) {
    return null;
  }

  return db.collection("reviews");
}

/*
|--------------------------------------------------------------------------
| REPORT SUMMARY
|--------------------------------------------------------------------------
|
| GET /api/reports/summary
|
*/

export const getReportSummary = handleAsync(async (req, res) => {
  const [
    bookings,
    totalServices,
    activeServices,
    totalCustomers,
    activeCustomers,
    totalCategories,
    activeCategories,
  ] = await Promise.all([
    ServiceBooking.find({}).select("status total_price created_at").lean(),

    Service.countDocuments(),

    Service.countDocuments({
      status: "ACTIVE",
    }),

    User.countDocuments({
      role: "CUSTOMER",
    }),

    User.countDocuments({
      role: "CUSTOMER",

      status: "ACTIVE",
    }),

    Category.countDocuments(),

    Category.countDocuments({
      status: "ACTIVE",
    }),
  ]);

  /*
      |--------------------------------------------------------------------------
      | BOOKING SUMMARY
      |--------------------------------------------------------------------------
      */

  const bookingSummary = {
    total: bookings.length,

    pending: 0,

    confirmed: 0,

    rejected: 0,

    cancelled: 0,

    completed: 0,
  };

  let totalBookingValue = 0;

  let confirmedValue = 0;

  for (const booking of bookings) {
    const group = bookingStatusGroup(booking.status);

    bookingSummary[group] += 1;

    const amount = numberValue(booking.total_price);

    totalBookingValue += amount;

    if (group === "confirmed" || group === "completed") {
      confirmedValue += amount;
    }
  }

  /*
      |--------------------------------------------------------------------------
      | REVIEWS
      |--------------------------------------------------------------------------
      */

  const reviewCollection = await getReviewsCollection();

  let totalReviews = 0;

  if (reviewCollection) {
    totalReviews = await reviewCollection.countDocuments({
      status: {
        $ne: "INACTIVE",
      },
    });
  }

  /*
      |--------------------------------------------------------------------------
      | RESPONSE
      |--------------------------------------------------------------------------
      */

  return res.json({
    success: true,

    summary: {
      bookings: bookingSummary,

      services: {
        total: totalServices,

        active: activeServices,
      },

      customers: {
        total: totalCustomers,

        active: activeCustomers,
      },

      categories: {
        total: totalCategories,

        active: activeCategories,
      },

      reviews: {
        total: totalReviews,
      },

      total_booking_value: totalBookingValue,

      confirmed_booking_value: confirmedValue,
    },

    /*
     * Extra flat values make this easier to use
     * from different dashboard implementations.
     */

    totalBookings: bookingSummary.total,

    pendingBookings: bookingSummary.pending,

    confirmedBookings: bookingSummary.confirmed,

    rejectedBookings: bookingSummary.rejected,

    completedBookings: bookingSummary.completed,

    totalServices,

    activeServices,

    totalCustomers,

    activeCustomers,

    totalCategories,

    activeCategories,

    totalReviews,

    totalBookingValue,

    confirmedBookingValue: confirmedValue,
  });
});

/*
|--------------------------------------------------------------------------
| BOOKING REPORT
|--------------------------------------------------------------------------
|
| GET /api/reports/bookings
|
*/

export const getBookingReport = handleAsync(async (req, res) => {
  const filter = {
    ...buildDateFilter(req.query),
  };

  /*
      |--------------------------------------------------------------------------
      | STATUS
      |--------------------------------------------------------------------------
      */

  if (req.query.status) {
    filter.status = normalizeStatus(req.query.status);
  }

  /*
      |--------------------------------------------------------------------------
      | LOAD
      |--------------------------------------------------------------------------
      */

  const bookings = await ServiceBooking.find(filter)
    .populate("customer_id", "firstName lastName username email phone")
    .populate({
      path: "products_id",

      select: "name price thumbnail images cate_id",

      populate: {
        path: "cate_id",

        select: "name",
      },
    })
    .sort({
      created_at: -1,
    })
    .lean();

  const summary = {
    total: bookings.length,

    pending: 0,

    confirmed: 0,

    rejected: 0,

    cancelled: 0,

    completed: 0,

    total_amount: 0,
  };

  for (const booking of bookings) {
    const group = bookingStatusGroup(booking.status);

    summary[group] += 1;

    summary.total_amount += numberValue(booking.total_price);
  }

  return res.json({
    success: true,

    bookings,

    data: bookings,

    summary,

    total: bookings.length,
  });
});

/*
|--------------------------------------------------------------------------
| SERVICE REPORT
|--------------------------------------------------------------------------
|
| GET /api/reports/services
|
*/

export const getServiceReport = handleAsync(async (req, res) => {
  const filter = {};

  if (req.query.status) {
    filter.status = normalizeStatus(req.query.status);
  }

  const services = await Service.find(filter)
    .populate("cate_id", "name slug status")
    .sort({
      created_at: -1,
    })
    .lean();

  const active = services.filter(
    (item) => normalizeStatus(item.status) === "ACTIVE",
  ).length;

  const inactive = services.filter(
    (item) => normalizeStatus(item.status) === "INACTIVE",
  ).length;

  return res.json({
    success: true,

    services,

    data: services,

    summary: {
      total: services.length,

      active,

      inactive,
    },

    total: services.length,
  });
});

/*
|--------------------------------------------------------------------------
| CUSTOMER REPORT
|--------------------------------------------------------------------------
|
| GET /api/reports/customers
|
*/

export const getCustomerReport = handleAsync(async (req, res) => {
  const filter = {
    role: "CUSTOMER",
  };

  if (req.query.status) {
    filter.status = normalizeStatus(req.query.status);
  }

  const customers = await User.find(filter)
    .select(
      "firstName lastName username email phone status created_at updated_at avatar",
    )
    .sort({
      created_at: -1,
    })
    .lean();

  const active = customers.filter(
    (item) => normalizeStatus(item.status) === "ACTIVE",
  ).length;

  const inactive = customers.length - active;

  return res.json({
    success: true,

    customers,

    data: customers,

    summary: {
      total: customers.length,

      active,

      inactive,
    },

    total: customers.length,
  });
});

/*
|--------------------------------------------------------------------------
| CATEGORY REPORT
|--------------------------------------------------------------------------
|
| GET /api/reports/categories
|
*/

export const getCategoryReport = handleAsync(async (req, res) => {
  const categories = await Category.find({})
    .sort({
      created_at: -1,
    })
    .lean();

  /*
   * Count services belonging to each category.
   */

  const serviceCounts = await Service.aggregate([
    {
      $group: {
        _id: "$cate_id",

        count: {
          $sum: 1,
        },
      },
    },
  ]);

  const countMap = new Map(
    serviceCounts.map((item) => [String(item._id || ""), item.count]),
  );

  const result = categories.map((category) => ({
    ...category,

    service_count: countMap.get(String(category._id)) || 0,
  }));

  const active = result.filter(
    (item) => normalizeStatus(item.status) === "ACTIVE",
  ).length;

  return res.json({
    success: true,

    categories: result,

    data: result,

    summary: {
      total: result.length,

      active,

      inactive: result.length - active,
    },

    total: result.length,
  });
});

/*
|--------------------------------------------------------------------------
| REVIEW REPORT
|--------------------------------------------------------------------------
|
| GET /api/reports/reviews
|
*/

export const getReviewReport = handleAsync(async (req, res) => {
  const collection = await getReviewsCollection();

  /*
   * No reviews collection yet.
   * Return a valid empty response instead of 404/500.
   */

  if (!collection) {
    return res.json({
      success: true,

      reviews: [],

      data: [],

      summary: {
        total: 0,

        average_rating: 0,
      },

      total: 0,
    });
  }

  const reviews = await collection
    .find({
      status: {
        $ne: "INACTIVE",
      },
    })
    .sort({
      created_at: -1,
    })
    .toArray();

  let totalRating = 0;

  let ratingCount = 0;

  for (const review of reviews) {
    const rating = Number(review.rate);

    if (Number.isFinite(rating)) {
      totalRating += rating;

      ratingCount += 1;
    }
  }

  const averageRating = ratingCount
    ? Number((totalRating / ratingCount).toFixed(2))
    : 0;

  return res.json({
    success: true,

    reviews,

    data: reviews,

    summary: {
      total: reviews.length,

      average_rating: averageRating,
    },

    total: reviews.length,
  });
});
