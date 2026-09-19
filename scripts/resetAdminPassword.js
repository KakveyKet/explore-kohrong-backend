import "dotenv/config";

import mongoose from "mongoose";

import bcrypt from "bcryptjs";

/*
|--------------------------------------------------------------------------
| COMMAND
|--------------------------------------------------------------------------
|
| Example:
|
| node .\scripts\resetAdminPassword.js admin@gmail.com Admin@123456
|
*/

async function resetAdminPassword() {
  try {
    /*
    |--------------------------------------------------------------------------
    | ARGUMENTS
    |--------------------------------------------------------------------------
    */

    const email = String(process.argv[2] || "")
      .trim()
      .toLowerCase();

    const newPassword = String(process.argv[3] || "");

    if (!email) {
      throw new Error("Please provide the admin email.");
    }

    if (!newPassword) {
      throw new Error("Please provide the new password.");
    }

    if (newPassword.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }

    /*
    |--------------------------------------------------------------------------
    | MONGODB
    |--------------------------------------------------------------------------
    */

    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error("MONGODB_URI is missing from .env");
    }

    await mongoose.connect(mongoUri);

    console.log(`MongoDB connected: ${mongoose.connection.host}`);

    /*
    |--------------------------------------------------------------------------
    | RAW COLLECTION
    |--------------------------------------------------------------------------
    |
    | We intentionally use raw MongoDB.
    |
    | This prevents Mongoose pre-save
    | password hooks from running.
    |
    */

    const users = mongoose.connection.collection("users");

    /*
    |--------------------------------------------------------------------------
    | FIND ADMIN
    |--------------------------------------------------------------------------
    */

    const admin = await users.findOne({
      email,
    });

    if (!admin) {
      console.log(`User not found: ${email}`);

      console.log("");
      console.log("Available admin accounts:");

      const admins = await users
        .find({
          role: {
            $in: ["SUPER_ADMIN", "ADMIN"],
          },
        })
        .project({
          username: 1,
          email: 1,
          role: 1,
          status: 1,
        })
        .toArray();

      console.table(
        admins.map((user) => ({
          username: user.username,

          email: user.email,

          role: user.role,

          status: user.status,
        })),
      );

      return;
    }

    /*
    |--------------------------------------------------------------------------
    | CHECK ROLE
    |--------------------------------------------------------------------------
    */

    if (!["SUPER_ADMIN", "ADMIN"].includes(admin.role)) {
      throw new Error(`${email} is not an ADMIN or SUPER_ADMIN account.`);
    }

    /*
    |--------------------------------------------------------------------------
    | HASH ONCE
    |--------------------------------------------------------------------------
    */

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    /*
    |--------------------------------------------------------------------------
    | DIRECT UPDATE
    |--------------------------------------------------------------------------
    */

    await users.updateOne(
      {
        _id: admin._id,
      },

      {
        $set: {
          password: hashedPassword,

          status: "ACTIVE",

          updated_at: new Date(),
        },
      },
    );

    /*
    |--------------------------------------------------------------------------
    | VERIFY
    |--------------------------------------------------------------------------
    */

    const updated = await users.findOne({
      _id: admin._id,
    });

    const verified = await bcrypt.compare(newPassword, updated.password);

    console.log("");
    console.log("====================================");

    console.log("Admin password reset successfully");

    console.log("====================================");

    console.log({
      username: updated.username,

      email: updated.email,

      role: updated.role,

      status: updated.status,

      passwordVerified: verified,
    });

    if (!verified) {
      throw new Error("Password verification failed after reset.");
    }

    console.log("");
    console.log("The account is ready for login.");
  } catch (error) {
    console.error("");
    console.error("RESET PASSWORD ERROR:");

    console.error(error.message || error);

    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();

      console.log("MongoDB disconnected.");
    }
  }
}

resetAdminPassword();
