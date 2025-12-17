import prisma from "../libs/prisma";
import AppError from "../errors/app.error";
import { RajaOngkirService, RajaOngkirCostParams } from "./rajaongkir.service";
import { AddressService } from "./address.service";

export interface ICalculateShippingParams {
  originCityId: string;
  destinationCityId: string;
  weight: number;
  courier: string;
}

export interface IShippingService {
  serviceCode: string;
  name: string;
  description: string;
  cost: number;
  etd: string;
  courier: string;
  maxDistance?: number;
}

export interface ICoordinate {
  latitude: number;
  longitude: number;
}

export class ShippingService {
  private rajaongkirService: RajaOngkirService;
  private addressService: AddressService;

  constructor() {
    this.rajaongkirService = new RajaOngkirService();
    this.addressService = new AddressService();
  }

  // --- Helper ---

  async getAddressById(addressId: number, userId: number): Promise<any> {
    try {
      return await this.addressService.getAddressById(addressId, userId);
    } catch (error) {
      console.error("Error getting address:", error);
      throw new AppError("Failed to retrieve address", 500);
    }
  }

  async getStoreById(storeId: number) {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });
    if (!store) {
      throw new AppError("Store not found", 404);
    }
    return store;
  }

  calculateDistance(coord1: ICoordinate, coord2: ICoordinate): number {
    const R = 6371;
    const dLat = this.deg2rad(coord2.latitude - coord1.latitude);
    const dLon = this.deg2rad(coord2.longitude - coord1.longitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(coord1.latitude)) *
        Math.cos(this.deg2rad(coord2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // --- Caching ---

  async getCachedShippingCost(
    storeId: number,
    originCityId: string,
    destinationCityId: string,
    serviceCode: string
  ): Promise<{ cost: number; etd: string } | null> {
    const cached = await prisma.shippingCostCache.findFirst({
      where: {
        storeId,
        originCityId,
        destinationCityId,
        serviceCode,
        isActive: true,
        expiresAt: { gt: new Date() },
        deletedAt: null,
      },
    });

    if (cached) {
      return { cost: cached.cost, etd: cached.estimatedDays };
    }
    return null;
  }

  async cacheShippingCost(
    storeId: number,
    originCityId: string,
    destinationCityId: string,
    serviceCode: string,
    serviceName: string,
    cost: number,
    etd: string
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.shippingCostCache.upsert({
      where: {
        storeId_originCityId_destinationCityId_serviceCode: {
          storeId,
          originCityId,
          destinationCityId,
          serviceCode,
        },
      },
      update: {
        cost,
        estimatedDays: etd,
        expiresAt,
        isActive: true,
        deletedAt: null,
      },
      create: {
        storeId,
        originCityId,
        destinationCityId,
        serviceCode,
        serviceName,
        cost,
        estimatedDays: etd,
        expiresAt,
      },
    });
  }

  // --- Raja Ongkir Calculation ---

  async calculateShippingRajaOngkir(
    params: ICalculateShippingParams
  ): Promise<IShippingService[]> {
    try {
      const rajaongkirParams: RajaOngkirCostParams = {
        origin: params.originCityId,
        destination: params.destinationCityId,
        weight: params.weight,
        courier: params.courier,
      };

      const results = await this.rajaongkirService.getCost(rajaongkirParams);

      if (!results || !Array.isArray(results) || results.length === 0) {
        console.warn(
          `[SHIPPING] RajaOngkir returned empty/invalid for ${params.courier}, using fallback.`
        );
        return this.calculateShippingFallback(params);
      }

      const shippingServices: IShippingService[] = [];

      for (const courierResult of results) {
        if (courierResult.costs && Array.isArray(courierResult.costs)) {
          for (const cost of courierResult.costs) {
            shippingServices.push({
              serviceCode: cost.service, // e.g. "REG"
              name: `${courierResult.code.toUpperCase()} ${cost.service}`,
              description: cost.description,
              cost: cost.cost[0].value,
              etd: cost.cost[0].etd,
              courier: courierResult.code, // e.g. "jne"
            });
          }
        }
      }

      // Jika parsing API berhasil tapi kosong, fallback
      if (shippingServices.length === 0) {
        return this.calculateShippingFallback(params);
      }

      return shippingServices;
    } catch (error) {
      console.error("RajaOngkir calculation error:", error);
      return this.calculateShippingFallback(params);
    }
  }

  // --- Fallback Calculation ---

  private calculateShippingFallback(
    params: ICalculateShippingParams
  ): IShippingService[] {
    console.log("[SHIPPING] Using Fallback Calculation");
    const baseCost = 10000;
    const perKgCost = 5000;
    const weightInKg = Math.ceil(params.weight / 1000);
    const estimatedCost = Math.max(baseCost, weightInKg * perKgCost);

    // Pastikan serviceCode sesuai dengan yang ada di database seed (REG, OKE, YES)
    return [
      {
        serviceCode: "REG",
        name: `${params.courier.toUpperCase()} Reguler (Fallback)`,
        description: "Layanan reguler (Estimasi)",
        cost: estimatedCost,
        etd: "3-5 hari",
        courier: params.courier,
      },
      {
        serviceCode: "OKE",
        name: `${params.courier.toUpperCase()} OKE (Fallback)`,
        description: "Ongkos Kirim Ekonomis (Estimasi)",
        cost: Math.max(10000, estimatedCost * 0.8),
        etd: "5-7 hari",
        courier: params.courier,
      },
      {
        serviceCode: "YES",
        name: `${params.courier.toUpperCase()} YES (Fallback)`,
        description: "Yakin Esok Sampai (Estimasi)",
        cost: estimatedCost * 1.5,
        etd: "1-2 hari",
        courier: params.courier,
      },
    ];
  }

  async getStoreShippingServices(storeId: number): Promise<any[]> {
    return await prisma.shippingConfig.findMany({
      where: { storeId, isActive: true, deletedAt: null },
      orderBy: { cost: "asc" },
    });
  }

  // --- Main Calculation Method (MODIFIED) ---

  async calculateShippingForCheckout(
    storeId: number,
    userAddress: any,
    weight: number,
    selectedService?: string
  ): Promise<{
    availableServices: IShippingService[];
    selectedService?: IShippingService;
    totalShippingCost: number;
    distance: number;
  }> {
    try {
      const store = await prisma.store.findUnique({ where: { id: storeId } });
      if (!store) throw new AppError("Store not found", 404);
      if (!store.cityId || !userAddress.cityId) {
        throw new AppError("Missing city configuration", 400);
      }

      const distance = this.calculateDistance(
        {
          latitude: Number(userAddress.latitude),
          longitude: Number(userAddress.longitude),
        },
        {
          latitude: Number(store.latitude),
          longitude: Number(store.longitude),
        }
      );

      // Ambil Config dari DB (apa yang toko support)
      const shippingConfigs = await this.getStoreShippingServices(storeId);
      if (shippingConfigs.length === 0) {
        throw new AppError("No shipping services configured", 400);
      }

      const allServices: IShippingService[] = [];
      // Grouping configs by courier code to avoid multiple API calls for same courier
      const uniqueCouriers = Array.from(
        new Set(shippingConfigs.map((c) => c.courierCode))
      );

      for (const courierCode of uniqueCouriers) {
        try {
          // 1. Cek API / Fallback untuk kurir ini
          const apiServices = await this.calculateShippingRajaOngkir({
            originCityId: store.cityId,
            destinationCityId: userAddress.cityId,
            weight,
            courier: courierCode,
          });

          // 2. Filter hasil API sesuai dengan config DB (match serviceCode)
          const supportedServicesForCourier = shippingConfigs.filter(
            (c) => c.courierCode === courierCode
          );

          for (const dbConfig of supportedServicesForCourier) {
            // Check Cache first
            const cached = await this.getCachedShippingCost(
              storeId,
              store.cityId,
              userAddress.cityId,
              dbConfig.serviceCode
            );

            if (cached) {
              allServices.push({
                serviceCode: dbConfig.serviceCode,
                name: dbConfig.serviceName,
                description: dbConfig.description,
                cost: cached.cost,
                etd: cached.etd,
                courier: dbConfig.courierCode,
              });
              continue;
            }

            // Find matching service from API result (Case Insensitive Match)
            const matchedFromApi = apiServices.find(
              (s) =>
                s.serviceCode.toLowerCase() ===
                dbConfig.serviceCode.toLowerCase()
            );

            if (matchedFromApi) {
              // Cache it
              await this.cacheShippingCost(
                storeId,
                store.cityId,
                userAddress.cityId,
                dbConfig.serviceCode,
                matchedFromApi.name,
                matchedFromApi.cost,
                matchedFromApi.etd
              );

              // Push to result
              allServices.push({
                ...matchedFromApi,
                // Override name/description from DB config for consistency if needed,
                // or use API's. Here we use API's name but keep DB's code.
                serviceCode: dbConfig.serviceCode,
              });
            } else {
              // OPTIONAL: Force Fallback jika DB minta 'REG' tapi API tidak kasih 'REG'
              // Ini berguna jika API error parsial.
              console.log(
                `[SHIPPING] Warning: Service ${dbConfig.serviceCode} configured in DB but not returned by API/Fallback.`
              );
            }
          }
        } catch (err) {
          console.error(`Error processing courier ${courierCode}:`, err);
        }
      }

      // [CRITICAL FIX] Jika setelah filter hasilnya kosong, gunakan Fallback Murni
      // berdasarkan config database tanpa peduli response API
      if (allServices.length === 0) {
        console.warn(
          "[SHIPPING] No services matched. Forcing fallback based on DB Config."
        );
        for (const config of shippingConfigs) {
          // Hitung biaya manual kasar
          const fallbackCost = Math.max(10000, Math.ceil(weight / 1000) * 5000);
          allServices.push({
            serviceCode: config.serviceCode,
            name: `${config.courierCode.toUpperCase()} ${
              config.serviceName
            } (Emergency)`,
            description: "Pengiriman (Estimasi System)",
            cost: fallbackCost,
            etd: "3-7 Days",
            courier: config.courierCode,
          });
        }
      }

      // Filter by max distance
      const availableServices = allServices.filter(
        (service) => !service.maxDistance || distance <= service.maxDistance
      );

      // Handle Selection
      let selectedServiceData = undefined;
      if (selectedService) {
        selectedServiceData = availableServices.find(
          (s) => s.serviceCode === selectedService
        );
      }

      // Jika user belum pilih, atau pilihan user tidak valid lagi, jangan auto-select (biar frontend handle),
      // ATAU default ke yang termurah (opsional, disini kita return undefined biar user pilih).
      const totalShippingCost = selectedServiceData
        ? selectedServiceData.cost
        : 0;

      return {
        availableServices,
        selectedService: selectedServiceData,
        totalShippingCost,
        distance,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error("Shipping calculation error:", error);
      throw new AppError("Failed to calculate shipping", 500);
    }
  }

  async findNearestStore(userAddress: any): Promise<any> {
    const stores = await prisma.store.findMany({
      where: { deletedAt: null, cityId: { not: null } },
    });

    if (stores.length === 0) throw new AppError("No store available", 404);

    let nearestStore = stores[0];
    let minDistance = Infinity;

    for (const store of stores) {
      const distance = this.calculateDistance(
        {
          latitude: Number(userAddress.latitude),
          longitude: Number(userAddress.longitude),
        },
        {
          latitude: Number(store.latitude),
          longitude: Number(store.longitude),
        }
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestStore = store;
      }
    }

    // Jika minDistance masih Infinity (bug logic), ambil stores[0]
    if (minDistance === Infinity) minDistance = 0;

    return { store: nearestStore, distance: minDistance };
  }
}
