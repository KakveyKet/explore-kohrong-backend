import express from "express";

import {
  createBlog,
  deleteBlog,
  getBlog,
  listBlogs,
  updateBlog,
} from "../controllers/blogController.js";

import { authenticate } from "../middleware/auth.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| BLOG CRUD
|--------------------------------------------------------------------------
*/

router.get("/", listBlogs);

router.get("/:id", getBlog);

router.post("/", authenticate, createBlog);

router.put("/:id", authenticate, updateBlog);

router.delete("/:id", authenticate, deleteBlog);

export default router;
