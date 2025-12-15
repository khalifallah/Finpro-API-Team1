import prisma from "../libs/prisma";
import AppError from "../errors/app.error";
import { ShippingService } from "./shipping.service";
import { OrderCreationService } from "./order/order-creation.service";
import { validateVoucher } from "./voucher.service";

export interface ICheckoutData {
  userId: number;
  addressId: number;
  shippingMethod: string;
  voucherCode?: string;
  notes?: string;
  storeId?: number;
}

export class CheckoutService {
  private shippingService: ShippingService;
  private orderCreationService: OrderCreationService;

  constructor() {
    this.shippingService = new ShippingService();
    this.orderCreationService = new OrderCreationService();
  }

  private async calculateStoreDiscounts(cartItems: any[], storeId: number) {
    let totalStoreDiscount = 0;
    const itemDiscounts: Record<number, number> = {}; // Map productId -> discountAmount

    // 1. Ambil Rules Aktif di Toko Ini
    const productIds = cartItems.map((i) => i.productId);
    const activeRules = await prisma.discountRule.findMany({
      where: {
        storeId: storeId,
        productId: { in: productIds },
        is_active: true,
        deletedAt: null,
      },
    });

    // 2. Loop Items untuk hitung diskon
    for (const item of cartItems) {
      const rule = activeRules.find((r) => r.productId === item.productId);
      if (!rule) continue;

      const itemTotal = item.product.defaultPrice * item.quantity;
      let deduction = 0;

      // Cek Min Purchase
      if (rule.minPurchase > 0 && itemTotal < rule.minPurchase) {
        continue;
      }

      // Hitung Berdasarkan Tipe
      if (rule.type === "DIRECT_PERCENTAGE") {
        deduction = Math.round((itemTotal * (rule.value || 0)) / 100);
        if (rule.maxDiscountAmount && deduction > rule.maxDiscountAmount) {
          deduction = rule.maxDiscountAmount;
        }
      } else if (rule.type === "DIRECT_NOMINAL") {
        deduction = rule.value || 0;
      } else if (rule.type === "BOGO") {
        // Logic Baru: Kelipatan 2 (Beli 2 Gratis 1)
        const freeUnits = Math.floor(item.quantity / 2);
        if (freeUnits > 0) {
          deduction = freeUnits * item.product.defaultPrice;
        }
      }

      // Safety check
      if (deduction > itemTotal) deduction = itemTotal;

      itemDiscounts[item.productId] = deduction;
      totalStoreDiscount += deduction;
    }

    return { totalStoreDiscount, itemDiscounts };
  }

  async validateCheckout(data: ICheckoutData): Promise<{
    isValid: boolean;
    userAddress: any;
    selectedStore: any;
    shippingCost: number;
    distance: number;
    cartItems: any[];
    subtotal: number;
    totalDiscount: number;
    voucherDeduction: number;
    shippingDeduction: number;
    finalTotal: number;
    userVoucherId?: number;
    availableShippingMethods: any[];
  }> {
    try {
      // 1. Dapatkan user address
      const userAddress = await prisma.userAddress.findFirst({
        where: {
          id: data.addressId,
          userId: data.userId,
          deletedAt: null,
        },
      });

      if (!userAddress) {
        throw new AppError("Shipping address not found", 404);
      }

      // 2. Dapatkan cart items
      const cart = await prisma.cart.findFirst({
        where: {
          userId: data.userId,
          deletedAt: null,
        },
        include: {
          cartItems: {
            where: { deletedAt: null }, // Hanya ambil item yang tidak dihapus
            include: {
              product: true,
            },
          },
        },
      });

      if (!cart || cart.cartItems.length === 0) {
        throw new AppError("Cart is empty", 400);
      }

      // 3. Hitung total weight & Raw Subtotal
      let totalWeight = 0;
      let subtotal = 0;

      for (const item of cart.cartItems) {
        // Asumsikan setiap product memiliki berat default 1000g jika tidak ada
        const productWeight = 1000;
        totalWeight += productWeight * item.quantity;
        subtotal += item.product.defaultPrice * item.quantity;
      }

      // 4. Tentukan Store & Jarak (DEFINISI VARIABEL YANG HILANG SEBELUMNYA)
      let selectedStore;
      let distance;

      if (data.storeId) {
        // Jika user manual memilih store
        selectedStore = await this.shippingService.getStoreById(data.storeId);

        // Hitung jarak ke store yang dipilih
        distance = this.shippingService.calculateDistance(
          {
            latitude: Number(userAddress.latitude),
            longitude: Number(userAddress.longitude),
          },
          {
            latitude: Number(selectedStore.latitude),
            longitude: Number(selectedStore.longitude),
          }
        );
      } else {
        // Cari store terdekat otomatis
        const result = await this.shippingService.findNearestStore(userAddress);
        selectedStore = result.store;
        distance = result.distance;
      }

      // 5. Hitung Shipping Cost (DEFINISI VARIABEL shippingResult)
      const shippingResult =
        await this.shippingService.calculateShippingForCheckout(
          selectedStore.id,
          userAddress,
          totalWeight,
          data.shippingMethod
        );

      // --- LOGIKA DISKON & VOUCHER (REVISI BARU) ---

      // 6. Hitung Diskon Toko Otomatis
      const { totalStoreDiscount } = await this.calculateStoreDiscounts(
        cart.cartItems,
        selectedStore.id
      );

      // 7. Hitung Voucher (Jika ada kode)
      let voucherDeduction = 0;
      let shippingDeduction = 0;
      let userVoucherId = undefined;

      // Harga dasar untuk voucher belanja adalah (Subtotal - Diskon Toko)
      const priceAfterStoreDisc = subtotal - totalStoreDiscount;

      if (data.voucherCode) {
        // Panggil Service Voucher
        const voucherResult = await validateVoucher({
          userId: data.userId,
          code: data.voucherCode,
          cartTotal: priceAfterStoreDisc,
          shippingCost: shippingResult.totalShippingCost,
        });

        userVoucherId = voucherResult.userVoucherId;

        // Pisahkan target voucher (Ongkir vs Transaksi)
        if (voucherResult.target === "SHIPPING") {
          shippingDeduction = voucherResult.deductionAmount;
        } else {
          voucherDeduction = voucherResult.deductionAmount;
        }
      }

      // 8. Hitung Final Total
      // Rumus: (Harga Barang Bersih) + (Ongkir Bersih)
      // Harga Barang Bersih = Subtotal - Diskon Toko - Voucher Belanja
      const finalProductPrice = Math.max(
        0,
        subtotal - totalStoreDiscount - voucherDeduction
      );

      // Ongkir Bersih = Ongkir RajaOngkir - Voucher Ongkir
      const finalShippingPrice = Math.max(
        0,
        shippingResult.totalShippingCost - shippingDeduction
      );

      const finalTotal = finalProductPrice + finalShippingPrice;

      return {
        isValid: true,
        userAddress,
        selectedStore,
        shippingCost: shippingResult.totalShippingCost,
        distance,
        cartItems: cart.cartItems,
        subtotal,
        totalDiscount: totalStoreDiscount, // Info Diskon Toko
        voucherDeduction, // Info Potongan Voucher Belanja
        shippingDeduction, // Info Potongan Voucher Ongkir
        userVoucherId,
        finalTotal, // Total Akhir yang harus dibayar
        availableShippingMethods: shippingResult.availableServices,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error("Checkout validation error:", error);
      throw new AppError("Failed to validate checkout", 500);
    }
  }

  async processCheckout(data: ICheckoutData): Promise<any> {
    try {
      // Validasi checkout terlebih dahulu
      const validation = await this.validateCheckout(data);

      if (!validation.isValid) {
        throw new AppError("Checkout validation failed", 400);
      }

      // Proses pembuatan order dengan shipping cost yang sudah dihitung
      const orderData = {
        userId: data.userId,
        userAddressId: data.addressId,
        shippingMethod: data.shippingMethod,
        voucherCode: data.voucherCode,
        notes: data.notes,
        storeId: validation.selectedStore.id,
        cartItemIds: validation.cartItems.map((item) => item.id),
      };

      // Override shipping cost calculation dengan menggunakan yang sudah kita hitung
      const order = await this.orderCreationService.createOrder(orderData);

      // Tambahkan informasi shipping ke response
      return {
        ...order,
        shippingInfo: {
          cost: validation.shippingCost,
          distance: validation.distance,
          store: validation.selectedStore,
          address: validation.userAddress,
        },
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error("Checkout processing error:", error);
      throw new AppError("Failed to process checkout", 500);
    }
  }

  async getCheckoutPreview(
    userId: number,
    addressId?: number,
    storeId?: number,
    voucherCode?: string // [TAMBAHAN BARU]
  ): Promise<any> {
    try {
      // 1. Dapatkan semua alamat user
      const userAddresses = await prisma.userAddress.findMany({
        where: {
          userId,
          deletedAt: null,
        },
        orderBy: [{ isMain: "desc" }, { createdAt: "desc" }],
      });

      // 2. Tentukan alamat yang dipakai (Selected Address)
      // Prioritas: Address ID di-request -> Alamat Utama -> Alamat Pertama
      let selectedAddress = null;
      if (addressId) {
        selectedAddress = userAddresses.find((addr) => addr.id === addressId);
      } else {
        selectedAddress =
          userAddresses.find((addr) => addr.isMain) || userAddresses[0];
      }

      // 3. Dapatkan cart items
      // Filter: Hanya item yang belum dihapus
      const cart = await prisma.cart.findFirst({
        where: {
          userId,
          deletedAt: null,
        },
        include: {
          cartItems: {
            where: {
              deletedAt: null,
            },
            include: {
              product: {
                include: {
                  productImages: {
                    where: { deletedAt: null },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      });

      // Handle jika cart kosong
      if (!cart || cart.cartItems.length === 0) {
        return {
          canCheckout: false,
          message: "Cart is empty",
          addresses: userAddresses,
          cartSummary: [],
          subtotal: 0,
          totalWeight: 0,
          shippingOptions: [],
          requiresAddress: userAddresses.length === 0,
        };
      }

      // 4. Hitung Raw Subtotal & Total Weight
      let subtotal = 0;
      let totalWeight = 0;

      for (const item of cart.cartItems) {
        subtotal += item.product.defaultPrice * item.quantity;
        // Default weight 1000g jika tidak ada data berat
        totalWeight += 1000 * item.quantity;
      }

      // 5. Tentukan Store & Jarak
      let selectedStore = null;
      let distance = 0;

      if (storeId) {
        // KASUS A: User sudah memilih toko (misal dari halaman cart/home)
        try {
          selectedStore = await this.shippingService.getStoreById(storeId);

          // Hitung jarak jika alamat tersedia
          if (selectedAddress) {
            distance = this.shippingService.calculateDistance(
              {
                latitude: Number(selectedAddress.latitude),
                longitude: Number(selectedAddress.longitude),
              },
              {
                latitude: Number(selectedStore.latitude),
                longitude: Number(selectedStore.longitude),
              }
            );
          }
        } catch (e) {
          // Jika store ID invalid, biarkan null agar logic fallback jalan (opsional)
          console.warn(`Store ID ${storeId} not found for preview`);
        }
      }

      // KASUS B: Belum ada toko terpilih, cari yang terdekat dari alamat
      if (!selectedStore && selectedAddress) {
        try {
          const result = await this.shippingService.findNearestStore(
            selectedAddress
          );
          selectedStore = result.store;
          distance = result.distance;
        } catch (e) {
          // Handle jika tidak ada toko sama sekali di sistem
          console.warn("No nearest store found");
        }
      }

      // 6. Hitung Diskon Toko (Jika Store sudah ketemu)
      let totalStoreDiscount = 0;
      let itemDiscounts: Record<number, number> = {};

      if (selectedStore) {
        // Panggil Helper Logic yang sama dengan validateCheckout
        const discResult = await this.calculateStoreDiscounts(
          cart.cartItems,
          selectedStore.id
        );
        totalStoreDiscount = discResult.totalStoreDiscount;
        itemDiscounts = discResult.itemDiscounts;
      }

      // 7. Hitung Shipping Options (Jika Address & Store ada)
      let shippingOptions: any[] = []; // Fix type explicit
      if (selectedAddress && selectedStore) {
        try {
          // Hitung ongkir via RajaOngkir / Logic Shipping
          const shippingResult =
            await this.shippingService.calculateShippingForCheckout(
              selectedStore.id,
              selectedAddress,
              totalWeight
            );
          shippingOptions = shippingResult.availableServices;
        } catch (error) {
          // Jangan throw error fatal, agar user tetap bisa lihat cart
          // Nanti validasi akan memblokir saat tombol "Place Order" ditekan
          console.warn("Shipping calculation failed for preview:", error);
        }
      }

      // [TAMBAHAN BARU: LOGIC VOUCHER UNTUK PREVIEW]
      let voucherDeduction = 0;
      let shippingDeduction = 0;

      // Harga dasar untuk voucher belanja adalah (Subtotal - Diskon Toko)
      const priceAfterStoreDisc = subtotal - totalStoreDiscount;

      if (voucherCode) {
        // Jika ada kode voucher dikirim
        try {
          // Estimasi ongkir sementara (jika belum ada shipping, anggap 0 atau ambil termurah)
          // Agar validasi voucher "Gratis Ongkir" bisa jalan minimal
          let estimatedShippingCost = 0;
          if (shippingOptions.length > 0) {
            estimatedShippingCost = shippingOptions[0].cost; // Ambil opsi pertama sbg estimasi
          }

          const voucherResult = await validateVoucher({
            userId,
            code: voucherCode,
            cartTotal: priceAfterStoreDisc,
            shippingCost: estimatedShippingCost,
          });

          // Pisahkan target voucher
          if (voucherResult.target === "SHIPPING") {
            shippingDeduction = voucherResult.deductionAmount;
          } else {
            voucherDeduction = voucherResult.deductionAmount;
          }
        } catch (error) {
          // Jika voucher tidak valid, abaikan saja untuk preview (jangan throw error fatal)
          console.warn(`Invalid voucher code in preview: ${voucherCode}`);
        }
      }

      // Hitung Final Total untuk Preview
      // Asumsi Ongkir belum fixed (ambil 0 atau ambil estimasi)
      const estimatedFinalTotal = Math.max(
        0,
        priceAfterStoreDisc - voucherDeduction
      );

      // 8. Mapping Cart Summary untuk Frontend
      const cartSummary = cart.cartItems.map((item: any) => {
        const itemTotal = item.product.defaultPrice * item.quantity;
        const discountAmt = itemDiscounts[item.productId] || 0;

        return {
          productId: item.productId,
          productName: item.product.name,
          quantity: item.quantity,
          price: item.product.defaultPrice,
          total: itemTotal,
          imageUrl: item.product.productImages[0]?.imageUrl,
          // Attach Info Diskon untuk Frontend (Coret Harga / BOGO)
          discountAmount: discountAmt,
          finalPrice: itemTotal - discountAmt,
        };
      });

      // 9. Return Response
      return {
        canCheckout: true,
        addresses: userAddresses,
        selectedAddress,
        cartSummary,

        // Info Biaya
        subtotal, // Harga Asli
        totalDiscount: totalStoreDiscount, // Total Potongan Toko
        totalWeight,

        // [TAMBAHAN BARU] Info Voucher
        voucherDeduction,
        shippingDeduction,
        finalTotal: estimatedFinalTotal,

        // Info Shipping
        shippingOptions,
        distance,

        // Info Store
        selectedStore,
        selectedStoreId: selectedStore?.id,

        requiresAddress: userAddresses.length === 0,
      };
    } catch (error) {
      console.error("Checkout preview error:", error);
      throw new AppError("Failed to get checkout preview", 500);
    }
  }
}
