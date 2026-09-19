import mongoose from "mongoose";

import Blog from "../models/Blog.js";
import BlogComment from "../models/BlogComment.js";

import { httpError } from "../utils/httpError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/*
|--------------------------------------------------------------------------
| VALIDATE OBJECT ID
|--------------------------------------------------------------------------
*/

function validateObjectId(value, fieldName = "ID") {
  const id = String(value ?? "").trim();

  if (
    !id ||
    id === "undefined" ||
    id === "null" ||
    !mongoose.isValidObjectId(id)
  ) {
    throw httpError(400, `Invalid ${fieldName}.`);
  }

  return id;
}

/*
|--------------------------------------------------------------------------
| AUTHENTICATED USER ID
|--------------------------------------------------------------------------
|
| Supports:
|
| req.user._id
| req.user.id
| req.user.userId
| req.user.user_id
| req.user.sub
| req.user.user._id
| req.auth._id
| req.auth.id
| req.auth.userId
|
*/

function getAuthenticatedUserId(req) {
  const candidates = [
    req.user?._id,

    req.user?.id,

    req.user?.userId,

    req.user?.user_id,

    req.user?.sub,

    req.user?.user?._id,

    req.user?.user?.id,

    req.auth?._id,

    req.auth?.id,

    req.auth?.userId,
  ];

  const value = candidates.find(
    (item) => item !== undefined && item !== null && String(item).trim(),
  );

  const id = String(value || "").trim();

  if (!id) {
    throw httpError(401, "Authentication required.");
  }

  if (!mongoose.isValidObjectId(id)) {
    console.error("[BLOG COMMENT INVALID USER]", req.user);

    throw httpError(401, "Invalid authenticated user.");
  }

  return id;
}

/*
|--------------------------------------------------------------------------
| GET BLOG COMMENTS
|--------------------------------------------------------------------------
|
| GET /api/blogs/:blogId/comments
|
| Public
|
*/

export const listBlogComments = asyncHandler(async (req, res) => {
  /*
      |--------------------------------------------------------------------------
      | BLOG ID
      |--------------------------------------------------------------------------
      */

  const blogId = validateObjectId(req.params.blogId, "blog ID");

  /*
      |--------------------------------------------------------------------------
      | CHECK BLOG
      |--------------------------------------------------------------------------
      */

  const blogExists = await Blog.exists({
    _id: blogId,
  });

  if (!blogExists) {
    throw httpError(404, "Blog article not found.");
  }

  /*
      |--------------------------------------------------------------------------
      | COMMENTS
      |--------------------------------------------------------------------------
      */

  const comments = await BlogComment.find({
    blog_id: blogId,

    status: "ACTIVE",
  })
    .populate("user_id", "firstName lastName username email avatar")
    .sort({
      created_at: -1,
    })
    .lean();

  /*
      |--------------------------------------------------------------------------
      | RESPONSE
      |--------------------------------------------------------------------------
      */

  return res.json({
    comments,

    count: comments.length,
  });
});

/*
|--------------------------------------------------------------------------
| CREATE BLOG COMMENT
|--------------------------------------------------------------------------
|
| POST /api/blogs/:blogId/comments
|
| Authentication required
|
*/

export const createBlogComment = asyncHandler(async (req, res) => {
  /*
      |--------------------------------------------------------------------------
      | BLOG ID
      |--------------------------------------------------------------------------
      */

  const blogId = validateObjectId(req.params.blogId, "blog ID");

  /*
      |--------------------------------------------------------------------------
      | AUTH USER
      |--------------------------------------------------------------------------
      */

  const userId = getAuthenticatedUserId(req);

  /*
      |--------------------------------------------------------------------------
      | DEBUG
      |--------------------------------------------------------------------------
      */

  console.log("[CREATE BLOG COMMENT BODY]", req.body);

  console.log("[CREATE BLOG COMMENT USER]", req.user);

  /*
      |--------------------------------------------------------------------------
      | COMMENT
      |--------------------------------------------------------------------------
      */

  const commentText = String(
    req.body?.comment ??
      req.body?.content ??
      req.body?.text ??
      req.body?.message ??
      "",
  ).trim();

  console.log("[CREATE BLOG COMMENT VALUE]", commentText);

  /*
      |--------------------------------------------------------------------------
      | VALIDATION
      |--------------------------------------------------------------------------
      */

  if (!commentText) {
    throw httpError(400, "Comment is required.");
  }

  if (commentText.length > 1000) {
    throw httpError(400, "Comment must be 1000 characters or fewer.");
  }

  /*
      |--------------------------------------------------------------------------
      | CHECK BLOG
      |--------------------------------------------------------------------------
      */

  const blog = await Blog.findById(blogId).select("_id status");

  if (!blog) {
    throw httpError(404, "Blog article not found.");
  }

  /*
      |--------------------------------------------------------------------------
      | CHECK STATUS
      |--------------------------------------------------------------------------
      */

  if (blog.status && String(blog.status).toUpperCase() === "INACTIVE") {
    throw httpError(400, "Comments are not available for this article.");
  }

  /*
      |--------------------------------------------------------------------------
      | CREATE COMMENT
      |--------------------------------------------------------------------------
      */

  const created = await BlogComment.create({
    blog_id: blogId,

    user_id: userId,

    comment: commentText,

    status: "ACTIVE",
  });

  /*
      |--------------------------------------------------------------------------
      | POPULATE USER
      |--------------------------------------------------------------------------
      */

  const populated = await BlogComment.findById(created._id)
    .populate("user_id", "firstName lastName username email avatar")
    .lean();

  /*
      |--------------------------------------------------------------------------
      | RESPONSE
      |--------------------------------------------------------------------------
      */

  return res.status(201).json({
    message: "Comment added successfully.",

    comment: populated,
  });
});

/*
|--------------------------------------------------------------------------
| UPDATE BLOG COMMENT
|--------------------------------------------------------------------------
|
| PATCH /api/blogs/:blogId/comments/:commentId
|
*/

export const updateBlogComment = asyncHandler(async (req, res) => {
  /*
      |--------------------------------------------------------------------------
      | IDS
      |--------------------------------------------------------------------------
      */

  const blogId = validateObjectId(req.params.blogId, "blog ID");

  const commentId = validateObjectId(req.params.commentId, "comment ID");

  const userId = getAuthenticatedUserId(req);

  /*
      |--------------------------------------------------------------------------
      | COMMENT
      |--------------------------------------------------------------------------
      */

  const commentText = String(
    req.body?.comment ??
      req.body?.content ??
      req.body?.text ??
      req.body?.message ??
      "",
  ).trim();

  /*
      |--------------------------------------------------------------------------
      | VALIDATION
      |--------------------------------------------------------------------------
      */

  if (!commentText) {
    throw httpError(400, "Comment is required.");
  }

  if (commentText.length > 1000) {
    throw httpError(400, "Comment must be 1000 characters or fewer.");
  }

  /*
      |--------------------------------------------------------------------------
      | FIND COMMENT
      |--------------------------------------------------------------------------
      */

  const comment = await BlogComment.findOne({
    _id: commentId,

    blog_id: blogId,

    user_id: userId,

    status: "ACTIVE",
  });

  if (!comment) {
    throw httpError(404, "Comment not found.");
  }

  /*
      |--------------------------------------------------------------------------
      | UPDATE
      |--------------------------------------------------------------------------
      */

  comment.comment = commentText;

  comment.updated_at = new Date();

  await comment.save();

  /*
      |--------------------------------------------------------------------------
      | POPULATE
      |--------------------------------------------------------------------------
      */

  const populated = await BlogComment.findById(comment._id)
    .populate("user_id", "firstName lastName username email avatar")
    .lean();

  /*
      |--------------------------------------------------------------------------
      | RESPONSE
      |--------------------------------------------------------------------------
      */

  return res.json({
    message: "Comment updated successfully.",

    comment: populated,
  });
});

/*
|--------------------------------------------------------------------------
| DELETE BLOG COMMENT
|--------------------------------------------------------------------------
|
| DELETE /api/blogs/:blogId/comments/:commentId
|
| Soft delete
|
*/

export const deleteBlogComment = asyncHandler(async (req, res) => {
  /*
      |--------------------------------------------------------------------------
      | IDS
      |--------------------------------------------------------------------------
      */

  const blogId = validateObjectId(req.params.blogId, "blog ID");

  const commentId = validateObjectId(req.params.commentId, "comment ID");

  const userId = getAuthenticatedUserId(req);

  /*
      |--------------------------------------------------------------------------
      | FIND COMMENT
      |--------------------------------------------------------------------------
      */

  const comment = await BlogComment.findOne({
    _id: commentId,

    blog_id: blogId,

    user_id: userId,

    status: "ACTIVE",
  });

  if (!comment) {
    throw httpError(404, "Comment not found.");
  }

  /*
      |--------------------------------------------------------------------------
      | SOFT DELETE
      |--------------------------------------------------------------------------
      */

  comment.status = "INACTIVE";

  comment.updated_at = new Date();

  await comment.save();

  /*
      |--------------------------------------------------------------------------
      | RESPONSE
      |--------------------------------------------------------------------------
      */

  return res.json({
    message: "Comment deleted successfully.",
  });
});
