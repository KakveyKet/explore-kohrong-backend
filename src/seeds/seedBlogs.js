import "dotenv/config";

import mongoose from "mongoose";

/*
|--------------------------------------------------------------------------
| IMPORTANT VERSION MARKER
|--------------------------------------------------------------------------
*/

console.log("🚀 RAW BLOG SEED V3 STARTED");

/*
|--------------------------------------------------------------------------
| DATABASE
|--------------------------------------------------------------------------
*/

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI or MONGO_URI is missing from .env");

  process.exit(1);
}

/*
|--------------------------------------------------------------------------
| SLUG
|--------------------------------------------------------------------------
*/

function makeSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/*
|--------------------------------------------------------------------------
| TEST BLOG DATA
|--------------------------------------------------------------------------
*/

const blogSeedData = [
  {
    title: "10 Best Things to Do in Koh Rong",

    sub_title: "Discover the Best Activities and Experiences on Koh Rong",

    thumbnail:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=85",

    excerpt:
      "Discover beaches, snorkeling, boat trips, villages and unforgettable island experiences.",

    images: [
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1400&q=85",
    ],

    text: "Koh Rong is one of Cambodia's beautiful island destinations. Visitors can enjoy tropical beaches, boat trips, snorkeling, local villages and relaxing island experiences. Spend time on the beach, join a boat tour, explore marine life and enjoy a beautiful island sunset.",
  },

  {
    title: "A Complete Guide to Koh Rong Beaches",

    sub_title: "Explore Beautiful Beaches Around the Island",

    thumbnail:
      "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=1400&q=85",

    excerpt:
      "Explore lively beach areas and peaceful tropical escapes around Koh Rong.",

    images: [
      "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1400&q=85",
    ],

    text: "Koh Rong has many beautiful beaches with different atmospheres. Some are close to restaurants and accommodation, while others provide a quieter tropical island experience. Visitors can enjoy swimming, relaxing, photography and sunset views.",
  },

  {
    title: "Koh Rong Snorkeling Guide for Beginners",

    sub_title: "Everything You Need to Know Before Your First Snorkeling Trip",

    thumbnail:
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1400&q=85",

    excerpt: "A beginner-friendly guide to snorkeling around Koh Rong.",

    images: [
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1551244072-5d12893278ab?auto=format&fit=crop&w=1400&q=85",
    ],

    text: "Snorkeling is a popular activity around Koh Rong. Beginners can join guided trips to suitable snorkeling locations. Bring swimwear, sunscreen, drinking water and a towel. Guided tours can also provide equipment and local information.",
  },

  {
    title: "Why You Should Take a Sunset Boat Tour",

    sub_title: "Experience a Relaxing Evening on the Water",

    thumbnail:
      "https://images.unsplash.com/photo-1540202404-a2f29016b523?auto=format&fit=crop&w=1400&q=85",

    excerpt:
      "Enjoy Koh Rong from the water and experience a beautiful tropical sunset.",

    images: [
      "https://images.unsplash.com/photo-1540202404-a2f29016b523?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1499403474843-04e72c14df8a?auto=format&fit=crop&w=1400&q=85",
    ],

    text: "A sunset boat tour is a relaxing way to experience Koh Rong. Travelers can enjoy views of the coastline, spend time on the water and finish the day watching a beautiful sunset over the sea.",
  },

  {
    title: "How to Get Around Koh Rong",

    sub_title: "A Simple Guide to Island Transportation",

    thumbnail:
      "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1400&q=85",

    excerpt:
      "Learn about walking, scooters, tuk tuks and boats around Koh Rong.",

    images: [
      "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1524591652733-73fa1ae7b5ee?auto=format&fit=crop&w=1400&q=85",
    ],

    text: "Getting around Koh Rong depends on where you stay. Walking works well around nearby villages and beaches. Scooters provide more flexibility in accessible areas. Tuk tuks are convenient for longer trips, while some areas can be reached by boat.",
  },

  {
    title: "What to Pack for Your Koh Rong Trip",

    sub_title: "Essential Items for a Comfortable Island Holiday",

    thumbnail:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=85",

    excerpt:
      "Prepare useful items for beaches, boat trips and island adventures.",

    images: [
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1530789253388-582c481c54b0?auto=format&fit=crop&w=1400&q=85",
    ],

    text: "Traveling around an island is easier when you pack light. Useful items include swimwear, lightweight clothing, sunscreen, sunglasses, a hat, comfortable footwear, a reusable water bottle, dry bag and portable charger.",
  },

  {
    title: "A Local Village Experience on Koh Rong",

    sub_title: "Discover Local Culture and Everyday Island Life",

    thumbnail:
      "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=1400&q=85",

    excerpt:
      "Discover local communities and another side of island life on Koh Rong.",

    images: [
      "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=1400&q=85",
    ],

    text: "Koh Rong is more than beaches and resorts. Local communities live and work on the island throughout the year. Visiting villages gives travelers another perspective on island life, culture and local businesses.",
  },

  {
    title: "Best Time to Visit Koh Rong",

    sub_title: "Plan Your Island Holiday Around the Weather",

    thumbnail:
      "https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=1400&q=85",

    excerpt:
      "Learn what weather conditions to consider when planning your Koh Rong holiday.",

    images: [
      "https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=85",
    ],

    text: "Weather can affect beaches, snorkeling, boat trips and transportation around Koh Rong. Clear days are ideal for outdoor activities. Travelers should keep their itinerary flexible and check local conditions before activities.",
  },

  {
    title: "Koh Rong Travel Tips for First-Time Visitors",

    sub_title: "Useful Advice for Your First Trip to the Island",

    thumbnail:
      "https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=1400&q=85",

    excerpt:
      "Useful advice for transportation, payments and activities on your first visit.",

    images: [
      "https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1530789253388-582c481c54b0?auto=format&fit=crop&w=1400&q=85",
    ],

    text: "First-time visitors should confirm their ferry departure, destination pier and accommodation before traveling. Keeping some cash can be useful for smaller businesses. Popular tours may also be easier to book in advance.",
  },

  {
    title: "Plan the Perfect 3-Day Koh Rong Itinerary",

    sub_title: "A Simple Three-Day Plan for Exploring Koh Rong",

    thumbnail:
      "https://images.unsplash.com/photo-1530789253388-582c481c54b0?auto=format&fit=crop&w=1400&q=85",

    excerpt:
      "A simple three-day itinerary combining beaches, tours and local experiences.",

    images: [
      "https://images.unsplash.com/photo-1530789253388-582c481c54b0?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1540202404-a2f29016b523?auto=format&fit=crop&w=1400&q=85",
    ],

    text: "Day one can be spent arriving and relaxing at the beach. On day two, join a boat or snorkeling activity and enjoy the sunset. On day three, explore another part of Koh Rong, visit a local village or relax before departure.",
  },
];

/*
|--------------------------------------------------------------------------
| SEED
|--------------------------------------------------------------------------
*/

async function seedBlogs() {
  try {
    /*
    |--------------------------------------------------------------------------
    | CONNECT
    |--------------------------------------------------------------------------
    */

    await mongoose.connect(MONGODB_URI, {
      autoIndex: false,
    });

    console.log("✅ MongoDB connected");

    /*
    |--------------------------------------------------------------------------
    | RAW COLLECTIONS
    |--------------------------------------------------------------------------
    */

    const blogs = mongoose.connection.collection("blogs");

    const users = mongoose.connection.collection("users");

    /*
    |--------------------------------------------------------------------------
    | SHOW INDEXES
    |--------------------------------------------------------------------------
    */

    let indexes = await blogs.indexes();

    console.log(
      "📋 Blog indexes before cleanup:",
      indexes.map((index) => index.name),
    );

    /*
    |--------------------------------------------------------------------------
    | DROP OLD SLUG INDEX
    |--------------------------------------------------------------------------
    |
    | This is the index causing:
    |
    | E11000 slug: null
    |
    */

    const slugIndex = indexes.find((index) => index.name === "slug_1");

    if (slugIndex) {
      await blogs.dropIndex("slug_1");

      console.log("✅ Removed old blogs.slug_1 index");
    } else {
      console.log("✅ blogs.slug_1 index does not exist");
    }

    /*
    |--------------------------------------------------------------------------
    | VERIFY INDEX REMOVAL
    |--------------------------------------------------------------------------
    */

    indexes = await blogs.indexes();

    console.log(
      "📋 Blog indexes after cleanup:",
      indexes.map((index) => index.name),
    );

    /*
    |--------------------------------------------------------------------------
    | ADMIN
    |--------------------------------------------------------------------------
    */

    const admin = await users.findOne({
      role: {
        $in: ["SUPER_ADMIN", "ADMIN"],
      },
    });

    const adminId = admin?._id || null;

    if (adminId) {
      console.log(`✅ Admin found: ${adminId}`);
    } else {
      console.log("⚠️ No admin found");
    }

    /*
    |--------------------------------------------------------------------------
    | INSERT / UPDATE
    |--------------------------------------------------------------------------
    */

    let created = 0;

    let updated = 0;

    for (const blog of blogSeedData) {
      const now = new Date();

      const slug = makeSlug(blog.title);

      /*
      |--------------------------------------------------------------------------
      | ACTUAL BLOG DOCUMENT
      |--------------------------------------------------------------------------
      */

      const document = {
        title: blog.title,

        slug,

        thumbnail: blog.thumbnail,

        excerpt: blog.excerpt,

        description: blog.excerpt,

        status: "ACTIVE",

        post_detail: [
          {
            sub_title: blog.sub_title,

            text: blog.text,

            images: blog.images,

            video_url: "",

            _id: new mongoose.Types.ObjectId(),
          },
        ],

        updated_at: now,

        ...(adminId
          ? {
              updated_by: adminId,
            }
          : {}),
      };

      /*
      |--------------------------------------------------------------------------
      | FIND EXISTING BY TITLE
      |--------------------------------------------------------------------------
      */

      const existing = await blogs.findOne({
        title: blog.title,
      });

      /*
      |--------------------------------------------------------------------------
      | UPDATE
      |--------------------------------------------------------------------------
      */

      if (existing) {
        await blogs.updateOne(
          {
            _id: existing._id,
          },
          {
            $set: document,
          },
        );

        updated += 1;

        console.log(`🔄 Updated: ${blog.title}`);

        continue;
      }

      /*
      |--------------------------------------------------------------------------
      | CREATE
      |--------------------------------------------------------------------------
      */

      await blogs.insertOne({
        ...document,

        created_at: now,

        ...(adminId
          ? {
              created_by: adminId,
            }
          : {}),
      });

      created += 1;

      console.log(`✅ Created: ${blog.title}`);
    }

    /*
    |--------------------------------------------------------------------------
    | VERIFY TEST DATA
    |--------------------------------------------------------------------------
    */

    const titles = blogSeedData.map((blog) => blog.title);

    const insertedBlogs = await blogs
      .find({
        title: {
          $in: titles,
        },
      })
      .project({
        title: 1,
        slug: 1,
        status: 1,
        thumbnail: 1,
        post_detail: 1,
      })
      .toArray();

    /*
    |--------------------------------------------------------------------------
    | RESULT
    |--------------------------------------------------------------------------
    */

    console.log("");
    console.log("==============================================");

    console.log("🌴 BLOG SEED COMPLETE");

    console.log(`✅ Created: ${created}`);

    console.log(`🔄 Updated: ${updated}`);

    console.log(`📚 Test blogs found: ${insertedBlogs.length}`);

    console.log("==============================================");

    /*
    |--------------------------------------------------------------------------
    | PRINT TEST DATA
    |--------------------------------------------------------------------------
    */

    insertedBlogs.forEach((blog) => {
      console.log("");
      console.log(`📝 ${blog.title}`);

      console.log(`   slug: ${blog.slug}`);

      console.log(`   status: ${blog.status}`);

      console.log(`   sections: ${blog.post_detail?.length || 0}`);
    });

    if (insertedBlogs.length === 10) {
      console.log("");
      console.log("🎉 SUCCESS: All 10 blogs were seeded.");
    } else {
      console.log("");
      console.log(`⚠️ Expected 10 blogs but found ${insertedBlogs.length}.`);
    }
  } catch (error) {
    console.error("");
    console.error("❌ BLOG SEED ERROR:", error);

    if (error?.code === 11000) {
      console.error("Duplicate key:", error.keyValue);

      console.error("Index:", error.keyPattern);
    }

    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();

    console.log("");
    console.log("MongoDB disconnected");
  }
}

/*
|--------------------------------------------------------------------------
| RUN
|--------------------------------------------------------------------------
*/

seedBlogs();
