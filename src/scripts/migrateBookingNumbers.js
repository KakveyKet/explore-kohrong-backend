import "dotenv/config";
import mongoose from "mongoose";
import ServiceBooking from "../models/ServiceBooking.js";
import Counter from "../models/Counter.js";

/*
  Run ONCE after making a database backup, with the backend stopped:
  node src/scripts/migrateBookingNumbers.js

  - Assigns AD:001, AD:002... to existing bookings missing booking_number.
  - Preserves any existing AD codes.
  - Seeds/advances Counter to the highest assigned number.
  - Safe to rerun: does not change already-assigned booking_number fields.
*/
async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error("MONGODB_URI or MONGO_URI must be configured in backend/.env");

  await mongoose.connect(uri);
  await Promise.all([ServiceBooking.init(), Counter.init()]);

  const existing = await ServiceBooking.find({
    booking_number: { $regex: /^AD:\d+$/ },
  })
    .select("booking_number")
    .lean();

  const highestSaved = existing.reduce((max, doc) => {
    const number = Number(String(doc.booking_number).slice(3));
    return Number.isSafeInteger(number) ? Math.max(max, number) : max;
  }, 0);

  const counter = await Counter.findOne({ key: "service_booking" }).lean();
  let seq = Math.max(highestSaved, Number(counter?.seq || 0));

  const missing = await ServiceBooking.find({
    $or: [
      { booking_number: { $exists: false } },
      { booking_number: null },
      { booking_number: "" },
    ],
  })
    .sort({ created_at: 1, _id: 1 })
    .select("_id created_at")
    .lean();

  console.log(`Existing AD numbers: ${existing.length}`);
  console.log(`Bookings needing a number: ${missing.length}`);
  console.log(`Starting sequence: ${seq}`);

  for (const booking of missing) {
    seq += 1;
    const bookingNumber = `AD:${String(seq).padStart(3, "0")}`;
    await ServiceBooking.updateOne(
      { _id: booking._id },
      { $set: { booking_number: bookingNumber } },
    );
    console.log(`${booking._id} -> ${bookingNumber}`);
  }

  await Counter.findOneAndUpdate(
    { key: "service_booking" },
    { $max: { seq } },
    { upsert: true, new: true, setDefaultsOnInsert: false },
  );

  console.log(`✅ Migration complete. Next booking will be AD:${String(seq + 1).padStart(3, "0")}`);
}

main()
  .catch((error) => {
    console.error("❌ Migration failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
