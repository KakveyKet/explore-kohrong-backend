// src/controllers/blogController.js

import mongoose from "mongoose";

import Blog from "../models/Blog.js";

import { asyncHandler } from "../utils/asyncHandler.js";
import { httpError } from "../utils/httpError.js";

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function hasPath(path) {
  return Boolean(Blog.schema.path(path));
}

/*
|--------------------------------------------------------------------------
| CURRENT USER ID
|--------------------------------------------------------------------------
*/

function currentUserId(req) {
  return req.user?._id || req.user?.id || null;
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
| PARSE JSON VALUE
|--------------------------------------------------------------------------
|
| Useful if the frontend sends arrays/objects as JSON strings.
|
*/

function parseMaybeJson(value) {
  if (typeof value !== "string") {
    return value;
  }

  const text = value.trim();

  if (!text) {
    return value;
  }

  if (!text.startsWith("[") && !text.startsWith("{")) {
    return value;
  }

  try {
    return JSON.parse(text);
  } catch {
    return value;
  }
}

/*
|--------------------------------------------------------------------------
| PUBLISHED / ACTIVE STATUS
|--------------------------------------------------------------------------
*/

function publicStatus() {
  const path = Blog.schema.path("status");

  const values = path?.enumValues || path?.options?.enum || [];

  if (values.includes("ACTIVE")) {
    return "ACTIVE";
  }

  if (values.includes("PUBLISHED")) {
    return "PUBLISHED";
  }

  return null;
}

/*
|--------------------------------------------------------------------------
| BUILD PAYLOAD
|--------------------------------------------------------------------------
|
| Only fields that actually exist in Blog schema are written.
|
*/

function buildPayload(body = {}) {
  const payload = {};

  /*
  |--------------------------------------------------------------------------
  | SIMPLE FIELDS
  |--------------------------------------------------------------------------
  */

  const simpleFields = [
    "title",
    "excerpt",
    "description",
    "summary",
    "content",
    "thumbnail",
    "cover_image",
    "cover",
    "image",
    "video",
    "video_url",
    "status",
  ];

  for (const field of simpleFields) {
    if (hasPath(field) && body[field] !== undefined) {
      payload[field] = body[field];
    }
  }

  /*
  |--------------------------------------------------------------------------
  | IMAGES
  |--------------------------------------------------------------------------
  */

  if (hasPath("images") && body.images !== undefined) {
    const images = parseMaybeJson(body.images);

    payload.images = Array.isArray(images) ? images : [];
  }

  /*
  |--------------------------------------------------------------------------
  | POST DETAIL
  |--------------------------------------------------------------------------
  */

  if (hasPath("post_detail") && body.post_detail !== undefined) {
    const postDetail = parseMaybeJson(body.post_detail);

    payload.post_detail = Array.isArray(postDetail)
      ? postDetail
      : postDetail
        ? [postDetail]
        : [];
  }

  /*
  |--------------------------------------------------------------------------
  | SLUG
  |--------------------------------------------------------------------------
  */

  if (hasPath("slug")) {
    if (body.slug !== undefined) {
      payload.slug = makeSlug(body.slug);
    } else if (body.title !== undefined) {
      payload.slug = makeSlug(body.title);
    }
  }

  return payload;
}

/*
|--------------------------------------------------------------------------
| LIST BLOGS
|--------------------------------------------------------------------------
|
| GET /api/blogs
|
| Public:
| GET /api/blogs
|
| Admin:
| GET /api/blogs?all=true
|
*/

export const listBlogs = asyncHandler(async (req, res) => {
  const query = {};

  const showAll = String(req.query.all || "").toLowerCase() === "true";

  /*
   * Public request:
   * show active/published blogs only.
   */

  if (!showAll && hasPath("status")) {
    const status = publicStatus();

    if (status) {
      query.status = status;
    }
  }

  const blogs = await Blog.find(query)
    .sort({
      created_at: -1,
      _id: -1,
    })
    .lean();

  return res.status(200).json({
    blogs,
  });
});

/*
|--------------------------------------------------------------------------
| GET BLOG
|--------------------------------------------------------------------------
|
| GET /api/blogs/:id
|
| Supports:
| - MongoDB ObjectId
| - slug when Blog schema has slug
|
*/

export const getBlog = asyncHandler(async (req, res) => {
  const value = String(req.params.id || "").trim();

  if (!value) {
    throw httpError(400, "Blog ID is required.");
  }

  let blog = null;

  /*
   * MongoDB ID.
   */

  if (mongoose.isValidObjectId(value)) {
    blog = await Blog.findById(value);
  }

  /*
   * Slug fallback.
   */

  if (!blog && hasPath("slug")) {
    blog = await Blog.findOne({
      slug: value,
    });
  }

  if (!blog) {
    throw httpError(404, "Blog not found.");
  }

  return res.status(200).json({
    blog,
  });
});

/*
|--------------------------------------------------------------------------
| CREATE BLOG
|--------------------------------------------------------------------------
|
| POST /api/blogs
|
*/

export const createBlog = asyncHandler(async (req, res) => {
  const title = String(req.body?.title || "").trim();

  if (!title) {
    throw httpError(400, "Blog title is required.");
  }

  /*
    |--------------------------------------------------------------------------
    | PAYLOAD
    |--------------------------------------------------------------------------
    */

  const payload = buildPayload({
    ...req.body,
    title,
  });

  /*
    |--------------------------------------------------------------------------
    | STATUS
    |--------------------------------------------------------------------------
    */

  if (hasPath("status") && !payload.status) {
    const status = publicStatus();

    if (status) {
      payload.status = status;
    }
  }

  /*
    |--------------------------------------------------------------------------
    | USER
    |--------------------------------------------------------------------------
    */

  const userId = currentUserId(req);

  if (userId && hasPath("created_by")) {
    payload.created_by = userId;
  }

  if (userId && hasPath("updated_by")) {
    payload.updated_by = userId;
  }

  /*
    |--------------------------------------------------------------------------
    | DATE
    |--------------------------------------------------------------------------
    */

  const now = new Date();

  if (hasPath("created_at")) {
    payload.created_at = now;
  }

  if (hasPath("updated_at")) {
    payload.updated_at = now;
  }

  /*
    |--------------------------------------------------------------------------
    | CREATE
    |--------------------------------------------------------------------------
    */

  const blog = await Blog.create(payload);

  return res.status(201).json({
    message: "Blog created successfully.",
    blog,
  });
});

/*
|--------------------------------------------------------------------------
| UPDATE BLOG
|--------------------------------------------------------------------------
|
| PATCH /api/blogs/:id
|
| This fixes your current production error:
|
| ReferenceError: mongoose is not defined
|
*/

export const updateBlog = asyncHandler(async (req, res) => {
  /*
    |--------------------------------------------------------------------------
    | ID
    |--------------------------------------------------------------------------
    */

  const id = String(req.params.id || "").trim();

  if (!id) {
    throw httpError(400, "Blog ID is required.");
  }

  if (!mongoose.isValidObjectId(id)) {
    throw httpError(400, "Invalid blog ID.");
  }

  /*
    |--------------------------------------------------------------------------
    | FIND
    |--------------------------------------------------------------------------
    */

  const blog = await Blog.findById(id);

  if (!blog) {
    throw httpError(404, "Blog not found.");
  }

  /*
    |--------------------------------------------------------------------------
    | PAYLOAD
    |--------------------------------------------------------------------------
    */

  const payload = buildPayload(req.body);

  /*
    |--------------------------------------------------------------------------
    | TITLE
    |--------------------------------------------------------------------------
    */

  if (payload.title !== undefined) {
    payload.title = String(payload.title || "").trim();

    if (!payload.title) {
      throw httpError(400, "Blog title is required.");
    }
  }

  /*
    |--------------------------------------------------------------------------
    | USER
    |--------------------------------------------------------------------------
    */

  const userId = currentUserId(req);

  if (userId && hasPath("updated_by")) {
    payload.updated_by = userId;
  }

  /*
    |--------------------------------------------------------------------------
    | UPDATE TIME
    |--------------------------------------------------------------------------
    */

  if (hasPath("updated_at")) {
    payload.updated_at = new Date();
  }

  /*
    |--------------------------------------------------------------------------
    | PROTECT CREATE FIELDS
    |--------------------------------------------------------------------------
    */

  delete payload.created_at;
  delete payload.created_by;
  delete payload._id;
  delete payload.__v;

  /*
    |--------------------------------------------------------------------------
    | APPLY UPDATE
    |--------------------------------------------------------------------------
    */

  Object.assign(blog, payload);

  await blog.save();

  return res.status(200).json({
    message: "Blog updated successfully.",
    blog,
  });
});

/*
|--------------------------------------------------------------------------
| DELETE BLOG
|--------------------------------------------------------------------------
|
| DELETE /api/blogs/:id
|
*/

export const deleteBlog = asyncHandler(async (req, res) => {
  const id = String(req.params.id || "").trim();

  if (!mongoose.isValidObjectId(id)) {
    throw httpError(400, "Invalid blog ID.");
  }

  const blog = await Blog.findById(id);

  if (!blog) {
    throw httpError(404, "Blog not found.");
  }

  await blog.deleteOne();

  return res.status(200).json({
    message: "Blog deleted successfully.",
  });
});
