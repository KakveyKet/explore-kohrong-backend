import "dotenv/config";

import mongoose from "mongoose";

/*
|--------------------------------------------------------------------------
| MIGRATE BLOG POST_DETAIL
|--------------------------------------------------------------------------
|
| OLD:
|
| post_detail: {
|   sub_title: "...",
|   text: "...",
|   images: [],
|   video_url: ""
| }
|
| NEW:
|
| post_detail: [
|   {
|     sub_title: "...",
|     text: "...",
|     images: [],
|     video_url: ""
|   }
| ]
|
*/

async function migrateBlogSections() {
  try {
    /*
    |--------------------------------------------------------------------------
    | CHECK MONGODB URI
    |--------------------------------------------------------------------------
    */

    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from backend/.env");
    }

    /*
    |--------------------------------------------------------------------------
    | CONNECT TO MONGODB
    |--------------------------------------------------------------------------
    */

    await mongoose.connect(process.env.MONGODB_URI);

    console.log(`MongoDB connected: ${mongoose.connection.host}`);

    /*
    |--------------------------------------------------------------------------
    | GET BLOG COLLECTION
    |--------------------------------------------------------------------------
    */

    const collection = mongoose.connection.collection("blogs");

    /*
    |--------------------------------------------------------------------------
    | LOAD BLOGS
    |--------------------------------------------------------------------------
    */

    const blogs = await collection.find({}).toArray();

    console.log(`Found ${blogs.length} blog(s).`);

    let updated = 0;
    let skipped = 0;

    /*
    |--------------------------------------------------------------------------
    | MIGRATION
    |--------------------------------------------------------------------------
    */

    for (const blog of blogs) {
      /*
       * Already using the new structure.
       */
      if (Array.isArray(blog.post_detail)) {
        console.log(`SKIP: "${blog.title}" is already using array format.`);

        skipped += 1;

        continue;
      }

      /*
       * Old structure:
       *
       * post_detail: { ... }
       */
      if (blog.post_detail && typeof blog.post_detail === "object") {
        const oldPost = blog.post_detail;

        const newChildPost = {
          _id: new mongoose.Types.ObjectId(),

          sub_title: String(oldPost.sub_title || "Section 1").trim(),

          text: String(oldPost.text || "").trim(),

          images: Array.isArray(oldPost.images)
            ? oldPost.images
                .map((image) => String(image || "").trim())
                .filter(Boolean)
            : [],

          video_url: String(oldPost.video_url || "").trim(),
        };

        await collection.updateOne(
          {
            _id: blog._id,
          },

          {
            $set: {
              post_detail: [newChildPost],
            },
          },
        );

        console.log(`UPDATED: "${blog.title}"`);

        updated += 1;

        continue;
      }

      /*
       * Blog has no post_detail.
       *
       * We won't modify it automatically.
       */
      console.log(`SKIP: "${blog.title}" has no valid post_detail.`);

      skipped += 1;
    }

    /*
    |--------------------------------------------------------------------------
    | RESULT
    |--------------------------------------------------------------------------
    */

    console.log("");
    console.log("==============================");

    console.log("Blog migration completed.");

    console.log(`Updated: ${updated}`);

    console.log(`Skipped: ${skipped}`);

    console.log("==============================");
  } catch (error) {
    console.error("");
    console.error("Blog migration failed:");

    console.error(error);

    process.exitCode = 1;
  } finally {
    /*
    |--------------------------------------------------------------------------
    | CLOSE CONNECTION
    |--------------------------------------------------------------------------
    */

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();

      console.log("MongoDB disconnected.");
    }
  }
}

migrateBlogSections();
