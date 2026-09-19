import { asyncHandler } from "../utils/asyncHandler.js";

import { httpError } from "../utils/httpError.js";

import { uploadImageBuffer } from "../services/cloudinaryService.js";

/*
|--------------------------------------------------------------------------
| SAFE FOLDER
|--------------------------------------------------------------------------
|
| Frontend may send:
|
| explore-kohrong/services
| explore-kohrong/services/gallery
| explore-kohrong/blogs
|
*/

function normalizeFolder(value) {
  const folder = String(value || "explore-kohrong/uploads")
    .trim()
    .replace(/[^a-zA-Z0-9/_-]/g, "");

  return folder || "explore-kohrong/uploads";
}

/*
|--------------------------------------------------------------------------
| UPLOAD ONE IMAGE
|--------------------------------------------------------------------------
|
| POST /api/uploads/image
|
| multipart/form-data:
|
| image  = File
| folder = optional folder name
|
*/

export const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw httpError(400, "Please select an image.");
  }

  const folder = normalizeFolder(req.body.folder);

  const uploaded = await uploadImageBuffer(req.file.buffer, {
    folder,
  });

  /*
   * IMPORTANT:
   *
   * Return top-level url AND image.url.
   *
   * This keeps older frontend code
   * and newer frontend code compatible.
   */

  return res.status(201).json({
    success: true,

    message: "Image uploaded successfully.",

    url: uploaded.url,

    public_id: uploaded.public_id,

    image: {
      url: uploaded.url,

      public_id: uploaded.public_id,

      width: uploaded.width,

      height: uploaded.height,

      format: uploaded.format,

      bytes: uploaded.bytes,
    },
  });
});

/*
|--------------------------------------------------------------------------
| UPLOAD MULTIPLE IMAGES
|--------------------------------------------------------------------------
|
| POST /api/uploads/images
|
*/

export const uploadImages = asyncHandler(async (req, res) => {
  const files = req.files || [];

  if (!files.length) {
    throw httpError(400, "Please select at least one image.");
  }

  const folder = normalizeFolder(req.body.folder);

  const uploadedImages = await Promise.all(
    files.map((file) =>
      uploadImageBuffer(file.buffer, {
        folder,
      }),
    ),
  );

  return res.status(201).json({
    success: true,

    message: `${uploadedImages.length} image(s) uploaded successfully.`,

    images: uploadedImages.map((image) => ({
      url: image.url,

      public_id: image.public_id,

      width: image.width,

      height: image.height,

      format: image.format,

      bytes: image.bytes,
    })),
  });
});
