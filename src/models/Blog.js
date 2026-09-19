import mongoose from "mongoose";

/*
|--------------------------------------------------------------------------
| BLOG CHILD POST / SECTION
|--------------------------------------------------------------------------
|
| One main Blog can contain many child posts.
|
| Example:
|
| Top 10 Koh Rong Places
|
|   Child #1
|   Top 1 - Long Set Beach
|
|   Child #2
|   Top 2 - Sok San Beach
|
*/

const blogSectionSchema = new mongoose.Schema(
  {
    sub_title: {
      type: String,
      required: true,
      trim: true,
    },

    text: {
      type: String,
      required: true,
      trim: true,
    },

    images: {
      type: [String],
      default: [],
    },

    video_url: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    /*
     * Keep _id for every child post.
     *
     * Example:
     * post_detail[0]._id
     */
    _id: true,
  },
);

/*
|--------------------------------------------------------------------------
| BLOG COMMENT
|--------------------------------------------------------------------------
*/

const blogCommentSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,

      ref: "User",

      required: true,
    },

    text: {
      type: String,
      required: true,
      trim: true,
    },

    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: true,
  },
);

/*
|--------------------------------------------------------------------------
| BLOG
|--------------------------------------------------------------------------
*/

const blogSchema = new mongoose.Schema(
  {
    /*
      |--------------------------------------------------------------------------
      | MAIN TITLE
      |--------------------------------------------------------------------------
      */

    title: {
      type: String,
      required: true,
      trim: true,
    },

    /*
      |--------------------------------------------------------------------------
      | MAIN THUMBNAIL
      |--------------------------------------------------------------------------
      */

    thumbnail: {
      type: String,
      trim: true,
      default: "",
    },

    /*
      |--------------------------------------------------------------------------
      | CHILD POSTS
      |--------------------------------------------------------------------------
      */

    post_detail: {
      type: [blogSectionSchema],

      default: [],

      validate: {
        validator(value) {
          return Array.isArray(value) && value.length > 0;
        },

        message: "Blog must contain at least one child post.",
      },
    },

    /*
      |--------------------------------------------------------------------------
      | COMMENTS
      |--------------------------------------------------------------------------
      */

    blog_comment: {
      type: [blogCommentSchema],
      default: [],
    },

    /*
      |--------------------------------------------------------------------------
      | STATUS
      |--------------------------------------------------------------------------
      */

    status: {
      type: String,

      enum: ["ACTIVE", "INACTIVE"],

      default: "ACTIVE",
    },

    /*
      |--------------------------------------------------------------------------
      | AUDIT
      |--------------------------------------------------------------------------
      */

    created_by: {
      type: mongoose.Schema.Types.ObjectId,

      ref: "User",

      default: null,
    },

    updated_by: {
      type: mongoose.Schema.Types.ObjectId,

      ref: "User",

      default: null,
    },
  },

  {
    timestamps: {
      createdAt: "created_at",

      updatedAt: "updated_at",
    },
  },
);

/*
|--------------------------------------------------------------------------
| INDEX
|--------------------------------------------------------------------------
*/

blogSchema.index({
  status: 1,
  created_at: -1,
});

/*
|--------------------------------------------------------------------------
| MODEL
|--------------------------------------------------------------------------
*/

const Blog = mongoose.model("Blog", blogSchema);

export default Blog;
