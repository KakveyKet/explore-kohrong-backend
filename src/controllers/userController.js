import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { httpError } from '../utils/httpError.js';

const safeUser = (user) => user?.toJSON ? user.toJSON() : user;

export const listUsers = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.q) {
    filter.$or = [
      { username: { $regex: req.query.q, $options: 'i' } },
      { email: { $regex: req.query.q, $options: 'i' } },
    ];
  }
  const users = await User.find(filter).sort({ created_at: -1 });
  res.json({ users });
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw httpError(404, 'User not found');
  res.json({ user });
});

export const createUser = asyncHandler(async (req, res) => {
  const { username, email, password, role = 'STAFF', status = 'ACTIVE' } = req.body;
  if (!username || !email || !password) throw httpError(400, 'username, email and password are required');
  const user = await User.create({ username, email, password, role, status, updated_by: req.user._id });
  res.status(201).json({ user: safeUser(user) });
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('+password');
  if (!user) throw httpError(404, 'User not found');

  const fields = ['username', 'email', 'role', 'status'];
  for (const key of fields) if (req.body[key] !== undefined) user[key] = req.body[key];
  if (req.body.password) user.password = req.body.password;

  // Avoid accidentally removing the last active SUPER_ADMIN.
  if (user.role !== 'SUPER_ADMIN' || user.status !== 'ACTIVE') {
    const remaining = await User.countDocuments({ _id: { $ne: user._id }, role: 'SUPER_ADMIN', status: 'ACTIVE' });
    const wasSuperAdmin = req.body.role !== undefined || req.body.status !== undefined;
    if (wasSuperAdmin && remaining === 0) throw httpError(400, 'At least one active SUPER_ADMIN is required');
  }

  user.updated_by = req.user._id;
  await user.save();
  res.json({ user: await User.findById(user._id) });
});

export const deleteUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user._id.toString()) throw httpError(400, 'You cannot deactivate your own account');
  const user = await User.findById(req.params.id);
  if (!user) throw httpError(404, 'User not found');
  if (user.role === 'SUPER_ADMIN') {
    const remaining = await User.countDocuments({ _id: { $ne: user._id }, role: 'SUPER_ADMIN', status: 'ACTIVE' });
    if (remaining === 0) throw httpError(400, 'At least one active SUPER_ADMIN is required');
  }
  user.status = 'INACTIVE';
  user.updated_by = req.user._id;
  await user.save();
  res.json({ message: 'User deactivated', user });
});
