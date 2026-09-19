import express from "express";

import {
  login,
  register,
  getMe,
  updateProfile,
} from "../controllers/authController.js";

import { authenticate } from "../middleware/auth.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| PUBLIC
|--------------------------------------------------------------------------
*/

router.post("/login", login);

router.post("/register", register);

/*
|--------------------------------------------------------------------------
| CURRENT USER
|--------------------------------------------------------------------------
*/

router.get("/me", authenticate, getMe);

router.patch("/profile", authenticate, updateProfile);

export default router;
