import express from "express";

import {
  listBlogComments,
  createBlogComment,
  updateBlogComment,
  deleteBlogComment,
} from "../controllers/blogCommentController.js";

import { authenticate } from "../middleware/auth.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| COMMENTS
|--------------------------------------------------------------------------
*/

router.get("/:blogId/comments", listBlogComments);

router.post("/:blogId/comments", authenticate, createBlogComment);

router.patch("/:blogId/comments/:commentId", authenticate, updateBlogComment);

router.delete("/:blogId/comments/:commentId", authenticate, deleteBlogComment);

export default router;
