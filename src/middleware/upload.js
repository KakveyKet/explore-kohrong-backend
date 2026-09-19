import multer from "multer";

import { httpError } from "../utils/httpError.js";

/*
|--------------------------------------------------------------------------
| MEMORY STORAGE
|--------------------------------------------------------------------------
|
| We do NOT save uploaded images
| permanently to the Node server.
|
| Browser
|   ↓
| Multer memory
|   ↓
| Cloudinary
|
*/

const storage = multer.memoryStorage();

/*
|--------------------------------------------------------------------------
| IMAGE FILTER
|--------------------------------------------------------------------------
*/

function imageFileFilter(req, file, callback) {
  if (!file.mimetype?.startsWith("image/")) {
    return callback(httpError(400, "Only image files are allowed."), false);
  }

  callback(null, true);
}

/*
|--------------------------------------------------------------------------
| MULTER
|--------------------------------------------------------------------------
*/

const uploader = multer({
  storage,

  fileFilter: imageFileFilter,

  limits: {
    /*
     * 8 MB each
     */
    fileSize: 8 * 1024 * 1024,

    /*
     * Maximum 10 images
     * in one request.
     */
    files: 10,
  },
});

/*
|--------------------------------------------------------------------------
| SINGLE IMAGE
|--------------------------------------------------------------------------
|
| FormData:
|
| image = File
|
*/

export const uploadSingleImage = uploader.single("image");

/*
|--------------------------------------------------------------------------
| MULTIPLE IMAGES
|--------------------------------------------------------------------------
|
| FormData:
|
| images = File
| images = File
| images = File
|
*/

export const uploadMultipleImages = uploader.array("images", 10);
