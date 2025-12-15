import prisma from "../libs/prisma";
import AppError from "../errors/app.error";

interface ValidateVoucherParams {
  userId: number;
  code: string;
  cartTotal: number;
  shippingCost: number;
}

// 1. Get My Vouchers (List voucher milik user yang belum dipakai)
export const getMyVouchers = async (userId: number) => {
  try {
    const userVouchers = await prisma.userVoucher.findMany({
      where: {
        userId,
        isUsed: false,
        voucher: {
          expiresAt: { gt: new Date() }, // Belum expired
          is_active: true,
          deletedAt: null,
        },
      },
      include: {
        voucher: true,
      },
      orderBy: {
        voucher: {
          expiresAt: "asc", // Tampilkan yang mau expired duluan
        },
      },
    });

    // Transform response agar frontend mudah membacanya
    return userVouchers.map((uv) => ({
      id: uv.id, // ID kepemilikan (UserVoucher)
      voucherId: uv.voucher.id,
      code: uv.voucher.code,
      description: uv.voucher.description,
      type: uv.voucher.type, // NOMINAL / PERCENTAGE
      value: uv.voucher.value,
      target: uv.voucher.target, // TRANSACTION / SHIPPING
      minPurchase: uv.voucher.minPurchaseAmount,
      maxDiscount: uv.voucher.maxDiscountAmount,
      expiresAt: uv.voucher.expiresAt,
    }));
  } catch (err: any) {
    throw new AppError(err.message || "Failed to fetch user vouchers", 500);
  }
};

// 2. Validate & Calculate Voucher (Dipanggil saat user klik 'Apply' atau Checkout)
export const validateVoucher = async ({
  userId,
  code,
  cartTotal,
  shippingCost,
}: ValidateVoucherParams) => {
  try {
    // A. Cari UserVoucher berdasarkan CODE dan USER
    const userVoucher = await prisma.userVoucher.findFirst({
      where: {
        userId,
        isUsed: false,
        voucher: {
          code: code,
          is_active: true,
          deletedAt: null,
        },
      },
      include: {
        voucher: true,
      },
    });

    if (!userVoucher) {
      throw new AppError(
        "Voucher not found, expired, or you do not own it",
        404
      );
    }

    const { voucher } = userVoucher;

    // B. Validasi Tanggal
    if (new Date() > new Date(voucher.expiresAt)) {
      throw new AppError("Voucher has expired", 400);
    }

    // C. Validasi Minimal Belanja (Berdasarkan Subtotal Produk)
    if (cartTotal < voucher.minPurchaseAmount) {
      throw new AppError(
        `Minimum purchase of Rp ${voucher.minPurchaseAmount.toLocaleString()} required`,
        400
      );
    }

    // D. Hitung Deduksi (Potongan)
    let deductionAmount = 0;
    let applicableAmount = 0;

    // Tentukan target potongan: Barang atau Ongkir?
    if (voucher.target === "SHIPPING") {
      applicableAmount = shippingCost;
    } else {
      applicableAmount = cartTotal; // Default: TRANSACTION
    }

    // Hitung berdasarkan tipe (Nominal vs Persen)
    if (voucher.type === "NOMINAL") {
      deductionAmount = voucher.value;
    } else if (voucher.type === "PERCENTAGE") {
      deductionAmount = Math.round((applicableAmount * voucher.value) / 100);

      // Cek limit maksimal diskon (Cap)
      if (
        voucher.maxDiscountAmount &&
        deductionAmount > voucher.maxDiscountAmount
      ) {
        deductionAmount = voucher.maxDiscountAmount;
      }
    }

    // Pastikan potongan tidak lebih besar dari biaya (tidak boleh minus)
    if (deductionAmount > applicableAmount) {
      deductionAmount = applicableAmount;
    }

    return {
      valid: true,
      userVoucherId: userVoucher.id,
      voucherCode: voucher.code,
      type: voucher.type,
      target: voucher.target,
      deductionAmount: deductionAmount,
      message: "Voucher applied successfully",
    };
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(err.message || "Failed to validate voucher", 500);
  }
};
