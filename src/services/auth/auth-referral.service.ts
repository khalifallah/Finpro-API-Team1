import AppError from "../../errors/app.error";

export async function processReferralRewards(
  tx: any,
  newUserId: number,
  referringUserId: number,
  newUserEmail: string
) {
  try {
    console.log(
      `Processing referral rewards for new user ${newUserId} referred by ${referringUserId}`
    );

    const welcomeVoucher = await tx.voucher.create({
      data: {
        code: `WELCOME-${Math.random()
          .toString(36)
          .substring(2, 10)
          .toUpperCase()}`,
        description: "Welcome discount coupon - Thank you for joining us!",
        type: "PERCENTAGE",
        value: 10,
        target: "TRANSACTION",
        minPurchaseAmount: 50000,
        maxDiscountAmount: 25000,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        is_active: true,
      },
    });

    await tx.userVoucher.create({
      data: {
        userId: newUserId,
        voucherId: welcomeVoucher.id,
        isUsed: false,
      },
    });

    const referralVoucher = await tx.voucher.create({
      data: {
        code: `REFER-${Math.random()
          .toString(36)
          .substring(2, 10)
          .toUpperCase()}`,
        description:
          "Referral bonus coupon - Thank you for referring a friend!",
        type: "PERCENTAGE",
        value: 15,
        target: "TRANSACTION",
        minPurchaseAmount: 100000,
        maxDiscountAmount: 50000,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        is_active: true,
      },
    });

    await tx.userVoucher.create({
      data: {
        userId: referringUserId,
        voucherId: referralVoucher.id,
        isUsed: false,
      },
    });

    console.log(
      `Referral rewards processed successfully for new user ${newUserId} (${newUserEmail}) referred by ${referringUserId}`
    );

    return {
      welcomeVoucherCode: welcomeVoucher.code,
      referralVoucherCode: referralVoucher.code,
      newUserReward: "10% discount coupon (min. purchase Rp 50,000)",
      referringUserReward: "15% discount coupon (min. purchase Rp 100,000)",
    };
  } catch (error) {
    console.error("Referral reward processing failed:", error);
    throw new AppError("Failed to process referral rewards", 500);
  }
}
