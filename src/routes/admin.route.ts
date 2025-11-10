import { Router } from "express";
import * as adminController from "../controllers/admin.controller";
import { adminAuth , superAdminAuth } from "../middlewares/admin.auth.middleware";

const router = Router();

router.use(adminAuth);

router.get("/users" , superAdminAuth , adminController.getAllUsers);
router.get("/store-admins" , superAdminAuth , adminController.getStoreAdmins);
router.post("/store-admins" , superAdminAuth, adminController.createStoreAdmin);
router.put("/users/:id" , superAdminAuth , adminController.updateUser);
router.delete("/users/:id" , superAdminAuth , adminController.deleteUser);

export default router;