import { Request, Response } from "express";
import * as voucherService from "../services/voucher.service";

export const getMyVouchers = async (req: Request, res: Response) => {
  try {
    // Asumsi: Middleware auth sudah menaruh payload user di req.user atau req.jwtPayload
    const userId = (req as any).user?.id || (req as any).jwtPayload?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const result = await voucherService.getMyVouchers(Number(userId));

    // Format response konsisten: { data: ... } atau langsung array
    res.json({ status: "success", data: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch vouchers" });
  }
};

export const checkVoucher = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).jwtPayload?.id;
    const { code, cartTotal, shippingCost } = req.body;

    if (!code) {
      return res.status(400).json({ error: "Voucher code is required" });
    }

    const result = await voucherService.validateVoucher({
      userId: Number(userId),
      code,
      cartTotal: Number(cartTotal || 0),
      shippingCost: Number(shippingCost || 0),
    });

    res.json({ status: "success", data: result });
  } catch (err: any) {
    // Return status 400 untuk validasi gagal (misal: min purchase kurang)
    res.status(400).json({
      status: "error",
      message: err.message || "Invalid voucher",
    });
  }
};
