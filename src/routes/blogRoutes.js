import express from "express";

import {
  createBlog,
  deleteBlog,
  getBlog,
  listBlogs,
  updateBlog,
} from "../controllers/blogController.js";

import { authenticate, allowRoles } from "../middleware/auth.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| PUBLIC
|--------------------------------------------------------------------------
*/

router.get("/", listBlogs);

router.get("/:id", getBlog);

/*
|--------------------------------------------------------------------------
| ADMIN
|--------------------------------------------------------------------------
*/

router.post("/", authenticate, allowRoles("SUPER_ADMIN", "ADMIN"), createBlog);

/*
|--------------------------------------------------------------------------
| UPDATE BLOG
|--------------------------------------------------------------------------
|
| Frontend uses:
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
| OPTIONAL PUT SUPPORT
|--------------------------------------------------------------------------
|
| Keep this if older frontend code used PUT.
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
