import jwt from "jsonwebtoken";

import User from "../models/User.js";

import { asyncHandler } from "../utils/asyncHandler.js";

import { httpError } from "../utils/httpError.js";

/*
|--------------------------------------------------------------------------
| AUTHENTICATE
|--------------------------------------------------------------------------
*/

export const authenticate = asyncHandler(async (req, res, next) => {
  /*
      |--------------------------------------------------------------------------
      | HEADER
      |--------------------------------------------------------------------------
      */

  const authorization = req.headers.authorization;

  if (!authorization) {
    throw httpError(401, "Authentication required");
  }

  if (!authorization.startsWith("Bearer ")) {
    throw httpError(401, "Invalid authorization format");
  }

  /*
      |--------------------------------------------------------------------------
      | TOKEN
      |--------------------------------------------------------------------------
      */

  const token = authorization.slice(7).trim();

  if (!token) {
    throw httpError(401, "Authentication required");
  }

  /*
      |--------------------------------------------------------------------------
      | SECRET
      |--------------------------------------------------------------------------
      */

  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing from .env");
  }

  /*
      |--------------------------------------------------------------------------
      | VERIFY
      |--------------------------------------------------------------------------
      */

  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw httpError(401, "Invalid or expired token");
  }

  /*
      |--------------------------------------------------------------------------
      | USER ID
      |--------------------------------------------------------------------------
      */

  const userId = decoded.id || decoded.userId || decoded._id;

  if (!userId) {
    throw httpError(401, "Invalid authentication token");
  }

  /*
      |--------------------------------------------------------------------------
      | USER
      |--------------------------------------------------------------------------
      */

  const user = await User.findById(userId).select("-password");

  if (!user) {
    throw httpError(401, "User account no longer exists");
  }

  /*
      |--------------------------------------------------------------------------
      | STATUS
      |--------------------------------------------------------------------------
      */

  if (user.status !== "ACTIVE") {
    throw httpError(403, "User account is not active");
  }

  req.user = user;

  next();
});

/*
|--------------------------------------------------------------------------
| ROLE AUTHORIZATION
|--------------------------------------------------------------------------
|
| Example:
|
| allowRoles(
|   "SUPER_ADMIN",
|   "ADMIN"
| )
|
*/

export function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(httpError(401, "Authentication required"));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        httpError(403, "You do not have permission to perform this action"),
      );
    }

    next();
  };
}
