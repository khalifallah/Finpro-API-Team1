import prisma from "../libs/prisma";
import AppError from "../errors/app.error";
import axios from "axios";
import { AddressService } from "./address.service";

export interface ICalculateShippingParams {
  origin: {
    cityId: string;
    cityName: string;
  };
  destination: {
    cityId: string;
    cityName: string;
  };
  weight: number; // dalam gram
  courier: string; // jne, pos, tiki, dll
}

export interface IShippingService {
  service: string;
  description: string;
  cost: number;
  etd: string; // estimated time of delivery
}

export interface ICoordinate {
  latitude: number;
  longitude: number;
}

export class ShippingService {
  private rajaOngkirApiKey: string;
  private rajaOngkirBaseUrl: string;
  private addressService: AddressService; // Add this

  constructor() {
    this.rajaOngkirApiKey = process.env.RAJAONGKIR_API_KEY || "";
    this.rajaOngkirBaseUrl =
      process.env.RAJAONGKIR_BASE_URL || "https://api.rajaongkir.com/starter";
    this.addressService = new AddressService(); // Initialize here
  }

  // Replace this throwing method:
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

  // 1. Hitung jarak menggunakan Haversine formula
  calculateDistance(coord1: ICoordinate, coord2: ICoordinate): number {
    const R = 6371; // Radius bumi dalam kilometer
    const dLat = this.deg2rad(coord2.latitude - coord1.latitude);
    const dLon = this.deg2rad(coord2.longitude - coord1.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(coord1.latitude)) *
        Math.cos(this.deg2rad(coord2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Jarak dalam kilometer

    return distance;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // 2. Cek cache shipping cost dari database
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
      return {
        cost: cached.cost,
        etd: cached.estimatedDays,
      };
    }

    return null;
  }

  // 3. Simpan shipping cost ke cache
  async cacheShippingCost(
    storeId: number,
    originCityId: string,
    destinationCityId: string,
    serviceCode: string,
    serviceName: string,
    cost: number,
    etd: string
  ): Promise<void> {
    // Set expire dalam 1 hari
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

  // 4. Hitung shipping cost menggunakan RajaOngkir API
  async calculateShippingRajaOngkir(
    params: ICalculateShippingParams
  ): Promise<IShippingService[]> {
    if (!this.rajaOngkirApiKey) {
      throw new AppError("RajaOngkir API key not configured", 500);
    }

    try {
      const response = await axios.post(
        `${this.rajaOngkirBaseUrl}/cost`,
        {
          origin: params.origin.cityId,
          destination: params.destination.cityId,
          weight: params.weight,
          courier: params.courier,
        },
        {
          headers: {
            key: this.rajaOngkirApiKey,
            "content-type": "application/x-www-form-urlencoded",
          },
        }
      );

      if (response.data.rajaongkir.status.code !== 200) {
        throw new AppError(
          `RajaOngkir API error: ${response.data.rajaongkir.status.description}`,
          400
        );
      }

      const results: IShippingService[] = [];
      const courierResults = response.data.rajaongkir.results[0];

      if (courierResults && courierResults.costs) {
        for (const cost of courierResults.costs) {
          results.push({
            service: cost.service,
            description: cost.description,
            cost: cost.cost[0].value,
            etd: cost.cost[0].etd,
          });
        }
      }

      return results;
    } catch (error: any) {
      console.error("RajaOngkir API error:", error);

      // Fallback ke perhitungan manual jika API gagal
      return this.calculateShippingFallback(params);
    }
  }

  // 5. Fallback calculation jika API tidak tersedia
  private calculateShippingFallback(
    params: ICalculateShippingParams
  ): IShippingService[] {
    // Default shipping options dengan perkiraan biaya
    const baseCost = 15000; // Biaya dasar
    const perKgCost = 5000; // Biaya per kg

    const weightInKg = params.weight / 1000;
    const estimatedCost = Math.max(
      baseCost,
      Math.round(weightInKg * perKgCost)
    );

    return [
      {
        service: "REG",
        description: "Reguler",
        cost: estimatedCost,
        etd: "2-3 hari",
      },
      {
        service: "ECO",
        description: "Economy",
        cost: Math.round(estimatedCost * 0.8),
        etd: "4-5 hari",
      },
      {
        service: "YES",
        description: "Same Day",
        cost: Math.round(estimatedCost * 2),
        etd: "1 hari",
      },
    ];
  }

  // 6. Get available shipping services untuk store
  async getStoreShippingServices(storeId: number): Promise<any[]> {
    return await prisma.shippingConfig.findMany({
      where: {
        storeId,
        isActive: true,
        deletedAt: null,
      },
      orderBy: {
        cost: "asc",
      },
    });
  }

  // 7. Hitung shipping cost untuk checkout
  async calculateShippingForCheckout(
    storeId: number,
    userAddress: any,
    weight: number,
    selectedService?: string
  ): Promise<{
    availableServices: any[];
    selectedService?: any;
    totalShippingCost: number;
    distance: number;
  }> {
    try {
      // Dapatkan store information
      const store = await prisma.store.findUnique({
        where: { id: storeId },
      });

      if (!store) {
        throw new AppError("Store not found", 404);
      }

      // Hitung jarak antara alamat user dan store yang dipilih
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

      // Dapatkan konfigurasi shipping dari store yang dipilih
      const shippingServices = await this.getStoreShippingServices(storeId);

      // Check if shipping services exist
      if (shippingServices.length === 0) {
        console.warn(`No shipping services configured for store ${storeId}`);
        throw new AppError(
          "No shipping services available for the selected store",
          400
        );
      }

      // Filter services berdasarkan jarak maksimum
      const availableServices = shippingServices.filter(
        (service) => !service.maxDistance || distance <= service.maxDistance
      );

      if (availableServices.length === 0) {
        throw new AppError(
          "No shipping services available for this distance",
          400
        );
      }

      // Jika ada selected service, validasi
      let selectedServiceData = null;
      if (selectedService) {
        selectedServiceData = availableServices.find(
          (service) => service.serviceCode === selectedService
        );

        if (!selectedServiceData) {
          throw new AppError("Selected shipping service not available", 400);
        }
      }

      // Hitung total shipping cost dengan weight factor
      const totalShippingCost = selectedServiceData
        ? Math.round(selectedServiceData.cost * (weight / 1000))
        : Math.round(availableServices[0].cost * (weight / 1000));

      return {
        availableServices,
        selectedService: selectedServiceData,
        totalShippingCost,
        distance,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error("Shipping calculation error:", error);
      throw new AppError("Failed to calculate shipping", 500);
    }
  }

  // 8. Get nearest store to user address
  async findNearestStore(userAddress: any): Promise<any> {
    const stores = await prisma.store.findMany({
      where: {
        deletedAt: null,
      },
    });

    if (stores.length === 0) {
      throw new AppError("No store available", 404);
    }

    let nearestStore = stores[0];
    let minDistance = this.calculateDistance(
      {
        latitude: Number(userAddress.latitude),
        longitude: Number(userAddress.longitude),
      },
      {
        latitude: Number(stores[0].latitude),
        longitude: Number(stores[0].longitude),
      }
    );

    for (let i = 1; i < stores.length; i++) {
      const distance = this.calculateDistance(
        {
          latitude: Number(userAddress.latitude),
          longitude: Number(userAddress.longitude),
        },
        {
          latitude: Number(stores[i].latitude),
          longitude: Number(stores[i].longitude),
        }
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestStore = stores[i];
      }
    }

    return {
      store: nearestStore,
      distance: minDistance,
    };
  }
}
