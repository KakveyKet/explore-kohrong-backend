import Counter from "../models/Counter.js";

/**
 * Generates AD:001, AD:002, ... using a database-wide atomic increment.
 * The counter is never reset automatically. Gaps are possible if a booking
 * fails after reserving a number; do not reuse numbers already allocated.
 */
export async function nextBookingNumber() {
  // Ensure the unique counter-key index exists, including on a fresh database.
  await Counter.init();

  const counter = await Counter.findOneAndUpdate(
    { key: "service_booking" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  return `AD:${String(counter.seq).padStart(3, "0")}`;
}
