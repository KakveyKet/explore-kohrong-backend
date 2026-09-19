import crypto from "crypto";

import bcrypt from "bcryptjs";

import User from "../models/User.js";

import { sendPasswordResetEmail } from "../services/emailService.js";

/*
|--------------------------------------------------------------------------
| CONFIG
|--------------------------------------------------------------------------
*/

const RESET_TOKEN_MINUTES = 15;

const PUBLIC_MESSAGE =
  "If an account exists with that email, a password reset link has been sent.";

/*
|--------------------------------------------------------------------------
| FORGOT PASSWORD
|--------------------------------------------------------------------------
|
| POST /api/auth/forgot-password
|
| {
|   "email": "user@gmail.com"
| }
|
*/

export async function forgotPassword(req, res) {
  try {
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();

    /*
    |--------------------------------------------------------------------------
    | VALIDATION
    |--------------------------------------------------------------------------
    */

    if (!email) {
      return res.status(400).json({
        message: "Email is required.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | FIND USER
    |--------------------------------------------------------------------------
    |
    | We still return the same public
    | response if the account does not exist.
    |
    */

    const user = await User.findOne({
      email,
    });

    if (!user) {
      return res.status(200).json({
        message: PUBLIC_MESSAGE,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | CREATE RANDOM TOKEN
    |--------------------------------------------------------------------------
    */

    const rawToken = crypto.randomBytes(32).toString("hex");

    /*
     * Store only the hash.
     */

    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const expiresAt = new Date(Date.now() + RESET_TOKEN_MINUTES * 60 * 1000);

    /*
    |--------------------------------------------------------------------------
    | STORE TOKEN
    |--------------------------------------------------------------------------
    */

    await User.updateOne(
      {
        _id: user._id,
      },
      {
        $set: {
          resetPasswordToken: hashedToken,

          resetPasswordExpires: expiresAt,
        },
      },
    );

    /*
    |--------------------------------------------------------------------------
    | RESET URL
    |--------------------------------------------------------------------------
    */

    const frontendUrl = String(
      process.env.FRONTEND_URL || "http://localhost:5173",
    ).replace(/\/$/, "");

    const resetUrl = `${frontendUrl}/reset-password/${rawToken}`;

    /*
    |--------------------------------------------------------------------------
    | CUSTOMER NAME
    |--------------------------------------------------------------------------
    */

    const fullName = [user.firstName, user.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    const name = fullName || user.username || "there";

    /*
    |--------------------------------------------------------------------------
    | SEND EMAIL
    |--------------------------------------------------------------------------
    */

    try {
      await sendPasswordResetEmail({
        email: user.email,

        name,

        resetUrl,
      });
    } catch (emailError) {
      /*
       * Remove the reset token
       * if email delivery fails.
       */

      await User.updateOne(
        {
          _id: user._id,
        },
        {
          $unset: {
            resetPasswordToken: "",

            resetPasswordExpires: "",
          },
        },
      );

      console.error("PASSWORD RESET EMAIL ERROR:", emailError);

      return res.status(500).json({
        message: "Unable to send password reset email. Please try again later.",
      });
    }

    return res.status(200).json({
      message: PUBLIC_MESSAGE,
    });
  } catch (error) {
    console.error("FORGOT PASSWORD ERROR:", error);

    return res.status(500).json({
      message: "Unable to process password reset request.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| RESET PASSWORD
|--------------------------------------------------------------------------
|
| POST /api/auth/reset-password/:token
|
| {
|   "password": "newPassword",
|   "confirmPassword": "newPassword"
| }
|
*/

export async function resetPassword(req, res) {
  try {
    const token = String(req.params?.token || "").trim();

    const password = String(req.body?.password || "");

    const confirmPassword = String(req.body?.confirmPassword || "");

    /*
    |--------------------------------------------------------------------------
    | VALIDATION
    |--------------------------------------------------------------------------
    */

    if (!token) {
      return res.status(400).json({
        message: "Password reset token is required.",
      });
    }

    if (!password || !confirmPassword) {
      return res.status(400).json({
        message: "Password and confirmation are required.",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must contain at least 8 characters.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | HASH TOKEN
    |--------------------------------------------------------------------------
    */

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    /*
    |--------------------------------------------------------------------------
    | FIND USER
    |--------------------------------------------------------------------------
    */

    const user = await User.findOne({
      resetPasswordToken: hashedToken,

      resetPasswordExpires: {
        $gt: new Date(),
      },
    });

    if (!user) {
      return res.status(400).json({
        message: "This password reset link is invalid or has expired.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | HASH NEW PASSWORD
    |--------------------------------------------------------------------------
    |
    | updateOne() is used so this does not trigger
    | your existing mongoose pre-save password hook.
    |
    */

    const hashedPassword = await bcrypt.hash(password, 12);

    /*
    |--------------------------------------------------------------------------
    | UPDATE PASSWORD
    |--------------------------------------------------------------------------
    |
    | Include the token condition again to prevent
    | two requests from using the same reset link.
    |
    */

    const updateResult = await User.updateOne(
      {
        _id: user._id,

        resetPasswordToken: hashedToken,

        resetPasswordExpires: {
          $gt: new Date(),
        },
      },
      {
        $set: {
          password: hashedPassword,

          updated_at: new Date(),
        },

        $unset: {
          resetPasswordToken: "",

          resetPasswordExpires: "",
        },
      },
    );

    if (!updateResult.modifiedCount) {
      return res.status(400).json({
        message: "This password reset link is invalid or has expired.",
      });
    }

    return res.status(200).json({
      message:
        "Your password has been reset successfully. You can now sign in.",
    });
  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);

    return res.status(500).json({
      message: "Unable to reset password.",
    });
  }
}
