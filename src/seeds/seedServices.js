import "dotenv/config";

import mongoose from "mongoose";

import User from "../models/User.js";

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
| UNIQUE SLUG
|--------------------------------------------------------------------------
*/

async function getUniqueSlug(collection, title, excludeId = null) {
  const baseSlug = makeSlug(title) || `blog-${Date.now()}`;

  let slug = baseSlug;

  let counter = 2;

  while (true) {
    const query = {
      slug,
    };

    if (excludeId) {
      query._id = {
        $ne: excludeId,
      };
    }

    const exists = await collection.findOne(query, {
      projection: {
        _id: 1,
      },
    });

    if (!exists) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;

    counter += 1;
  }
}

/*
|--------------------------------------------------------------------------
| REPAIR OLD NULL SLUGS
|--------------------------------------------------------------------------
|
| Your collection currently has:
|
| slug_1 unique index
|
| and at least one record has:
|
| slug: null
|
| We repair old records first.
|
*/

async function repairOldBlogSlugs(collection) {
  const oldBlogs = await collection
    .find({
      $or: [
        {
          slug: null,
        },
        {
          slug: "",
        },
        {
          slug: {
            $exists: false,
          },
        },
      ],
    })
    .toArray();

  if (!oldBlogs.length) {
    console.log("✅ No old blogs with missing slug");

    return;
  }

  console.log(`🔧 Found ${oldBlogs.length} old blog(s) without slug`);

  for (const blog of oldBlogs) {
    const slug = await getUniqueSlug(
      collection,
      blog.title || `blog-${blog._id}`,
      blog._id,
    );

    await collection.updateOne(
      {
        _id: blog._id,
      },
      {
        $set: {
          slug,

          updated_at: new Date(),
        },
      },
    );

    console.log(`🔧 Repaired: ${blog.title || blog._id} -> ${slug}`);
  }
}

/*
|--------------------------------------------------------------------------
| TEST BLOG DATA
|--------------------------------------------------------------------------
*/

const blogSeedData = [
  {
    title: "10 Best Things to Do in Koh Rong",

    slug: "10-best-things-to-do-in-koh-rong",

    thumbnail:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=85",

    excerpt:
      "Discover some of the best activities and experiences to enjoy while visiting Koh Rong.",

    post_detail: [
      {
        sub_title: "Discover the Best Activities and Experiences on Koh Rong",

        text: "Koh Rong is one of Cambodia's beautiful island destinations. Visitors can relax on tropical beaches, join boat tours, try snorkeling, explore local villages, enjoy local food, discover quiet coastal areas and watch beautiful sunsets. Whether you want adventure or relaxation, Koh Rong offers activities for many different types of travelers.",

        images: [
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=85",
          "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1400&q=85",
        ],

        video_url: "",
      },
    ],
  },

  {
    title: "A Complete Guide to Koh Rong Beaches",

    slug: "complete-guide-to-koh-rong-beaches",

    thumbnail:
      "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=1400&q=85",

    excerpt:
      "Explore beautiful beaches around Koh Rong, from lively areas to peaceful tropical escapes.",

    post_detail: [
      {
        sub_title: "Explore Beautiful Beaches Around the Island",

        text: "Koh Rong has many beautiful beaches with different atmospheres. Some areas are close to restaurants, guesthouses and activities, while others offer a quieter island experience. Travelers can spend their time swimming, relaxing, taking photos, enjoying beach food or watching the sunset.",

        images: [
          "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=1400&q=85",
          "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1400&q=85",
        ],

        video_url: "",
      },
    ],
  },

  {
    title: "Koh Rong Snorkeling Guide for Beginners",

    slug: "koh-rong-snorkeling-guide-for-beginners",

    thumbnail:
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1400&q=85",

    excerpt:
      "A beginner-friendly guide to enjoying snorkeling around Koh Rong.",

    post_detail: [
      {
        sub_title:
          "Everything You Need to Know Before Your First Snorkeling Trip",

        text: "Snorkeling is one of the popular activities around Koh Rong. Beginners can join guided trips that visit suitable coastal locations. Bring comfortable swimwear, sunscreen, drinking water and a towel. A guided tour can also provide useful information about the snorkeling location and equipment.",

        images: [
          "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1400&q=85",
          "https://images.unsplash.com/photo-1551244072-5d12893278ab?auto=format&fit=crop&w=1400&q=85",
        ],

        video_url: "",
      },
    ],
  },

  {
    title: "Why You Should Take a Sunset Boat Tour",

    slug: "why-you-should-take-a-sunset-boat-tour",

    thumbnail:
      "https://images.unsplash.com/photo-1540202404-a2f29016b523?auto=format&fit=crop&w=1400&q=85",

    excerpt:
      "Experience Koh Rong from the water and enjoy a relaxing island sunset.",

    post_detail: [
      {
        sub_title: "Experience a Relaxing Evening on the Water",

        text: "A sunset boat tour is a relaxing way to see Koh Rong from another perspective. Travelers can enjoy views of the coastline, spend time on the water and finish the day watching the colors of the tropical sunset. Sunset trips are suitable for friends, families and couples.",

        images: [
          "https://images.unsplash.com/photo-1540202404-a2f29016b523?auto=format&fit=crop&w=1400&q=85",
          "https://images.unsplash.com/photo-1499403474843-04e72c14df8a?auto=format&fit=crop&w=1400&q=85",
        ],

        video_url: "",
      },
    ],
  },

  {
    title: "How to Get Around Koh Rong",

    slug: "how-to-get-around-koh-rong",

    thumbnail:
      "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1400&q=85",

    excerpt:
      "Learn about walking, scooters, tuk tuks and boat transportation around Koh Rong.",

    post_detail: [
      {
        sub_title: "A Simple Guide to Island Transportation",

        text: "Getting around Koh Rong depends on where you stay and which places you want to visit. Walking is useful around nearby villages and beaches. Scooters can provide more flexibility in accessible areas. Tuk tuks are convenient for traveling with luggage, while some coastal locations may be easier to reach by boat.",

        images: [
          "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1400&q=85",
          "https://images.unsplash.com/photo-1524591652733-73fa1ae7b5ee?auto=format&fit=crop&w=1400&q=85",
        ],

        video_url: "",
      },
    ],
  },

  {
    title: "What to Pack for Your Koh Rong Trip",

    slug: "what-to-pack-for-your-koh-rong-trip",

    thumbnail:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=85",

    excerpt:
      "Prepare useful items for beaches, boat trips and island activities.",

    post_detail: [
      {
        sub_title: "Essential Items for a Comfortable Island Holiday",

        text: "Traveling around an island is easier when you pack light. Useful items include swimwear, lightweight clothing, sunscreen, sunglasses, a hat, comfortable footwear, a reusable water bottle, a dry bag and a portable charger. Bringing only what you need also makes boat and tuk tuk travel easier.",

        images: [
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=85",
          "https://images.unsplash.com/photo-1530789253388-582c481c54b0?auto=format&fit=crop&w=1400&q=85",
        ],

        video_url: "",
      },
    ],
  },

  {
    title: "A Local Village Experience on Koh Rong",

    slug: "local-village-experience-on-koh-rong",

    thumbnail:
      "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=1400&q=85",

    excerpt:
      "Discover local communities and everyday island life beyond the beaches.",

    post_detail: [
      {
        sub_title: "Discover Local Culture and Everyday Island Life",

        text: "Koh Rong is more than beaches and resorts. Local communities live and work on the island throughout the year. Visiting a village can help travelers learn more about island life, local traditions and businesses. Visitors should always respect homes, community spaces and religious locations.",

        images: [
          "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=1400&q=85",
          "https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=1400&q=85",
        ],

        video_url: "",
      },
    ],
  },

  {
    title: "Best Time to Visit Koh Rong",

    slug: "best-time-to-visit-koh-rong",

    thumbnail:
      "https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=1400&q=85",

    excerpt:
      "Understand what weather and travel conditions to consider when planning a trip to Koh Rong.",

    post_detail: [
      {
        sub_title: "Plan Your Island Holiday Around the Weather",

        text: "Weather can affect beach activities, snorkeling, boat tours and transportation around Koh Rong. Clear days are especially good for spending time outdoors and exploring the coast. During periods of rain, travelers can keep their plans flexible and check local conditions before booking activities.",

        images: [
          "https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=1400&q=85",
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=85",
        ],

        video_url: "",
      },
    ],
  },

  {
    title: "Koh Rong Travel Tips for First-Time Visitors",

    slug: "koh-rong-travel-tips-for-first-time-visitors",

    thumbnail:
      "https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=1400&q=85",

    excerpt:
      "Useful advice for transportation, bookings and your first visit to Koh Rong.",

    post_detail: [
      {
        sub_title: "Useful Advice for Your First Trip to the Island",

        text: "First-time visitors should confirm their ferry departure, destination pier and accommodation location before traveling. Keeping some cash can be useful for smaller businesses and transportation services. During busy periods, booking popular tours and activities ahead of time can also make the trip easier.",

        images: [
          "https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=1400&q=85",
          "https://images.unsplash.com/photo-1530789253388-582c481c54b0?auto=format&fit=crop&w=1400&q=85",
        ],

        video_url: "",
      },
    ],
  },

  {
    title: "Plan the Perfect 3-Day Koh Rong Itinerary",

    slug: "perfect-3-day-koh-rong-itinerary",

    thumbnail:
      "https://images.unsplash.com/photo-1530789253388-582c481c54b0?auto=format&fit=crop&w=1400&q=85",

    excerpt:
      "A simple three-day plan combining beaches, tours and local island experiences.",

    post_detail: [
      {
        sub_title: "A Simple Three-Day Plan for Exploring Koh Rong",

        text: "On day one, arrive on Koh Rong, check into your accommodation and enjoy the beach. On day two, join a boat or snorkeling activity and finish the afternoon with a sunset experience. On day three, explore another part of the island, visit a village, use a tuk tuk or spend more time relaxing before departure.",

        images: [
          "https://images.unsplash.com/photo-1530789253388-582c481c54b0?auto=format&fit=crop&w=1400&q=85",
          "https://images.unsplash.com/photo-1540202404-a2f29016b523?auto=format&fit=crop&w=1400&q=85",
        ],

        video_url: "",
      },
    ],
  },
];

/*
|--------------------------------------------------------------------------
| SEED BLOGS
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
    | RAW BLOG COLLECTION
    |--------------------------------------------------------------------------
    |
    | IMPORTANT:
    |
    | We intentionally do NOT use:
    |
    | Blog.create(...)
    |
    | because your Mongoose Blog schema
    | is removing slug.
    |
    */

    const collection = mongoose.connection.collection("blogs");

    /*
    |--------------------------------------------------------------------------
    | CHECK INDEX
    |--------------------------------------------------------------------------
    */

    const indexes = await collection.indexes();

    console.log(
      "📋 Blog indexes:",
      indexes.map((index) => index.name),
    );

    const slugIndex = indexes.find((index) => index.name === "slug_1");

    if (slugIndex) {
      console.log("✅ slug_1 index exists - seed will use real slug values");
    }

    /*
    |--------------------------------------------------------------------------
    | REPAIR EXISTING NULL SLUG
    |--------------------------------------------------------------------------
    */

    await repairOldBlogSlugs(collection);

    /*
    |--------------------------------------------------------------------------
    | ADMIN
    |--------------------------------------------------------------------------
    */

    const admin = await User.findOne({
      role: {
        $in: ["SUPER_ADMIN", "ADMIN"],
      },
    }).select("_id");

    const adminId = admin?._id || null;

    if (adminId) {
      console.log(`✅ Admin found: ${adminId}`);
    } else {
      console.log("⚠️ No admin found - continuing without admin ID");
    }

    /*
    |--------------------------------------------------------------------------
    | COUNTERS
    |--------------------------------------------------------------------------
    */

    let created = 0;

    let updated = 0;

    /*
    |--------------------------------------------------------------------------
    | INSERT / UPDATE
    |--------------------------------------------------------------------------
    */

    for (const blog of blogSeedData) {
      /*
      |--------------------------------------------------------------------------
      | FIND EXISTING
      |--------------------------------------------------------------------------
      */

      const existing = await collection.findOne({
        $or: [
          {
            slug: blog.slug,
          },
          {
            title: blog.title,
          },
        ],
      });

      const now = new Date();

      /*
      |--------------------------------------------------------------------------
      | DOCUMENT
      |--------------------------------------------------------------------------
      */

      const document = {
        title: blog.title,

        /*
         * Important:
         *
         * This slug is written directly
         * to MongoDB.
         */

        slug: blog.slug,

        thumbnail: blog.thumbnail,

        excerpt: blog.excerpt,

        description: blog.excerpt,

        status: "ACTIVE",

        post_detail: blog.post_detail,

        updated_at: now,

        ...(adminId
          ? {
              updated_by: adminId,
            }
          : {}),
      };

      /*
      |--------------------------------------------------------------------------
      | UPDATE
      |--------------------------------------------------------------------------
      */

      if (existing) {
        /*
         * Ensure slug remains unique.
         */

        let slug = blog.slug;

        const slugOwner = await collection.findOne({
          slug,

          _id: {
            $ne: existing._id,
          },
        });

        if (slugOwner) {
          slug = await getUniqueSlug(collection, blog.title, existing._id);
        }

        await collection.updateOne(
          {
            _id: existing._id,
          },
          {
            $set: {
              ...document,

              slug,
            },
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

      let slug = blog.slug;

      const slugAlreadyExists = await collection.findOne({
        slug,
      });

      if (slugAlreadyExists) {
        slug = await getUniqueSlug(collection, blog.title);
      }

      await collection.insertOne({
        ...document,

        slug,

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
    | VERIFY SEEDED DATA
    |--------------------------------------------------------------------------
    */

    const seededSlugs = blogSeedData.map((blog) => blog.slug);

    const seededBlogs = await collection
      .find({
        slug: {
          $in: seededSlugs,
        },
      })
      .project({
        title: 1,
        slug: 1,
        status: 1,
        thumbnail: 1,
        post_detail: 1,
      })
      .sort({
        title: 1,
      })
      .toArray();

    /*
    |--------------------------------------------------------------------------
    | RESULT
    |--------------------------------------------------------------------------
    */

    console.log("");
    console.log("================================================");

    console.log("🌴 Explore Koh Rong Blog Seed Complete");

    console.log(`✅ Created: ${created}`);

    console.log(`🔄 Updated: ${updated}`);

    console.log(`📝 Seeded blogs found: ${seededBlogs.length}`);

    console.log("================================================");

    /*
    |--------------------------------------------------------------------------
    | TEST OUTPUT
    |--------------------------------------------------------------------------
    */

    for (const blog of seededBlogs) {
      console.log(`✅ ${blog.title}`);

      console.log(`   slug: ${blog.slug}`);

      console.log(`   status: ${blog.status}`);

      console.log(`   post_detail: ${blog.post_detail?.length || 0}`);
    }

    /*
    |--------------------------------------------------------------------------
    | FINAL CHECK
    |--------------------------------------------------------------------------
    */

    if (seededBlogs.length !== blogSeedData.length) {
      console.warn(
        `⚠️ Expected ${blogSeedData.length} blogs but found ${seededBlogs.length}`,
      );
    } else {
      console.log("");
      console.log("🎉 All 10 test blogs are ready");
    }
  } catch (error) {
    console.error("");
    console.error("❌ BLOG SEED ERROR:", error);

    if (error?.code === 11000) {
      console.error("⚠️ Duplicate key:", error.keyValue);

      console.error("⚠️ Index:", error.keyPattern);
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
