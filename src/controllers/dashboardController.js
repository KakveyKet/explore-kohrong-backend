import User from "../models/User.js";
import Category from "../models/Category.js";
import Service from "../models/Service.js";
import ServiceBooking from "../models/ServiceBooking.js";
import Review from "../models/Review.js";
import Blog from "../models/Blog.js";

import { asyncHandler } from "../utils/asyncHandler.js";

/*
|--------------------------------------------------------------------------
| ADMIN DASHBOARD
|--------------------------------------------------------------------------
|
| Dashboard summary:
|
| Customers
| Categories
| Services
| Total Bookings
| Reviews
| Comments
|
| No revenue.
| No pending card.
| No accepted card.
|
*/

export const getDashboard = asyncHandler(async (req, res) => {
  const [
    customers,
    categories,
    services,
    totalBookings,
    reviews,
    commentsResult,
  ] = await Promise.all([
    /*
          |--------------------------------------------------------------------------
          | CUSTOMERS
          |--------------------------------------------------------------------------
          |
          | Only users where role = CUSTOMER.
          |
          */

    User.countDocuments({
      role: "CUSTOMER",
    }),

    /*
          |--------------------------------------------------------------------------
          | CATEGORIES
          |--------------------------------------------------------------------------
          */

    Category.countDocuments({}),

    /*
          |--------------------------------------------------------------------------
          | SERVICES
          |--------------------------------------------------------------------------
          */

    Service.countDocuments({}),

    /*
          |--------------------------------------------------------------------------
          | TOTAL BOOKINGS
          |--------------------------------------------------------------------------
          |
          | This automatically includes:
          |
          | PENDING
          | ACCEPT
          | REJECT
          |
          | Because there is no status filter.
          |
          */

    ServiceBooking.countDocuments({}),

    /*
          |--------------------------------------------------------------------------
          | REVIEWS
          |--------------------------------------------------------------------------
          */

    Review.countDocuments({}),

    /*
          |--------------------------------------------------------------------------
          | BLOG COMMENTS
          |--------------------------------------------------------------------------
          */

    Blog.aggregate([
      {
        $project: {
          commentCount: {
            $size: {
              $ifNull: ["$blog_comment", []],
            },
          },
        },
      },

      {
        $group: {
          _id: null,

          total: {
            $sum: "$commentCount",
          },
        },
      },
    ]),
  ]);

  /*
      |--------------------------------------------------------------------------
      | COMMENTS
      |--------------------------------------------------------------------------
      */

  const comments = commentsResult?.[0]?.total || 0;

  /*
      |--------------------------------------------------------------------------
      | RECENT BOOKINGS
      |--------------------------------------------------------------------------
      */

  const recentBookings = await ServiceBooking.find({})
    .populate("customer_id", "username email avatar")
    .populate("products_id", "name price thumbnail")
    .sort({
      created_at: -1,
    })
    .limit(10)
    .lean();

  /*
      |--------------------------------------------------------------------------
      | RESPONSE
      |--------------------------------------------------------------------------
      */

  return res.json({
    customers,

    categories,

    services,

    totalBookings,

    reviews,

    comments,

    recentBookings,
  });
});
