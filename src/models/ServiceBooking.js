import mongoose from "mongoose";

const serviceBookingSchema = new mongoose.Schema(
  {
    // New customer-facing booking / invoice number. Older records may not
    // have a value until the migration is run.
    booking_number: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      index: true,
      match: /^AD:\d{3,}$/,
    },
    products_id: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
        required: true,
      },
    ],
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    total_price: { type: Number, required: true, default: 0, min: 0 },
    description: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ["PENDING", "ACCEPT", "REJECT"],
      default: "PENDING",
      index: true,
    },
    paid_type: { type: String, enum: ["CASH", "BANK"], default: "CASH" },
    payment_method: {
      type: String,
      enum: ["PAY_AT_CHECK_IN", "BANK_TRANSFER"],
      default: "PAY_AT_CHECK_IN",
    },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { versionKey: false, minimize: false },
);

serviceBookingSchema.pre("save", function () {
  this.updated_at = new Date();
});

serviceBookingSchema.index({ created_at: -1 });
serviceBookingSchema.index({ customer_id: 1, created_at: -1 });

const ServiceBooking =
  mongoose.models.ServiceBooking || mongoose.model("ServiceBooking", serviceBookingSchema);

export default ServiceBooking;
