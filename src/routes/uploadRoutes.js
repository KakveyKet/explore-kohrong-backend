import express from "express";

import { uploadImage, uploadImages } from "../controllers/uploadController.js";

import {
  uploadSingleImage,
  uploadMultipleImages,
} from "../middleware/upload.js";

import { authenticate, allowRoles } from "../middleware/auth.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| ADMIN IMAGE UPLOAD
|--------------------------------------------------------------------------
*/

router.post(
  "/image",

  authenticate,

  allowRoles("SUPER_ADMIN", "ADMIN", "STAFF"),

  uploadSingleImage,

  uploadImage,
);

router.post(
  "/images",

  authenticate,

  allowRoles("SUPER_ADMIN", "ADMIN", "STAFF"),

  uploadMultipleImages,

  uploadImages,
);

export default router;
