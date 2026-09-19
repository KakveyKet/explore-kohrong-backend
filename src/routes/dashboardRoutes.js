import express from "express";

import { getDashboard } from "../controllers/dashboardController.js";

import { authenticate, allowRoles } from "../middleware/auth.js";

const router = express.Router();

router.get(
  "/",

  authenticate,

  allowRoles("SUPER_ADMIN", "ADMIN", "STAFF"),

  getDashboard,
);

export default router;
