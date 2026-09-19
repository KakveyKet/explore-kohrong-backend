import streamifier from 'streamifier';
import cloudinary from '../config/cloudinary.js';

export function uploadImageBuffer(buffer, folder = 'explore-kohrong') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, public_id: result.public_id });
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
}
