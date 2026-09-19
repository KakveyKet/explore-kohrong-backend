import Service from "../models/Service.js";
import Category from "../models/Category.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { httpError } from "../utils/httpError.js";

export const listServices = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.all !== "true") filter.status = "ACTIVE";
  if (req.query.status) filter.status = req.query.status;
  if (req.query.cate_id) filter.cate_id = req.query.cate_id;
  if (req.query.q) filter.$text = { $search: req.query.q };
  const services = await Service.find(filter)
    .populate("cate_id", "name slug")
    .populate("created_by", "username")
    .populate("updated_by", "username")
    .sort({ created_at: -1 });
  res.json({ services });
});
export async function getServiceById(req, res, next) {
  try {
    /*
    |--------------------------------------------------------------------------
    | SERVICE ID
    |--------------------------------------------------------------------------
    */

    const id = String(req.params?.id ?? "").trim();

    /*
    |--------------------------------------------------------------------------
    | VALIDATE
    |--------------------------------------------------------------------------
    */

    if (
      !id ||
      id === "undefined" ||
      id === "null" ||
      !mongoose.isValidObjectId(id)
    ) {
      return res.status(400).json({
        success: false,

        message: "Invalid service ID.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | FIND SERVICE
    |--------------------------------------------------------------------------
    */

    const service = await Service.findById(id)
      .populate("cate_id", "name slug status")
      .lean();

    /*
    |--------------------------------------------------------------------------
    | NOT FOUND
    |--------------------------------------------------------------------------
    */

    if (!service) {
      return res.status(404).json({
        success: false,

        message: "Service not found.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | RESULT
    |--------------------------------------------------------------------------
    */

    return res.status(200).json({
      success: true,

      service,
    });
  } catch (error) {
    console.error("[GET SERVICE BY ID ERROR]", error);

    next(error);
  }
}
export const getService = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id)
    .populate("cate_id", "name slug")
    .populate("created_by", "username")
    .populate("updated_by", "username");
  if (!service) throw httpError(404, "Service not found");
  res.json({ service });
});

export const createService = asyncHandler(async (req, res) => {
  const {
    cate_id,
    name,
    price,
    description = "",
    thumbnail = "",
    status = "ACTIVE",
    images = [],
  } = req.body;
  if (!cate_id || !name || price === undefined)
    throw httpError(400, "cate_id, name and price are required");
  if (!(await Category.exists({ _id: cate_id })))
    throw httpError(400, "Invalid category");
  const service = await Service.create({
    cate_id,
    name,
    price,
    description,
    thumbnail,
    status,
    images: Array.isArray(images) ? images : [],
    created_by: req.user._id,
  });
  res
    .status(201)
    .json({ service: await service.populate("cate_id", "name slug") });
});

export const updateService = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) throw httpError(404, "Service not found");
  if (req.body.cate_id && !(await Category.exists({ _id: req.body.cate_id })))
    throw httpError(400, "Invalid category");
  const fields = [
    "cate_id",
    "name",
    "price",
    "description",
    "thumbnail",
    "status",
    "images",
  ];
  for (const key of fields)
    if (req.body[key] !== undefined) service[key] = req.body[key];
  service.updated_by = req.user._id;
  await service.save();
  res.json({ service: await service.populate("cate_id", "name slug") });
});

export const deleteService = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) throw httpError(404, "Service not found");
  service.status = "INACTIVE";
  service.updated_by = req.user._id;
  await service.save();
  res.json({ message: "Service deactivated", service });
});
