import { Router } from "express";

import {
  createService,
  deleteService,
  getService,
  listServices,
  updateService,
} from "../controllers/serviceController.js";

import { allowRoles, authenticate } from "../middleware/auth.js";

const router = Router();

/*
|--------------------------------------------------------------------------
| PUBLIC - LIST SERVICES
|--------------------------------------------------------------------------
|
| GET /api/services
|
*/

router.get("/", listServices);

/*
|--------------------------------------------------------------------------
| PUBLIC - SERVICE DETAIL
|--------------------------------------------------------------------------
|
| GET /api/services/:id
|
*/

router.get("/:id", getService);

/*
|--------------------------------------------------------------------------
| CREATE SERVICE
|--------------------------------------------------------------------------
|
| POST /api/services
|
*/

router.post(
  "/",
  authenticate,
  allowRoles("SUPER_ADMIN", "ADMIN", "STAFF"),
  createService,
);

/*
|--------------------------------------------------------------------------
| UPDATE SERVICE
|--------------------------------------------------------------------------
|
| PATCH /api/services/:id
|
*/

router.patch(
  "/:id",
  authenticate,
  allowRoles("SUPER_ADMIN", "ADMIN", "STAFF"),
  updateService,
);

/*
|--------------------------------------------------------------------------
| DELETE / DEACTIVATE SERVICE
|--------------------------------------------------------------------------
|
| DELETE /api/services/:id
|
*/

router.delete(
  "/:id",
  authenticate,
  allowRoles("SUPER_ADMIN", "ADMIN"),
  deleteService,
);

export default router;
