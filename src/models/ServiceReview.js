import mongoose from "mongoose";

const serviceReviewSchema = new mongoose.Schema(
  {
    service_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
      index: true,
    },

    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
      index: true,
    },

    created_at: {
      type: Date,
      default: Date.now,
    },

    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  },
);

/*
|--------------------------------------------------------------------------
| ONE REVIEW PER CUSTOMER PER SERVICE
|--------------------------------------------------------------------------
*/

serviceReviewSchema.index(
  {
    service_id: 1,
    customer_id: 1,
  },
  {
    unique: true,
  },
);

/*
|--------------------------------------------------------------------------
| UPDATE DATE
|--------------------------------------------------------------------------
*/

serviceReviewSchema.pre("save", function (next) {
  this.updated_at = new Date();

  next();
});

const ServiceReview =
  mongoose.models.ServiceReview ||
  mongoose.model("ServiceReview", serviceReviewSchema);

export default ServiceReview;
