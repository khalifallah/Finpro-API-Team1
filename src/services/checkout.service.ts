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
    nearestStore: any;
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

      // 4. Cari store terdekat
      const { store: nearestStore, distance } =
        await this.shippingService.findNearestStore(userAddress);

      // 5. Hitung shipping cost
      const shippingResult =
        await this.shippingService.calculateShippingForCheckout(
          nearestStore.id,
          userAddress,
          totalWeight,
          data.shippingMethod
        );

      return {
        isValid: true,
        userAddress,
        nearestStore,
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
      };

      // Override shipping cost calculation dengan menggunakan yang sudah kita hitung
      const order = await this.orderCreationService.createOrder(orderData);

      // Tambahkan informasi shipping ke response
      return {
        ...order,
        shippingInfo: {
          cost: validation.shippingCost,
          distance: validation.distance,
          store: validation.nearestStore,
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

  async getCheckoutPreview(userId: number, addressId?: number): Promise<any> {
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

      // Dapatkan cart items
      const cart = await prisma.cart.findFirst({
        where: {
          userId,
          deletedAt: null,
        },
        include: {
          cartItems: {
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

      // Jika ada alamat, hitung shipping options
      let shippingOptions = [];
      let distance = 0;
      let nearestStore = null;

      if (selectedAddress) {
        const { store, distance: storeDistance } =
          await this.shippingService.findNearestStore(selectedAddress);
        nearestStore = store;
        distance = storeDistance;

        const shippingResult =
          await this.shippingService.calculateShippingForCheckout(
            store.id,
            selectedAddress,
            totalWeight
          );

        shippingOptions = shippingResult.availableServices;
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
        nearestStore,
        requiresAddress: userAddresses.length === 0,
      };
    } catch (error) {
      console.error("Checkout preview error:", error);
      throw new AppError("Failed to get checkout preview", 500);
    }
  }
}
