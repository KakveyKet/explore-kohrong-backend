// src/seeds/seedBlogs.js

import "dotenv/config";

import mongoose from "mongoose";

import Blog from "../models/Blog.js";
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
| SCHEMA HELPERS
|--------------------------------------------------------------------------
*/

function hasPath(path) {
  return Boolean(Blog.schema.path(path));
}

function getPath(path) {
  return Blog.schema.path(path);
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
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/*
|--------------------------------------------------------------------------
| BLOG STATUS
|--------------------------------------------------------------------------
|
| Supports your schema even if the status enum is:
|
| ACTIVE / INACTIVE
|
| or
|
| PUBLISHED / DRAFT
|
*/

function getPublishedStatus() {
  const statusPath = getPath("status");

  const values = statusPath?.options?.enum || statusPath?.enumValues || [];

  if (values.includes("ACTIVE")) {
    return "ACTIVE";
  }

  if (values.includes("PUBLISHED")) {
    return "PUBLISHED";
  }

  if (values.length) {
    return values[0];
  }

  return "ACTIVE";
}

/*
|--------------------------------------------------------------------------
| COVER FIELD
|--------------------------------------------------------------------------
|
| Supports:
|
| thumbnail
| cover_image
| cover
| image
|
*/

function getCoverField() {
  const possibleFields = ["thumbnail", "cover_image", "cover", "image"];

  return possibleFields.find((field) => hasPath(field)) || null;
}

/*
|--------------------------------------------------------------------------
| EXCERPT FIELD
|--------------------------------------------------------------------------
|
| Supports:
|
| excerpt
| description
| summary
|
*/

function getExcerptField() {
  const possibleFields = ["excerpt", "description", "summary"];

  return possibleFields.find((field) => hasPath(field)) || null;
}

/*
|--------------------------------------------------------------------------
| CLEAN HTML
|--------------------------------------------------------------------------
*/

function cleanHtml(value) {
  return String(value || "")
    .replace(/\n\s+/g, "\n")
    .trim();
}

/*
|--------------------------------------------------------------------------
| BLOG DATA
|--------------------------------------------------------------------------
*/

const blogs = [
  /*
  |--------------------------------------------------------------------------
  | BLOG 1
  |--------------------------------------------------------------------------
  */

  {
    title: "Discover Koh Rong’s Local Villages and Island Culture",

    excerpt:
      "Explore Koh Rong beyond the beaches by discovering its fishing villages, mangrove communities, pagodas, and traditional island life.",

    subTitle:
      "Discover the communities, traditions, and local culture of Koh Rong.",

    content: `
      <p>
        Koh Rong, Cambodia’s tropical gem, offers much more than beautiful
        beaches. The island is also home to vibrant local communities where
        visitors can discover traditional island life, culture, and sustainable
        practices.
      </p>

      <h2>Lottoek Trey Fishing Village</h2>

      <p>
        <strong>Lottoek Trey fishing village</strong> is one of Koh Rong’s
        local communities where visitors can experience the traditional
        lifestyle of people living on the island.
      </p>

      <p>
        Fishing remains an important part of local life and gives travelers an
        opportunity to discover another side of Koh Rong beyond its beaches
        and tourism areas.
      </p>

      <h2>Prek Tasok Mangrove Community</h2>

      <p>
        <strong>Prek Tasok mangrove community</strong> showcases both local
        community life and Koh Rong’s natural environment.
      </p>

      <p>
        The mangrove area highlights the connection between local communities,
        nature, and sustainable practices on the island.
      </p>

      <h2>Preak Svay Village</h2>

      <p>
        <strong>Preak Svay Village</strong> offers local charm, peaceful
        surroundings, and serene pagodas.
      </p>

      <p>
        Visiting Lottoek Trey, Prek Tasok, and Preak Svay gives travelers an
        opportunity to better understand the culture, traditions, and daily
        life of Koh Rong.
      </p>

      <p>
        Koh Rong is not only a destination for beaches and adventure. Its
        communities and local culture are also an important part of what makes
        the island special.
      </p>
    `,

    thumbnail: "",

    images: [],

    videoUrl: "",
  },

  /*
  |--------------------------------------------------------------------------
  | BLOG 2
  |--------------------------------------------------------------------------
  */

  {
    title: "Beautiful Beaches and Natural Wonders of Koh Rong",

    excerpt:
      "Discover Koh Rong’s beautiful beaches, rainy-season waterfalls, fresh streams, and magical bioluminescent plankton.",

    subTitle:
      "Explore the beaches and natural beauty that make Koh Rong special.",

    content: `
      <p>
        Koh Rong is one of Cambodia’s tropical gems, surrounded by beautiful
        beaches, lush jungle, and stunning natural scenery.
      </p>

      <p>
        The island is an ideal destination for travelers looking for
        relaxation, nature, and adventure.
      </p>

      <h2>Beautiful Beaches of Koh Rong</h2>

      <p>
        Koh Rong features many beautiful beaches, including:
      </p>

      <ul>
        <li><strong>Pagoda Beach</strong></li>
        <li><strong>Coconut Beach</strong></li>
        <li><strong>Palm Beach</strong></li>
        <li><strong>Sok San Long Beach</strong></li>
        <li><strong>Paradise Beach</strong></li>
        <li><strong>Lonely Beach</strong></li>
      </ul>

      <p>
        These beaches offer different experiences for visitors who want to
        relax, explore the coastline, or enjoy the tropical surroundings of
        Koh Rong.
      </p>

      <h2>Rainy Season Waterfalls and Streams</h2>

      <p>
        During the rainy season, Koh Rong becomes even greener and more
        beautiful.
      </p>

      <p>
        Waterfalls and fresh streams add another natural experience to the
        island and make its jungle environment especially attractive during
        this season.
      </p>

      <h2>Bioluminescent Plankton</h2>

      <p>
        At night, visitors may experience one of Koh Rong’s most magical
        natural attractions:
        <strong>bioluminescent plankton</strong>.
      </p>

      <p>
        The glowing plankton can create a beautiful effect along the shore,
        giving travelers a memorable nighttime experience.
      </p>

      <p>
        From tropical beaches and jungle scenery to streams, waterfalls, and
        glowing plankton, Koh Rong offers natural beauty throughout both the
        day and night.
      </p>
    `,

    thumbnail: "",

    images: [],

    videoUrl: "",
  },

  /*
  |--------------------------------------------------------------------------
  | BLOG 3
  |--------------------------------------------------------------------------
  */

  {
    title: "Best Activities and Adventures to Experience on Koh Rong",

    excerpt:
      "From boat trips and snorkeling to scooter rides, jungle trekking, kayaking, and fishing, Koh Rong offers activities for every type of traveler.",

    subTitle: "Discover exciting ways to explore Koh Rong by land and sea.",

    content: `
      <p>
        Koh Rong offers a wide variety of activities for travelers who want
        to explore the island, discover its coastline, and enjoy outdoor
        adventures.
      </p>

      <h2>Explore Koh Rong by Tuk Tuk or Scooter</h2>

      <p>
        <strong>Tuk Tuk and scooter rentals</strong> are convenient ways to
        travel around Koh Rong and discover different areas of the island.
      </p>

      <p>
        Visitors can use them to reach beaches, villages, local communities,
        and other interesting places around Koh Rong.
      </p>

      <h2>Boat Trips and Island Hopping</h2>

      <p>
        <strong>Boat trips and island hopping</strong> are great ways to
        experience Koh Rong from the water.
      </p>

      <p>
        Travelers can discover different parts of the coastline and enjoy the
        tropical surroundings of the island.
      </p>

      <h2>Snorkeling and Diving</h2>

      <p>
        Koh Rong also offers opportunities for
        <strong>snorkeling and diving</strong>.
      </p>

      <p>
        These activities allow travelers to explore the waters around the
        island and enjoy another side of Koh Rong’s natural environment.
      </p>

      <h2>Kayaking</h2>

      <p>
        <strong>Kayaking</strong> gives visitors another way to explore the
        coastal areas while enjoying the peaceful surroundings of the island.
      </p>

      <h2>Jungle Trekking</h2>

      <p>
        Travelers who enjoy land-based adventures can experience
        <strong>jungle trekking</strong> through Koh Rong’s lush natural
        environment.
      </p>

      <p>
        Trekking provides a different view of the island beyond its beaches
        and coastal areas.
      </p>

      <h2>Fishing Tours</h2>

      <p>
        <strong>Fishing tours</strong> are another experience available on
        Koh Rong and are closely connected with traditional island life.
      </p>

      <p>
        With its natural beauty, cultural richness, and eco-tourism potential,
        Koh Rong offers a strong combination of adventure, relaxation, and
        sustainable travel experiences.
      </p>
    `,

    thumbnail: "",

    images: [],

    videoUrl: "",
  },
];

/*
|--------------------------------------------------------------------------
| FIND ADMIN
|--------------------------------------------------------------------------
*/

async function findAdmin() {
  const admin = await User.findOne({
    role: {
      $in: ["SUPER_ADMIN", "ADMIN"],
    },
  }).select("_id username email role");

  if (!admin) {
    console.log("⚠️ No SUPER_ADMIN or ADMIN user found.");

    console.log("ℹ️ Blogs will be seeded without created_by / updated_by.");

    return null;
  }

  console.log(
    `✅ Blog author: ${
      admin.username || admin.email || admin._id
    } (${admin.role})`,
  );

  return admin;
}

/*
|--------------------------------------------------------------------------
| BUILD BLOG PAYLOAD
|--------------------------------------------------------------------------
*/

function buildBlogPayload(blog, adminId, isNew = false) {
  const payload = {};

  /*
  |--------------------------------------------------------------------------
  | TITLE
  |--------------------------------------------------------------------------
  */

  payload.title = blog.title;

  /*
  |--------------------------------------------------------------------------
  | SLUG
  |--------------------------------------------------------------------------
  */

  if (hasPath("slug")) {
    payload.slug = makeSlug(blog.title);
  }

  /*
  |--------------------------------------------------------------------------
  | STATUS
  |--------------------------------------------------------------------------
  */

  if (hasPath("status")) {
    payload.status = getPublishedStatus();
  }

  /*
  |--------------------------------------------------------------------------
  | EXCERPT / DESCRIPTION / SUMMARY
  |--------------------------------------------------------------------------
  */

  const excerptField = getExcerptField();

  if (excerptField) {
    payload[excerptField] = blog.excerpt;
  }

  /*
  |--------------------------------------------------------------------------
  | TOP-LEVEL CONTENT
  |--------------------------------------------------------------------------
  */

  if (hasPath("content")) {
    payload.content = cleanHtml(blog.content);
  }

  /*
  |--------------------------------------------------------------------------
  | POST DETAIL
  |--------------------------------------------------------------------------
  |
  | Your current Blog model uses post_detail.
  |
  */

  if (hasPath("post_detail")) {
    payload.post_detail = [
      {
        sub_title: blog.subTitle || blog.title,

        text: cleanHtml(blog.content),

        images:
          Array.isArray(blog.images) && blog.images.length
            ? blog.images
            : blog.thumbnail
              ? [blog.thumbnail]
              : [],

        video_url: blog.videoUrl || "",
      },
    ];
  }

  /*
  |--------------------------------------------------------------------------
  | COVER
  |--------------------------------------------------------------------------
  */

  const coverField = getCoverField();

  if (coverField) {
    payload[coverField] = blog.thumbnail || "";
  }

  /*
  |--------------------------------------------------------------------------
  | IMAGES
  |--------------------------------------------------------------------------
  */

  if (hasPath("images")) {
    payload.images = Array.isArray(blog.images) ? blog.images : [];
  }

  /*
  |--------------------------------------------------------------------------
  | VIDEO
  |--------------------------------------------------------------------------
  */

  if (hasPath("video_url")) {
    payload.video_url = blog.videoUrl || "";
  }

  if (hasPath("video")) {
    payload.video = blog.videoUrl || "";
  }

  /*
  |--------------------------------------------------------------------------
  | AUTHOR
  |--------------------------------------------------------------------------
  */

  if (adminId && hasPath("updated_by")) {
    payload.updated_by = adminId;
  }

  if (isNew && adminId && hasPath("created_by")) {
    payload.created_by = adminId;
  }

  /*
  |--------------------------------------------------------------------------
  | TIMESTAMPS
  |--------------------------------------------------------------------------
  */

  if (hasPath("updated_at")) {
    payload.updated_at = new Date();
  }

  if (isNew && hasPath("created_at")) {
    payload.created_at = new Date();
  }

  return payload;
}

/*
|--------------------------------------------------------------------------
| CREATE OR UPDATE BLOG
|--------------------------------------------------------------------------
*/

async function createOrUpdateBlog(blog, adminId) {
  const slug = makeSlug(blog.title);

  /*
  |--------------------------------------------------------------------------
  | SEARCH
  |--------------------------------------------------------------------------
  */

  let existingBlog = null;

  if (hasPath("slug")) {
    existingBlog = await Blog.findOne({
      $or: [
        {
          slug,
        },

        {
          title: blog.title,
        },
      ],
    });
  } else {
    existingBlog = await Blog.findOne({
      title: blog.title,
    });
  }

  /*
  |--------------------------------------------------------------------------
  | UPDATE
  |--------------------------------------------------------------------------
  */

  if (existingBlog) {
    const payload = buildBlogPayload(blog, adminId, false);

    await Blog.updateOne(
      {
        _id: existingBlog._id,
      },

      {
        $set: payload,
      },

      {
        runValidators: true,
      },
    );

    console.log(`🔄 Updated blog: ${blog.title}`);

    return;
  }

  /*
  |--------------------------------------------------------------------------
  | CREATE
  |--------------------------------------------------------------------------
  */

  const payload = buildBlogPayload(blog, adminId, true);

  await Blog.create(payload);

  console.log(`✅ Created blog: ${blog.title}`);
}

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

    console.log("");
    console.log("✅ MongoDB connected");
    console.log("");

    /*
    |--------------------------------------------------------------------------
    | ADMIN
    |--------------------------------------------------------------------------
    */

    const admin = await findAdmin();

    const adminId = admin?._id || null;

    /*
    |--------------------------------------------------------------------------
    | SEED
    |--------------------------------------------------------------------------
    */

    console.log("");
    console.log("🌴 Seeding Explore Koh Rong blogs...");
    console.log("");

    for (const blog of blogs) {
      await createOrUpdateBlog(blog, adminId);
    }

    /*
    |--------------------------------------------------------------------------
    | RESULT
    |--------------------------------------------------------------------------
    */

    console.log("");
    console.log("==============================================");

    console.log("🌴 Explore Koh Rong Blog Seed Complete");

    console.log("==============================================");

    console.log("");

    console.log("1. Discover Koh Rong’s Local Villages and Island Culture");

    console.log("2. Beautiful Beaches and Natural Wonders of Koh Rong");

    console.log("3. Best Activities and Adventures to Experience on Koh Rong");

    console.log("");
  } catch (error) {
    console.error("");

    console.error("❌ BLOG SEED ERROR");

    console.error(error);

    console.error("");

    process.exitCode = 1;
  } finally {
    /*
    |--------------------------------------------------------------------------
    | DISCONNECT
    |--------------------------------------------------------------------------
    */

    await mongoose.disconnect();

    console.log("🔌 MongoDB disconnected");
  }
}

/*
|--------------------------------------------------------------------------
| RUN
|--------------------------------------------------------------------------
*/

seedBlogs();
