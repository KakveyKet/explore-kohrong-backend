import Blog from "../models/Blog.js";

import { asyncHandler } from "../utils/asyncHandler.js";

import { httpError } from "../utils/httpError.js";

/*
|--------------------------------------------------------------------------
| NORMALIZE CHILD POSTS
|--------------------------------------------------------------------------
*/

function normalizePostDetail(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((section) => {
    return {
      sub_title: String(section?.sub_title || "").trim(),

      text: String(section?.text || "").trim(),

      images: Array.isArray(section?.images)
        ? section.images
            .map((image) => String(image || "").trim())
            .filter(Boolean)
        : [],

      video_url: String(section?.video_url || "").trim(),
    };
  });
}

/*
|--------------------------------------------------------------------------
| VALIDATE CHILD POSTS
|--------------------------------------------------------------------------
*/

function validatePostDetail(sections) {
  if (!Array.isArray(sections) || !sections.length) {
    throw httpError(400, "Please add at least one child post.");
  }

  for (let index = 0; index < sections.length; index += 1) {
    const section = sections[index];

    if (!section.sub_title) {
      throw httpError(400, `Child post ${index + 1} title is required.`);
    }

    if (!section.text) {
      throw httpError(400, `Child post ${index + 1} content is required.`);
    }
  }
}

/*
|--------------------------------------------------------------------------
| GET BLOG LIST
|--------------------------------------------------------------------------
|
| Public:
|
| GET /api/blogs
|
| Admin:
|
| GET /api/blogs?all=true
|
*/

export const listBlogs = asyncHandler(async (req, res) => {
  const { all, status, search } = req.query;

  const filter = {};

  /*
   * Normal public website only
   * receives ACTIVE blogs.
   */
  if (all !== "true") {
    filter.status = "ACTIVE";
  }

  /*
   * Admin filter
   */
  if (all === "true" && status && ["ACTIVE", "INACTIVE"].includes(status)) {
    filter.status = status;
  }

  /*
   * Search by title.
   */
  if (search && String(search).trim()) {
    filter.title = {
      $regex: String(search).trim(),

      $options: "i",
    };
  }

  const blogs = await Blog.find(filter)

    .populate("created_by", "username email")

    .populate("updated_by", "username email")

    .sort({
      created_at: -1,
    });

  return res.json({
    success: true,

    count: blogs.length,

    blogs,
  });
});

/*
|--------------------------------------------------------------------------
| GET ONE BLOG
|--------------------------------------------------------------------------
*/

export const getBlog = asyncHandler(async (req, res) => {
  const blog = await Blog.findById(req.params.id)

    .populate("created_by", "username email")

    .populate("updated_by", "username email")

    .populate("blog_comment.user_id", "username email");

  if (!blog) {
    throw httpError(404, "Blog not found");
  }

  return res.json({
    success: true,

    blog,
  });
});

/*
|--------------------------------------------------------------------------
| CREATE BLOG
|--------------------------------------------------------------------------
*/

export const createBlog = asyncHandler(async (req, res) => {
  const { title, thumbnail, post_detail, status } = req.body;

  /*
      |--------------------------------------------------------------------------
      | MAIN TITLE
      |--------------------------------------------------------------------------
      */

  const cleanTitle = String(title || "").trim();

  if (!cleanTitle) {
    throw httpError(400, "Blog title is required.");
  }

  /*
      |--------------------------------------------------------------------------
      | CHILD POSTS
      |--------------------------------------------------------------------------
      */

  const sections = normalizePostDetail(post_detail);

  validatePostDetail(sections);

  /*
      |--------------------------------------------------------------------------
      | CREATE
      |--------------------------------------------------------------------------
      */

  const blog = await Blog.create({
    title: cleanTitle,

    thumbnail: String(thumbnail || "").trim(),

    post_detail: sections,

    status: status === "INACTIVE" ? "INACTIVE" : "ACTIVE",

    created_by: req.user?._id || null,

    updated_by: req.user?._id || null,
  });

  return res.status(201).json({
    success: true,

    message: "Blog created successfully.",

    blog,
  });
});

/*
|--------------------------------------------------------------------------
| UPDATE BLOG
|--------------------------------------------------------------------------
*/

export const updateBlog = asyncHandler(async (req, res) => {
  const blog = await Blog.findById(req.params.id);

  if (!blog) {
    throw httpError(404, "Blog not found");
  }

  /*
      |--------------------------------------------------------------------------
      | TITLE
      |--------------------------------------------------------------------------
      */

  if (req.body.title !== undefined) {
    const title = String(req.body.title || "").trim();

    if (!title) {
      throw httpError(400, "Blog title is required.");
    }

    blog.title = title;
  }

  /*
      |--------------------------------------------------------------------------
      | THUMBNAIL
      |--------------------------------------------------------------------------
      */

  if (req.body.thumbnail !== undefined) {
    blog.thumbnail = String(req.body.thumbnail || "").trim();
  }

  /*
      |--------------------------------------------------------------------------
      | CHILD POSTS
      |--------------------------------------------------------------------------
      */

  if (req.body.post_detail !== undefined) {
    const sections = normalizePostDetail(req.body.post_detail);

    validatePostDetail(sections);

    blog.post_detail = sections;
  }

  /*
      |--------------------------------------------------------------------------
      | STATUS
      |--------------------------------------------------------------------------
      */

  if (req.body.status !== undefined) {
    if (!["ACTIVE", "INACTIVE"].includes(req.body.status)) {
      throw httpError(400, "Invalid blog status.");
    }

    blog.status = req.body.status;
  }

  /*
      |--------------------------------------------------------------------------
      | AUDIT
      |--------------------------------------------------------------------------
      */

  blog.updated_by = req.user?._id || blog.updated_by;

  await blog.save();

  return res.json({
    success: true,

    message: "Blog updated successfully.",

    blog,
  });
});

/*
|--------------------------------------------------------------------------
| DELETE BLOG
|--------------------------------------------------------------------------
*/

export const deleteBlog = asyncHandler(async (req, res) => {
  const blog = await Blog.findById(req.params.id);

  if (!blog) {
    throw httpError(404, "Blog not found");
  }

  await blog.deleteOne();

  return res.json({
    success: true,

    message: "Blog deleted successfully.",
  });
});

/*
|--------------------------------------------------------------------------
| ADD BLOG COMMENT
|--------------------------------------------------------------------------
*/

export const addBlogComment = asyncHandler(async (req, res) => {
  const blog = await Blog.findById(req.params.id);

  if (!blog) {
    throw httpError(404, "Blog not found");
  }

  const text = String(req.body.text || "").trim();

  if (!text) {
    throw httpError(400, "Comment is required.");
  }

  blog.blog_comment.push({
    user_id: req.user._id,

    text,
  });

  await blog.save();

  const fullBlog = await Blog.findById(blog._id).populate(
    "blog_comment.user_id",
    "username email",
  );

  return res.status(201).json({
    success: true,

    message: "Comment added successfully.",

    blog: fullBlog,
  });
});

/*
|--------------------------------------------------------------------------
| DELETE BLOG COMMENT
|--------------------------------------------------------------------------
*/

export const deleteBlogComment = asyncHandler(async (req, res) => {
  const blog = await Blog.findById(req.params.id);

  if (!blog) {
    throw httpError(404, "Blog not found");
  }

  const comment = blog.blog_comment.id(req.params.commentId);

  if (!comment) {
    throw httpError(404, "Comment not found");
  }

  /*
   * Admin or comment owner
   * can remove it.
   */
  const isOwner = String(comment.user_id) === String(req.user._id);

  const isAdmin = ["SUPER_ADMIN", "ADMIN", "STAFF"].includes(req.user.role);

  if (!isOwner && !isAdmin) {
    throw httpError(403, "You cannot delete this comment.");
  }

  comment.deleteOne();

  await blog.save();

  return res.json({
    success: true,

    message: "Comment deleted successfully.",
  });
});
