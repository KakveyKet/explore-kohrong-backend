import slugify from 'slugify';
import Category from '../models/Category.js';
import Service from '../models/Service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { httpError } from '../utils/httpError.js';

export const listCategories = asyncHandler(async (req, res) => {
  const filter = req.query.all === 'true' ? {} : { status: 'ACTIVE' };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.q) filter.name = { $regex: req.query.q, $options: 'i' };
  const categories = await Category.find(filter).sort({ name: 1 });
  res.json({ categories });
});

export const getCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw httpError(404, 'Category not found');
  res.json({ category });
});

export const createCategory = asyncHandler(async (req, res) => {
  const { name, status = 'ACTIVE' } = req.body;
  if (!name) throw httpError(400, 'name is required');
  const category = await Category.create({
    name,
    slug: req.body.slug || slugify(name, { lower: true, strict: true }),
    status,
    created_by: req.user._id,
  });
  res.status(201).json({ category });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw httpError(404, 'Category not found');
  if (req.body.name !== undefined) category.name = req.body.name;
  if (req.body.slug !== undefined) category.slug = req.body.slug;
  else if (req.body.name !== undefined) category.slug = slugify(req.body.name, { lower: true, strict: true });
  if (req.body.status !== undefined) category.status = req.body.status;
  category.updated_by = req.user._id;
  await category.save();
  res.json({ category });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw httpError(404, 'Category not found');
  const activeServices = await Service.countDocuments({ cate_id: category._id, status: 'ACTIVE' });
  if (activeServices > 0) throw httpError(400, 'Deactivate services in this category first');
  category.status = 'INACTIVE';
  category.updated_by = req.user._id;
  await category.save();
  res.json({ message: 'Category deactivated', category });
});
