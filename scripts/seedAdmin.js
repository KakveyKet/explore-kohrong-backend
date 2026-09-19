import "dotenv/config";

import bcrypt from "bcryptjs";

import connectDB from "../src/config/db.js";

import User from "../src/models/User.js";

async function seedAdmin() {
  try {
    await connectDB();

    const username = process.env.SEED_ADMIN_USERNAME || "admin";

    const email = (process.env.SEED_ADMIN_EMAIL || "admin@example.com")
      .trim()
      .toLowerCase();

    const password = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";

    /*
     * Explicitly select password because
     * User schema hides it by default.
     */
    let admin = await User.findOne({
      email,
    }).select("+password");

    /*
    |--------------------------------------------------------------------------
    | ADMIN DOES NOT EXIST
    |--------------------------------------------------------------------------
    */

    if (!admin) {
      const hashedPassword = await bcrypt.hash(password, 12);

      admin = await User.create({
        username,

        email,

        password: hashedPassword,

        role: "SUPER_ADMIN",

        status: "ACTIVE",
      });

      console.log("Admin created successfully:");

      console.log({
        username: admin.username,

        email: admin.email,

        role: admin.role,
      });

      process.exit(0);
    }

    /*
    |--------------------------------------------------------------------------
    | ADMIN EXISTS
    |--------------------------------------------------------------------------
    */

    console.log(`Admin already exists: ${email}`);

    /*
     * Repair password if it is missing.
     */

    if (!admin.password) {
      console.log("Admin password is missing. Repairing...");

      admin.password = await bcrypt.hash(password, 12);

      await admin.save();

      console.log("Admin password repaired successfully.");
    }

    /*
     * Make sure admin account can login.
     */

    let changed = false;

    if (admin.status !== "ACTIVE") {
      admin.status = "ACTIVE";

      changed = true;
    }

    if (!["SUPER_ADMIN", "ADMIN"].includes(admin.role)) {
      admin.role = "SUPER_ADMIN";

      changed = true;
    }

    if (changed) {
      await admin.save();

      console.log("Admin account status/role repaired.");
    }

    console.log("Admin account is ready.");

    process.exit(0);
  } catch (error) {
    console.error("Seed admin failed:", error);

    process.exit(1);
  }
}

seedAdmin();
