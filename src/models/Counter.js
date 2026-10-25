import mongoose from "mongoose";

const counterSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    seq: { type: Number, required: true, default: 0, min: 0 },
  },
  { versionKey: false },
);

const Counter = mongoose.models.Counter || mongoose.model("Counter", counterSchema);
export default Counter;
