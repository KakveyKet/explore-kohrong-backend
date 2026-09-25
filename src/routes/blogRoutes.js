// src/routes/blogRoutes.js

import express from "express";

import {
  createBlog,
  deleteBlog,
  getBlog,
  listBlogs,
  updateBlog,
} from "../controllers/blogController.js";

import { authenticate, allowRoles } from "../middleware/auth.js";

/*
|--------------------------------------------------------------------------
| ROUTER
|--------------------------------------------------------------------------
*/

const router = express.Router();

/*
|--------------------------------------------------------------------------
| PUBLIC
|--------------------------------------------------------------------------
*/

/*
 * List blogs.
 *
 * GET /api/blogs
 * GET /api/blogs?all=true
 */

router.get("/", listBlogs);

/*
 * Blog detail.
 *
 * GET /api/blogs/:id
 */

router.get("/:id", getBlog);

/*
|--------------------------------------------------------------------------
| CREATE
|--------------------------------------------------------------------------
|
| SUPER_ADMIN
| ADMIN
|
*/

router.post("/", authenticate, allowRoles("SUPER_ADMIN", "ADMIN"), createBlog);

/*
|--------------------------------------------------------------------------
| UPDATE
|--------------------------------------------------------------------------
|
| This route was missing before.
|
| PATCH /api/blogs/:id
|
*/

router.patch(
  "/:id",
  authenticate,
  allowRoles("SUPER_ADMIN", "ADMIN"),
  updateBlog,
);

/*
|--------------------------------------------------------------------------
| PUT SUPPORT
|--------------------------------------------------------------------------
|
| Keep this so older frontend code using PUT also works.
|
*/

router.put(
  "/:id",
  authenticate,
  allowRoles("SUPER_ADMIN", "ADMIN"),
  updateBlog,
);

/*
|--------------------------------------------------------------------------
| DELETE
|--------------------------------------------------------------------------
*/

router.delete(
  "/:id",
  authenticate,
  allowRoles("SUPER_ADMIN", "ADMIN"),
  deleteBlog,
);

export default router;
