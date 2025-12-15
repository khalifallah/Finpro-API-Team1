import { Router } from "express";
import * as voucherController from "../controllers/voucher.controller";
import { verifyToken } from "../middlewares/auth.middleware";

const router = Router();

// Semua endpoint voucher butuh login user
router.use(verifyToken);

// GET /vouchers/my-vouchers
router.get("/my-vouchers", voucherController.getMyVouchers);

// POST /vouchers/check (Untuk cek & hitung potongan saat checkout)
router.post("/check", voucherController.checkVoucher);

export default router;
