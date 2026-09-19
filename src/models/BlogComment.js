import mongoose from "mongoose";

const blogCommentSchema = new mongoose.Schema(
  {
    blog_id: {
      type: mongoose.Schema.Types.ObjectId,

      ref: "Blog",

      required: true,

      index: true,
    },

    user_id: {
      type: mongoose.Schema.Types.ObjectId,

      ref: "User",

      required: true,

      index: true,
    },

    comment: {
      type: String,

      required: true,

      trim: true,

      maxlength: 1000,
    },

    status: {
      type: String,

      enum: ["ACTIVE", "INACTIVE"],

      default: "ACTIVE",

      index: true,
    },

    created_at: {
      type: Date,

      default: Date.now,
    },

    updated_at: {
      type: Date,

      default: Date.now,
    },
  },
  {
    versionKey: false,
  },
);

/*
|--------------------------------------------------------------------------
| UPDATE DATE
|--------------------------------------------------------------------------
*/

blogCommentSchema.pre("save", function (next) {
  this.updated_at = new Date();

  next();
});

/*
|--------------------------------------------------------------------------
| INDEX
|--------------------------------------------------------------------------
*/

blogCommentSchema.index({
  blog_id: 1,

  created_at: -1,
});

const BlogComment =
  mongoose.models.BlogComment ||
  mongoose.model("BlogComment", blogCommentSchema);

export default BlogComment;
