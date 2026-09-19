import cloudinary, { validateCloudinaryConfig } from "../config/cloudinary.js";

/*
|--------------------------------------------------------------------------
| UPLOAD IMAGE BUFFER
|--------------------------------------------------------------------------
*/

export function uploadImageBuffer(buffer, options = {}) {
  validateCloudinaryConfig();

  const folder = options.folder || "explore-kohrong/uploads";

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,

        resource_type: "image",

        /*
         * Cloudinary automatically
         * optimizes delivery.
         */
        transformation: [
          {
            quality: "auto",
          },

          {
            fetch_format: "auto",
          },
        ],
      },

      (error, result) => {
        if (error) {
          console.error("CLOUDINARY UPLOAD ERROR:", error);

          reject(error);

          return;
        }

        resolve({
          url: result.secure_url,

          public_id: result.public_id,

          width: result.width,

          height: result.height,

          format: result.format,

          bytes: result.bytes,
        });
      },
    );

    uploadStream.end(buffer);
  });
}

/*
|--------------------------------------------------------------------------
| DELETE IMAGE
|--------------------------------------------------------------------------
*/

export async function deleteImage(publicId) {
  if (!publicId) {
    return null;
  }

  validateCloudinaryConfig();

  return cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
  });
}
