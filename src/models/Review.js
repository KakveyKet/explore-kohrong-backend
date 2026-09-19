import mongoose from "mongoose";

/*
|--------------------------------------------------------------------------
| REVIEW COMMENT
|--------------------------------------------------------------------------
*/

const reviewCommentSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,

      ref: "User",

      required: true,
    },

    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1500,
    },
  },
  {
    _id: true,

    timestamps: {
      createdAt: "created_at",

      updatedAt: "updated_at",
    },
  },
);

/*
|--------------------------------------------------------------------------
| REVIEW
|--------------------------------------------------------------------------
*/

const reviewSchema = new mongoose.Schema(
  {
    /*
      |--------------------------------------------------------------------------
      | CUSTOMER
      |--------------------------------------------------------------------------
      */

    user_review_id: {
      type: mongoose.Schema.Types.ObjectId,

      ref: "User",

      required: true,
    },

    /*
      |--------------------------------------------------------------------------
      | SERVICE
      |--------------------------------------------------------------------------
      */

    product_id: {
      type: mongoose.Schema.Types.ObjectId,

      ref: "Service",

      required: true,
    },

    /*
      |--------------------------------------------------------------------------
      | RATING
      |--------------------------------------------------------------------------
      */

    rate: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    /*
      |--------------------------------------------------------------------------
      | COMMENT
      |--------------------------------------------------------------------------
      */

    review_comment: {
      type: [reviewCommentSchema],

      default: [],
    },

    /*
      |--------------------------------------------------------------------------
      | AUDIT
      |--------------------------------------------------------------------------
      */

    created_by: {
      type: mongoose.Schema.Types.ObjectId,

      ref: "User",

      default: null,
    },

    updated_by: {
      type: mongoose.Schema.Types.ObjectId,

      ref: "User",

      default: null,
    },
  },

  {
    timestamps: {
      createdAt: "created_at",

      updatedAt: "updated_at",
    },
  },
);

/*
|--------------------------------------------------------------------------
| ONE REVIEW PER CUSTOMER PER SERVICE
|--------------------------------------------------------------------------
*/

reviewSchema.index(
  {
    user_review_id: 1,
    product_id: 1,
  },
  {
    unique: true,
  },
);

/*
|--------------------------------------------------------------------------
| QUERY INDEX
|--------------------------------------------------------------------------
*/

reviewSchema.index({
  product_id: 1,
  created_at: -1,
});

const Review = mongoose.model("Review", reviewSchema);

export default Review;
