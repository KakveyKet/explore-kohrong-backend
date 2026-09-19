import jwt from "jsonwebtoken";

import User from "../models/User.js";

import { asyncHandler } from "../utils/asyncHandler.js";

import { httpError } from "../utils/httpError.js";

/*
|--------------------------------------------------------------------------
| GENERATE TOKEN
|--------------------------------------------------------------------------
*/

function generateToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing from .env");
  }

  return jwt.sign(
    {
      id: user._id.toString(),

      role: user.role,
    },

    process.env.JWT_SECRET,

    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    },
  );
}

/*
|--------------------------------------------------------------------------
| GET SAFE USER
|--------------------------------------------------------------------------
*/

async function getSafeUser(userId) {
  return User.findById(userId).select("-password");
}

/*
|--------------------------------------------------------------------------
| REGISTER CUSTOMER
|--------------------------------------------------------------------------
|
| POST /api/auth/register
|
| IMPORTANT:
|
| Do NOT bcrypt.hash() here.
|
| We send the plain password to User.create().
| User.js hashes it exactly once.
|
*/

export const register = asyncHandler(async (req, res) => {
  const { username, email, phone, password } = req.body;

  /*
      |--------------------------------------------------------------------------
      | NORMALIZE
      |--------------------------------------------------------------------------
      */

  const cleanUsername = String(username || "").trim();

  const cleanEmail = String(email || "")
    .trim()
    .toLowerCase();

  const cleanPhone = String(phone || "").trim();

  const cleanPassword = String(password || "");

  /*
      |--------------------------------------------------------------------------
      | VALIDATE
      |--------------------------------------------------------------------------
      */

  if (!cleanUsername) {
    throw httpError(400, "Username is required");
  }

  if (!cleanEmail) {
    throw httpError(400, "Email is required");
  }

  if (!cleanPassword) {
    throw httpError(400, "Password is required");
  }

  if (cleanPassword.length < 8) {
    throw httpError(400, "Password must be at least 8 characters");
  }

  /*
      |--------------------------------------------------------------------------
      | USERNAME EXISTS
      |--------------------------------------------------------------------------
      */

  const usernameExists = await User.findOne({
    username: cleanUsername,
  });

  if (usernameExists) {
    throw httpError(409, "Username already exists");
  }

  /*
      |--------------------------------------------------------------------------
      | EMAIL EXISTS
      |--------------------------------------------------------------------------
      */

  const emailExists = await User.findOne({
    email: cleanEmail,
  });

  if (emailExists) {
    throw httpError(409, "Email already exists");
  }

  /*
      |--------------------------------------------------------------------------
      | PHONE EXISTS
      |--------------------------------------------------------------------------
      */

  if (cleanPhone) {
    const phoneExists = await User.findOne({
      phone: cleanPhone,
    });

    if (phoneExists) {
      throw httpError(409, "Phone number already exists");
    }
  }

  /*
      |--------------------------------------------------------------------------
      | CREATE CUSTOMER
      |--------------------------------------------------------------------------
      |
      | DO NOT manually hash password.
      |
      | User model pre-save hook
      | handles it.
      |
      */

  const user = await User.create({
    username: cleanUsername,

    email: cleanEmail,

    phone: cleanPhone,

    password: cleanPassword,

    role: "CUSTOMER",

    status: "ACTIVE",
  });

  /*
      |--------------------------------------------------------------------------
      | TOKEN
      |--------------------------------------------------------------------------
      */

  const token = generateToken(user);

  const safeUser = await getSafeUser(user._id);

  return res.status(201).json({
    success: true,

    message: "Registration successful",

    token,

    user: safeUser,
  });
});

/*
|--------------------------------------------------------------------------
| LOGIN
|--------------------------------------------------------------------------
|
| POST /api/auth/login
|
| Supports:
|
| {
|   identifier: "admin@gmail.com",
|   password: "..."
| }
|
| Or:
|
| {
|   identifier: "admin",
|   password: "..."
| }
|
*/

export const login = asyncHandler(async (req, res) => {
  /*
   * Safe debugging.
   *
   * Never log the actual password.
   */

  console.log("[LOGIN] request body:", {
    identifier: req.body.identifier || req.body.email || req.body.username,

    password: req.body.password ? "***" : undefined,
  });

  /*
      |--------------------------------------------------------------------------
      | REQUEST
      |--------------------------------------------------------------------------
      */

  const { identifier, email, username, password } = req.body;

  const loginValue = String(identifier || email || username || "").trim();

  const cleanPassword = String(password || "");

  /*
      |--------------------------------------------------------------------------
      | VALIDATE
      |--------------------------------------------------------------------------
      */

  if (!loginValue) {
    throw httpError(400, "Email or username is required");
  }

  if (!cleanPassword) {
    throw httpError(400, "Password is required");
  }

  /*
      |--------------------------------------------------------------------------
      | FIND BY EMAIL OR USERNAME
      |--------------------------------------------------------------------------
      */

  const isEmail = loginValue.includes("@");

  const query = isEmail
    ? {
        email: loginValue.toLowerCase(),
      }
    : {
        username: loginValue,
      };

  /*
   * Password has select:false,
   * therefore +password is required.
   */

  const user = await User.findOne(query).select("+password");

  /*
      |--------------------------------------------------------------------------
      | DEVELOPMENT DEBUG
      |--------------------------------------------------------------------------
      */

  console.log("[LOGIN] account lookup:", {
    found: Boolean(user),

    username: user?.username,

    email: user?.email,

    role: user?.role,

    status: user?.status,

    hasPassword: Boolean(user?.password),
  });

  /*
      |--------------------------------------------------------------------------
      | USER NOT FOUND
      |--------------------------------------------------------------------------
      */

  if (!user) {
    throw httpError(401, "Invalid email/username or password");
  }

  /*
      |--------------------------------------------------------------------------
      | STATUS
      |--------------------------------------------------------------------------
      */

  if (user.status !== "ACTIVE") {
    throw httpError(403, "Your account is not active");
  }

  /*
      |--------------------------------------------------------------------------
      | PASSWORD FIELD
      |--------------------------------------------------------------------------
      */

  if (!user.password) {
    throw httpError(500, "This account does not have a valid password");
  }

  /*
      |--------------------------------------------------------------------------
      | COMPARE PASSWORD
      |--------------------------------------------------------------------------
      */

  const passwordMatched = await user.comparePassword(cleanPassword);

  console.log("[LOGIN] password matched:", passwordMatched);

  if (!passwordMatched) {
    throw httpError(401, "Invalid email/username or password");
  }

  /*
      |--------------------------------------------------------------------------
      | UPDATE LOGIN TIME
      |--------------------------------------------------------------------------
      |
      | VERY IMPORTANT:
      |
      | Do NOT:
      |
      | user.login_at = new Date();
      | await user.save();
      |
      | We use updateOne().
      |
      | That means password save middleware
      | is never involved during login.
      |
      */

  await User.updateOne(
    {
      _id: user._id,
    },

    {
      $set: {
        login_at: new Date(),
      },
    },
  );

  /*
      |--------------------------------------------------------------------------
      | GENERATE TOKEN
      |--------------------------------------------------------------------------
      */

  const token = generateToken(user);

  /*
      |--------------------------------------------------------------------------
      | SAFE USER
      |--------------------------------------------------------------------------
      */

  const safeUser = await getSafeUser(user._id);

  /*
      |--------------------------------------------------------------------------
      | RESPONSE
      |--------------------------------------------------------------------------
      */

  return res.json({
    success: true,

    message: "Login successful",

    token,

    user: safeUser,
  });
});

/*
|--------------------------------------------------------------------------
| CURRENT USER
|--------------------------------------------------------------------------
|
| GET /api/auth/me
|
*/
export async function updateProfile(req, res, next) {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | INPUT
    |--------------------------------------------------------------------------
    */

    const firstName = String(req.body?.firstName ?? "").trim();

    const lastName = String(req.body?.lastName ?? "").trim();

    const username = String(req.body?.username ?? "").trim();

    const email = String(req.body?.email ?? "")
      .trim()
      .toLowerCase();

    const phone = String(req.body?.phone ?? "").trim();

    /*
    |--------------------------------------------------------------------------
    | REQUIRED FIELDS
    |--------------------------------------------------------------------------
    */

    if (!username) {
      return res.status(400).json({
        message: "Username is required.",
      });
    }

    if (!email) {
      return res.status(400).json({
        message: "Email is required.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | EMAIL FORMAT
    |--------------------------------------------------------------------------
    */

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      return res.status(400).json({
        message: "Please enter a valid email address.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | CURRENT USER
    |--------------------------------------------------------------------------
    */

    const currentUser = await User.findById(userId);

    if (!currentUser) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | CHECK USERNAME DUPLICATE
    |--------------------------------------------------------------------------
    */

    const usernameExists = await User.findOne({
      username,

      _id: {
        $ne: currentUser._id,
      },
    });

    if (usernameExists) {
      return res.status(409).json({
        message: "This username is already in use.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | CHECK EMAIL DUPLICATE
    |--------------------------------------------------------------------------
    */

    const emailExists = await User.findOne({
      email,

      _id: {
        $ne: currentUser._id,
      },
    });

    if (emailExists) {
      return res.status(409).json({
        message: "This email address is already in use.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | UPDATE
    |--------------------------------------------------------------------------
    */

    currentUser.firstName = firstName;

    currentUser.lastName = lastName;

    currentUser.username = username;

    currentUser.email = email;

    currentUser.phone = phone;

    currentUser.updated_by = currentUser._id;

    await currentUser.save();

    /*
    |--------------------------------------------------------------------------
    | SAFE RESPONSE
    |--------------------------------------------------------------------------
    */

    return res.status(200).json({
      message: "Profile updated successfully.",

      user: {
        _id: currentUser._id,

        firstName: currentUser.firstName || "",

        lastName: currentUser.lastName || "",

        username: currentUser.username,

        email: currentUser.email,

        phone: currentUser.phone || "",

        avatar: currentUser.avatar || "",

        role: currentUser.role,

        status: currentUser.status,

        login_at: currentUser.login_at,

        created_at: currentUser.created_at,

        updated_at: currentUser.updated_at,
      },
    });
  } catch (error) {
    console.error("[UPDATE PROFILE ERROR]", error);

    /*
     * Mongo duplicate error fallback.
     */

    if (error?.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];

      return res.status(409).json({
        message:
          field === "email"
            ? "This email address is already in use."
            : field === "username"
              ? "This username is already in use."
              : "This value is already in use.",
      });
    }

    next(error);
  }
}
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");

  if (!user) {
    throw httpError(404, "User not found");
  }

  console.log("[GET PROFILE]", {
    id: user._id,
    username: user.username,
    avatar: user.avatar,
  });

  return res.json({
    success: true,

    user: {
      _id: user._id,

      username: user.username,

      email: user.email,

      avatar: user.avatar || "",

      role: user.role,

      status: user.status,

      login_at: user.login_at,
    },
  });
});

/*
|--------------------------------------------------------------------------
| UPDATE MY PROFILE
|--------------------------------------------------------------------------
*/

export const updateMe = asyncHandler(async (req, res) => {
  console.log("[UPDATE PROFILE BODY]", req.body);

  const user = await User.findById(req.user._id);

  if (!user) {
    throw httpError(404, "User not found");
  }

  if (req.body.username !== undefined) {
    user.username = String(req.body.username).trim();
  }

  if (req.body.email !== undefined) {
    user.email = String(req.body.email).trim().toLowerCase();
  }

  /*
    |--------------------------------------------------------------------------
    | AVATAR
    |--------------------------------------------------------------------------
    */

  if (req.body.avatar !== undefined) {
    console.log("[AVATAR RECEIVED]", req.body.avatar);

    user.avatar = String(req.body.avatar || "").trim();
  }

  user.updated_by = user._id;

  await user.save();

  /*
    |--------------------------------------------------------------------------
    | VERIFY DIRECTLY FROM MONGODB
    |--------------------------------------------------------------------------
    */

  const updated = await User.findById(user._id).select("-password");

  console.log("[PROFILE SAVED]", {
    username: updated.username,

    avatar: updated.avatar,
  });

  return res.json({
    success: true,

    message: "Profile updated successfully",

    user: updated,
  });
});
/*
|--------------------------------------------------------------------------
| CHANGE PASSWORD
|--------------------------------------------------------------------------
|
| PATCH /api/auth/change-password
|
*/

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  /*
      |--------------------------------------------------------------------------
      | VALIDATE
      |--------------------------------------------------------------------------
      */

  if (!currentPassword) {
    throw httpError(400, "Current password is required");
  }

  if (!newPassword) {
    throw httpError(400, "New password is required");
  }

  if (String(newPassword).length < 8) {
    throw httpError(400, "New password must be at least 8 characters");
  }

  if (confirmPassword !== undefined && newPassword !== confirmPassword) {
    throw httpError(400, "Password confirmation does not match");
  }

  /*
      |--------------------------------------------------------------------------
      | USER WITH PASSWORD
      |--------------------------------------------------------------------------
      */

  const user = await User.findById(req.user._id).select("+password");

  if (!user) {
    throw httpError(404, "User not found");
  }

  /*
      |--------------------------------------------------------------------------
      | CURRENT PASSWORD
      |--------------------------------------------------------------------------
      */

  const matched = await user.comparePassword(currentPassword);

  if (!matched) {
    throw httpError(400, "Current password is incorrect");
  }

  /*
      |--------------------------------------------------------------------------
      | SET PLAIN NEW PASSWORD
      |--------------------------------------------------------------------------
      |
      | Do NOT bcrypt.hash() here.
      |
      | User model will hash once.
      |
      */

  user.password = String(newPassword);

  user.updated_by = user._id;

  /*
   * password modified = true
   *
   * pre-save hook hashes exactly once.
   */

  await user.save();

  return res.json({
    success: true,

    message: "Password changed successfully",
  });
});

export const resetMyPassword = asyncHandler(async (req, res) => {
  const { newPassword, confirmPassword } = req.body;

  /*
      |--------------------------------------------------------------------------
      | VALIDATE
      |--------------------------------------------------------------------------
      */

  if (!newPassword) {
    throw httpError(400, "New password is required");
  }

  if (String(newPassword).length < 8) {
    throw httpError(400, "Password must be at least 8 characters");
  }

  if (
    confirmPassword !== undefined &&
    String(newPassword) !== String(confirmPassword)
  ) {
    throw httpError(400, "Password confirmation does not match");
  }

  /*
      |--------------------------------------------------------------------------
      | LOAD USER
      |--------------------------------------------------------------------------
      */

  const user = await User.findById(req.user._id).select("+password");

  if (!user) {
    throw httpError(404, "User not found");
  }

  /*
      |--------------------------------------------------------------------------
      | ROLE CHECK
      |--------------------------------------------------------------------------
      */

  if (!["SUPER_ADMIN", "ADMIN"].includes(user.role)) {
    throw httpError(403, "Only administrators can reset their password here");
  }

  /*
      |--------------------------------------------------------------------------
      | SET PLAIN PASSWORD
      |--------------------------------------------------------------------------
      |
      | Do NOT bcrypt.hash here.
      |
      | User.js will hash it exactly once.
      |
      */

  user.password = String(newPassword);

  user.updated_by = user._id;

  await user.save();

  return res.json({
    success: true,

    message: "Password reset successfully",
  });
});
