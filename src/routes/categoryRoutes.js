import { Router } from 'express';
import { createCategory, deleteCategory, getCategory, listCategories, updateCategory } from '../controllers/categoryController.js';
import { allowRoles, authenticate } from '../middleware/auth.js';

const router = Router();
router.get('/', listCategories);
router.get('/:id', getCategory);
router.post('/', authenticate, allowRoles('SUPER_ADMIN', 'ADMIN', 'STAFF'), createCategory);
router.patch('/:id', authenticate, allowRoles('SUPER_ADMIN', 'ADMIN', 'STAFF'), updateCategory);
router.delete('/:id', authenticate, allowRoles('SUPER_ADMIN', 'ADMIN'), deleteCategory);
export default router;
