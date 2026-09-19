import { v2 as cloudinary } from "cloudinary";

/*
|--------------------------------------------------------------------------
| CLOUDINARY CONFIG
|--------------------------------------------------------------------------
*/

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,

  api_key: process.env.CLOUDINARY_API_KEY,

  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/*
|--------------------------------------------------------------------------
| VALIDATE CONFIG
|--------------------------------------------------------------------------
*/

export function validateCloudinaryConfig() {
  const { cloud_name, api_key, api_secret } = cloudinary.config();

  if (!cloud_name || !api_key || !api_secret) {
    throw new Error("Cloudinary configuration is incomplete.");
  }
}

export default cloudinary;
