import { Router } from 'express';
import { createUser, deleteUser, getUser, listUsers, updateUser } from '../controllers/userController.js';
import { allowRoles, authenticate } from '../middleware/auth.js';

const router = Router();
router.get('/', authenticate, allowRoles('SUPER_ADMIN', 'ADMIN', 'STAFF'), listUsers);
router.get('/:id', authenticate, allowRoles('SUPER_ADMIN', 'ADMIN', 'STAFF'), getUser);
router.post('/', authenticate, allowRoles('SUPER_ADMIN', 'ADMIN'), createUser);
router.patch('/:id', authenticate, allowRoles('SUPER_ADMIN', 'ADMIN'), updateUser);
router.delete('/:id', authenticate, allowRoles('SUPER_ADMIN', 'ADMIN'), deleteUser);
export default router;
