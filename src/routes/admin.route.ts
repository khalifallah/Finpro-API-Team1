import { Router } from "express";
import * as adminController from "../controllers/admin.controller";
import {
  adminAuth,
  superAdminAuth,
} from "../middlewares/admin.auth.middleware";

const router = Router();

// ✅ Apply adminAuth to semua routes
router.use(adminAuth);

// ✅ GET all users dengan pagination, search, role filter
// Endpoint: GET /admin/users
router.get("/users", superAdminAuth, adminController.getAllUsers);

// ✅ GET store admins only
// Endpoint: GET /admin/store-admins
router.get("/store-admins", superAdminAuth, adminController.getStoreAdmins);

// ✅ POST create new user (STORE_ADMIN or SUPER_ADMIN)
// Endpoint: POST /admin/store-admins
router.post("/store-admins", superAdminAuth, adminController.createStoreAdmin);

// ✅ PUT update user
// Endpoint: PUT /admin/users/:id
router.put("/users/:id", superAdminAuth, adminController.updateUser);

// ✅ DELETE user (soft delete)
// Endpoint: DELETE /admin/users/:id
router.delete("/users/:id", superAdminAuth, adminController.deleteUser);

export default router;