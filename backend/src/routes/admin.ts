import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';
import * as adminController from '../controllers/admin';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// User management
router.get('/users', adminController.listUsers);
router.get('/users/:id', adminController.getUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.patch('/users/:id/restore', adminController.restoreUser);
router.patch('/users/:id/role', adminController.changeUserRole);

// Dashboard & logs
router.get('/stats', adminController.getStats);
router.get('/logs', adminController.getAdminLogs);

export default router;
