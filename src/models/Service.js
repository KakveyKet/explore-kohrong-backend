import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    cate_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    // Fixed selling price for the service.
    price: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    // Rich HTML from PrimeVue Editor / Quill.
    description: {
      type: String,
      default: "",
    },

    thumbnail: {
      type: String,
      default: "",
    },

    images: {
      type: [String],
      default: [],
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },

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
  }
);

serviceSchema.index({ cate_id: 1, status: 1 });
serviceSchema.index({ name: 1 });

const Service = mongoose.model("Service", serviceSchema);
export default Service;
