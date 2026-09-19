import express from "express";

import {
  forgotPassword,
  resetPassword,
} from "../controllers/passwordResetController.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| FORGOT PASSWORD
|--------------------------------------------------------------------------
*/

router.post("/forgot-password", forgotPassword);

/*
|--------------------------------------------------------------------------
| RESET PASSWORD
|--------------------------------------------------------------------------
*/

router.post("/reset-password/:token", resetPassword);

export default router;
