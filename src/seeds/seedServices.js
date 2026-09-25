import "dotenv/config";

import mongoose from "mongoose";

import Category from "../models/Category.js";
import Service from "../models/Service.js";
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
| HELPERS
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
| REMOVE OLD SERVICE SLUG INDEX
|--------------------------------------------------------------------------
|
| Your current Service model does not use slug.
| This prevents an old services.slug_1 unique index from causing problems.
|
*/

async function dropOldSlugIndex() {
  try {
    const indexes = await Service.collection.indexes();

    const slugIndex = indexes.find(
      (index) =>
        index.name === "slug_1" ||
        Object.prototype.hasOwnProperty.call(index.key || {}, "slug"),
    );

    if (!slugIndex) {
      console.log("ℹ️ No old service slug index found.");
      return;
    }

    await Service.collection.dropIndex(slugIndex.name);

    console.log(`🗑️ Removed old service index: ${slugIndex.name}`);
  } catch (error) {
    if (
      error?.codeName === "IndexNotFound" ||
      String(error?.message || "").includes("index not found")
    ) {
      return;
    }

    throw error;
  }
}

/*
|--------------------------------------------------------------------------
| CATEGORY
|--------------------------------------------------------------------------
*/

async function getOrCreateCategory(name, slug, adminId) {
  let category = await Category.findOne({
    $or: [{ name }, { slug }],
  });

  if (category) {
    /*
     * Keep category active.
     */
    category.name = name;
    category.slug = slug;
    category.status = "ACTIVE";
    category.updated_at = new Date();

    if (adminId) {
      category.updated_by = adminId;
    }

    await category.save();

    return category;
  }

  const payload = {
    name,
    slug: slug || makeSlug(name),
    status: "ACTIVE",
    created_at: new Date(),
    updated_at: new Date(),
  };

  if (adminId) {
    payload.created_by = adminId;
    payload.updated_by = adminId;
  }

  category = await Category.create(payload);

  console.log(`✅ Category created: ${name}`);

  return category;
}

/*
|--------------------------------------------------------------------------
| SERVICE UPSERT
|--------------------------------------------------------------------------
*/

async function createOrUpdateService(serviceData, adminId) {
  const existing = await Service.findOne({
    name: serviceData.name,
  });

  const payload = {
    cate_id: serviceData.cate_id,

    name: serviceData.name,

    price: serviceData.price,

    description: serviceData.description,

    thumbnail: serviceData.thumbnail || "",

    images: Array.isArray(serviceData.images) ? serviceData.images : [],

    status: "ACTIVE",

    updated_at: new Date(),
  };

  if (adminId) {
    payload.updated_by = adminId;
  }

  /*
  |--------------------------------------------------------------------------
  | UPDATE
  |--------------------------------------------------------------------------
  */

  if (existing) {
    await Service.updateOne(
      {
        _id: existing._id,
      },
      {
        $set: payload,
      },
      {
        runValidators: true,
      },
    );

    console.log(`🔄 Updated: ${serviceData.name}`);

    return;
  }

  /*
  |--------------------------------------------------------------------------
  | CREATE
  |--------------------------------------------------------------------------
  */

  payload.created_at = new Date();

  if (adminId) {
    payload.created_by = adminId;
  }

  await Service.create(payload);

  console.log(`✅ Created: ${serviceData.name}`);
}

/*
|--------------------------------------------------------------------------
| SEED
|--------------------------------------------------------------------------
*/

async function seedServices() {
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
    | CLEAN OLD INDEX
    |--------------------------------------------------------------------------
    */

    await dropOldSlugIndex();

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
      console.log("⚠️ No admin found. Services will still be seeded.");
    }

    /*
    |--------------------------------------------------------------------------
    | CATEGORIES
    |--------------------------------------------------------------------------
    */

    const toursCategory = await getOrCreateCategory("Tours", "tours", adminId);

    const transportCategory = await getOrCreateCategory(
      "Transport",
      "transport",
      adminId,
    );

    const rentalCategory = await getOrCreateCategory(
      "Rental",
      "rental",
      adminId,
    );

    /*
    |--------------------------------------------------------------------------
    | SERVICE DATA
    |--------------------------------------------------------------------------
    */

    const services = [
      /*
      |--------------------------------------------------------------------------
      | 1. TUK TUK & TRANSFER
      |--------------------------------------------------------------------------
      */

      {
        cate_id: transportCategory._id,

        name: "Explore Koh Rong Tuk Tuk & Transfer",

        price: 7.5,

        description: `
          <h3>Explore Koh Rong Tuk Tuk & Transfer Prices</h3>

          <h4>One-Way Transfers</h4>

          <ul>
            <li>Pagoda ➝ Longset: <strong>$7.50</strong></li>
            <li>Pagoda Beach ➝ Koh Touch: <strong>$15</strong></li>
            <li>Pagoda Beach ➝ Palm Beach: <strong>$10</strong></li>
            <li>Pagoda ➝ Preaek Svay: <strong>$15</strong></li>
            <li>Pagoda ➝ Sok San: <strong>$10</strong></li>
          </ul>

          <h4>Tuk Tuk Tour – 3 to 4 People</h4>

          <p>
            <strong>Duration:</strong> 5 Hours
          </p>

          <p>
            <strong>Price:</strong> $45
          </p>

          <h4>Includes</h4>

          <ul>
            <li>
              Visit the <strong>Mangroves</strong>,
              <strong>Palm Beach</strong>, and
              <strong>Preaek Svay</strong>.
            </li>

            <li>
              Stop by the <strong>Pagoda</strong> and
              <strong>Floating Village</strong>.
            </li>

            <li>
              Continue along the beautiful beaches to
              <strong>Sok San</strong>.
            </li>

            <li>
              Enjoy a walk along the <strong>beach and hills</strong>.
            </li>

            <li>
              Finish the tour at <strong>Koh Touch</strong>.
            </li>
          </ul>
        `,

        thumbnail: "",

        images: [],
      },

      /*
      |--------------------------------------------------------------------------
      | 2. PRIVATE BOAT
      |--------------------------------------------------------------------------
      */

      {
        cate_id: toursCategory._id,

        name: "Private Boat Trip",

        price: 85,

        description: `
          <h3>Private Boat Trip</h3>

          <p>
            Enjoy a private boat trip around Koh Rong for
            <strong>4 to 6 people</strong>.
          </p>

          <p>
            The private boat trip costs <strong>$85</strong>.
          </p>

          <h4>Includes</h4>

          <ul>
            <li>Two snorkeling spots</li>
            <li>Fishing</li>
            <li>Drinking water</li>
          </ul>

          <p>
            A great option for families, friends, or small groups who want
            to explore the island by private boat.
          </p>
        `,

        thumbnail: "",

        images: [],
      },

      /*
      |--------------------------------------------------------------------------
      | 3. SHARING BOAT
      |--------------------------------------------------------------------------
      */

      {
        cate_id: toursCategory._id,

        name: "Sharing Boat Trip",

        price: 25,

        description: `
          <h3>Sharing Boat Trip</h3>

          <p>
            Join our sharing boat trip for
            <strong>$25 per person</strong>.
          </p>

          <h4>Includes</h4>

          <ul>
            <li>Two snorkeling spots</li>
            <li>Lunch</li>
            <li>Soft drinks</li>
            <li>Fresh fruits</li>
            <li>Tea</li>
            <li>Coffee</li>
          </ul>

          <p>
            Enjoy a relaxing day on the water while discovering beautiful
            snorkeling locations around Koh Rong.
          </p>
        `,

        thumbnail: "",

        images: [],
      },

      /*
      |--------------------------------------------------------------------------
      | 4. SCOOTER RENTAL
      |--------------------------------------------------------------------------
      */

      {
        cate_id: rentalCategory._id,

        name: "Scooter Rental",

        price: 13,

        description: `
          <h3>Scooter Rental – $13</h3>

          <p>
            Rent a scooter for <strong>$13</strong>.
          </p>

          <p>
            <strong>Helmet and fuel are included.</strong>
          </p>

          <p>
            The scooter is for two people only. Please always ride on the
            right side of the road.
          </p>

          <p>
            No driving license is required, but you must be confident when
            riding.
          </p>

          <p>
            We are not responsible for any damage or injury. Guests are
            responsible for any incident or damage that happens to the
            scooter.
          </p>
        `,

        thumbnail: "",

        images: [],
      },

      /*
      |--------------------------------------------------------------------------
      | 5. BIKE RENTAL
      |--------------------------------------------------------------------------
      */

      {
        cate_id: rentalCategory._id,

        name: "Bike Rental",

        price: 7,

        description: `
          <h3>Bike Rental – $7 Per Day</h3>

          <p>
            You can rent a bike for <strong>$7 per day</strong> to explore
            Koh Rong at your own pace.
          </p>

          <p>
            Helmets are available if you need one.
          </p>

          <p>
            Please take care of the bike and return it in the same condition.
            Any damage or loss will be your responsibility.
          </p>

          <p>
            Always ride safely and keep on the right side of the road.
            No license is required.
          </p>

          <p>
            Enjoy your ride around the island.
          </p>
        `,

        thumbnail: "",

        images: [],
      },

      /*
      |--------------------------------------------------------------------------
      | 6. PAGODA LOCAL GUIDE
      |--------------------------------------------------------------------------
      */

      {
        cate_id: toursCategory._id,

        name: "Visit Pagoda with a Local Guide",

        price: 2.5,

        description: `
          <h3>Visit Pagoda with a Local Guide</h3>

          <p>
            Join our local tour to visit a beautiful pagoda near
            <strong>Pagoda Beach</strong>.
          </p>

          <p>
            The pagoda represents both <strong>Hinduism</strong> and
            <strong>Buddhism</strong>. During the tour, you will learn how
            these two religions have blended together in Cambodian culture
            and why this special pagoda gave Pagoda Beach its name.
          </p>

          <p>
            If you visit Pagoda Beach, don't miss this unique opportunity.
            <strong>Explore Koh Rong</strong> will guide you.
          </p>

          <h4>Price</h4>

          <p>
            <strong>$2.50 per person</strong>
          </p>

          <h4>Tour Schedule</h4>

          <ul>
            <li>9:00 AM – 11:00 AM</li>
            <li>11:00 AM – 1:00 PM</li>
          </ul>

          <h4>Group Size</h4>

          <p>
            Maximum <strong>6 people per tour</strong>.
          </p>

          <p>
            Please feel free to contact us for more information.
          </p>
        `,

        thumbnail: "",

        images: [],
      },
    ];

    /*
    |--------------------------------------------------------------------------
    | CREATE / UPDATE SERVICES
    |--------------------------------------------------------------------------
    */

    console.log("");
    console.log("🌴 Seeding Explore Koh Rong services...");
    console.log("");

    for (const service of services) {
      await createOrUpdateService(service, adminId);
    }

    /*
    |--------------------------------------------------------------------------
    | RESULT
    |--------------------------------------------------------------------------
    */

    console.log("");
    console.log("==============================================");
    console.log("🌴 Explore Koh Rong Service Seed Complete");
    console.log("==============================================");
    console.log("");

    console.log("Services:");
    console.log("1. Explore Koh Rong Tuk Tuk & Transfer");
    console.log("2. Private Boat Trip");
    console.log("3. Sharing Boat Trip");
    console.log("4. Scooter Rental");
    console.log("5. Bike Rental");
    console.log("6. Visit Pagoda with a Local Guide");
    console.log("");
  } catch (error) {
    console.error("");
    console.error("❌ SERVICE SEED ERROR");
    console.error(error);
    console.error("");

    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();

    console.log("🔌 MongoDB disconnected");
  }
}

/*
|--------------------------------------------------------------------------
| RUN
|--------------------------------------------------------------------------
*/

seedServices();
