import prisma from "../libs/prisma";
import AppError from "../errors/app.error";
import { ShippingService } from "./shipping.service";
import { OrderCreationService } from "./order/order-creation.service";

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

  async validateCheckout(data: ICheckoutData): Promise<{
    isValid: boolean;
    userAddress: any;
    selectedStore: any; // Renamed from nearestStore for clarity
    shippingCost: number;
    distance: number;
    cartItems: any[];
    subtotal: number;
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

      // 2. Dapatkan cart items untuk menghitung weight
      const cart = await prisma.cart.findFirst({
        where: {
          userId: data.userId,
          deletedAt: null,
        },
        include: {
          cartItems: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!cart || cart.cartItems.length === 0) {
        throw new AppError("Cart is empty", 400);
      }

      // 3. Hitung total weight
      let totalWeight = 0;
      let subtotal = 0;

      for (const item of cart.cartItems) {
        // Asumsikan setiap product memiliki berat default 1000g jika tidak ada
        const productWeight = 1000; // dalam gram
        totalWeight += productWeight * item.quantity;
        subtotal += item.product.defaultPrice * item.quantity;
      }

      // 4. Gunakan store yang dipilih jika ada, jika tidak cari store terdekat
      let selectedStore;
      let distance;

      if (data.storeId) {
        // Use the provided store
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
        // Cari store terdekat jika tidak ada storeId
        const { store: nearestStore, distance: storeDistance } =
          await this.shippingService.findNearestStore(userAddress);
        selectedStore = nearestStore;
        distance = storeDistance;
      }

      // 5. Hitung shipping cost untuk store yang dipilih
      const shippingResult =
        await this.shippingService.calculateShippingForCheckout(
          selectedStore.id,
          userAddress,
          totalWeight,
          data.shippingMethod
        );

      return {
        isValid: true,
        userAddress,
        selectedStore, // Return the actual store used
        shippingCost: shippingResult.totalShippingCost,
        distance,
        cartItems: cart.cartItems,
        subtotal,
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
    storeId?: number // Add storeId parameter
  ): Promise<any> {
    try {
      // Dapatkan alamat user
      const userAddresses = await prisma.userAddress.findMany({
        where: {
          userId,
          deletedAt: null,
        },
        orderBy: [{ isMain: "desc" }, { createdAt: "desc" }],
      });

      let selectedAddress = null;
      if (addressId) {
        selectedAddress = userAddresses.find((addr) => addr.id === addressId);
      } else {
        selectedAddress =
          userAddresses.find((addr) => addr.isMain) || userAddresses[0];
      }

      // Dapatkan cart items (only non-deleted)
      const cart = await prisma.cart.findFirst({
        where: {
          userId,
          deletedAt: null,
        },
        include: {
          cartItems: {
            where: {
              deletedAt: null, // Only include non-deleted items
              storeId: storeId ? storeId : undefined, // Filter by storeId if provided
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

      if (!cart || cart.cartItems.length === 0) {
        return {
          canCheckout: false,
          message: "Cart is empty",
        };
      }

      // Hitung subtotal dan weight
      let subtotal = 0;
      let totalWeight = 0;
      const cartSummary = [];

      for (const item of cart.cartItems) {
        const itemTotal = item.product.defaultPrice * item.quantity;
        subtotal += itemTotal;
        totalWeight += 1000 * item.quantity; // Default weight 1000g per item

        cartSummary.push({
          productId: item.productId,
          productName: item.product.name,
          quantity: item.quantity,
          price: item.product.defaultPrice,
          total: itemTotal,
          imageUrl: item.product.productImages[0]?.imageUrl,
        });
      }

      // Attach any active discount rules for the products in the cart (minimal info)
      const productIds = cart.cartItems.map((i) => i.productId);
      let previewTotalDiscount = 0;
      if (productIds.length > 0) {
        // Scope discount rules to the relevant store. Prefer provided `storeId`, otherwise try nearest store.
        let discountStoreId = storeId;
        if (!discountStoreId) {
          try {
            const { store: nearestStore } = await this.shippingService.findNearestStore(selectedAddress || userAddresses[0]);
            discountStoreId = nearestStore?.id;
          } catch (e) {
            // ignore and fallback to no-store filter
          }
        }

        const discountWhere: any = {
          productId: { in: productIds },
          is_active: true,
          deletedAt: null,
        };
        if (discountStoreId) discountWhere.storeId = discountStoreId;

        const discountRules = await prisma.discountRule.findMany({
          where: discountWhere,
          include: { product: true },
        });

        // Map discount info onto cartSummary items if there's a matching rule
        for (const s of cartSummary) {
          const rule = discountRules.find((r) => r.productId === s.productId);
          if (rule) {
            s.discount = {
              id: rule.id,
              description: rule.description,
              type: rule.type,
              value: rule.value,
            };
          }
        }

          // Compute discount amounts per item and total discount for preview
            for (const s of cartSummary) {
              if (!s.discount) continue;
              const rule = discountRules.find((r) => r.id === s.discount.id);
              if (!rule) continue;

              let itemDiscount = 0;
              // Respect minimum purchase if defined on rule
              if (rule.minPurchase && s.total < rule.minPurchase) {
                // skip applying this rule for this item
                s.discountAmount = 0;
                continue;
              }

              if (rule.type === "DIRECT_PERCENTAGE") {
                itemDiscount = Math.min(
                  s.total * (rule.value! / 100),
                  rule.maxDiscountAmount || Number.MAX_SAFE_INTEGER
                );
              } else if (rule.type === "DIRECT_NOMINAL") {
                itemDiscount = Math.min(rule.value || 0, s.total);
              } else if (rule.type === "BOGO") {
                // Give one free item for every 2 items (buy 1 get 1)
                if (s.quantity >= 2) {
                  const freeUnits = Math.floor(s.quantity / 2);
                  itemDiscount = freeUnits * (s.price || 0);
                }
              }

              s.discountAmount = itemDiscount;
              previewTotalDiscount += itemDiscount;
            }

            // attach total discount to be returned in preview (previewTotalDiscount variable)
      }

      // Jika ada alamat, hitung shipping options
      let shippingOptions = [];
      let distance = 0;
      let selectedStore = null;

      if (selectedAddress) {
        // *** FIX: Use provided storeId or find nearest ***
        if (storeId) {
          // Use the provided store
          selectedStore = await this.shippingService.getStoreById(storeId);

          // Calculate distance to the selected store
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
        } else {
          // Cari store terdekat jika tidak ada storeId
          const { store: nearestStore, distance: storeDistance } =
            await this.shippingService.findNearestStore(selectedAddress);
          selectedStore = nearestStore;
          distance = storeDistance;
        }

        // Hitung shipping options untuk store yang dipilih
        const shippingResult =
          await this.shippingService.calculateShippingForCheckout(
            selectedStore.id,
            selectedAddress,
            totalWeight
          );

        shippingOptions = shippingResult.availableServices;
      }

      const previewDiscount = previewTotalDiscount || 0;

      // Debug: log preview summary for troubleshooting
      try {
        console.log("[checkout.service] getCheckoutPreview =>", {
          userId,
          storeId: storeId || selectedStore?.id,
          subtotal,
          previewDiscount,
          cartSummaryCount: cartSummary.length,
        });
      } catch (e) {
        // ignore logging errors
      }

      return {
        canCheckout: true,
        addresses: userAddresses,
        selectedAddress,
        cartSummary,
        subtotal,
        totalWeight,
        shippingOptions,
        distance,
        selectedStore, // Return the actual store being used
        discountAmount: previewDiscount,
        requiresAddress: userAddresses.length === 0,
        selectedStoreId: storeId || selectedStore?.id, // Include storeId for frontend
      };
    } catch (error) {
      console.error("Checkout preview error:", error);
      throw new AppError("Failed to get checkout preview", 500);
    }
  }
}
