import axios from "axios";
import AppError from "../errors/app.error";

export interface RajaOngkirCostParams {
  origin: string;
  destination: string;
  weight: number;
  courier: string;
}

export interface RajaOngkirCostResult {
  code: string;
  name: string;
  costs: Array<{
    service: string;
    description: string;
    cost: Array<{
      value: number;
      etd: string;
      note?: string;
    }>;
  }>;
}

export class RajaOngkirService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.RAJAONGKIR_API_KEY || "";
    this.baseUrl =
      process.env.RAJAONGKIR_BASE_URL || "https://rajaongkir.komerce.id/api/v1";
  }

  // --- MOCK DATA GENERATORS ---
  private getMockProvinces() {
    return [
      { province_id: "1", province: "Bali" },
      { province_id: "6", province: "DKI Jakarta" },
      { province_id: "9", province: "Jawa Barat" },
      { province_id: "10", province: "Jawa Tengah" },
      { province_id: "11", province: "Jawa Timur" },
    ];
  }

  private getMockCities(provinceId?: string) {
    const allCities = [
      {
        city_id: "114",
        province_id: "1",
        type: "Kota",
        city_name: "Denpasar",
        postal_code: "80227",
      },
      {
        city_id: "151",
        province_id: "6",
        type: "Kota",
        city_name: "Jakarta Barat",
        postal_code: "11220",
      },
      {
        city_id: "152",
        province_id: "6",
        type: "Kota",
        city_name: "Jakarta Pusat",
        postal_code: "10540",
      },
      {
        city_id: "153",
        province_id: "6",
        type: "Kota",
        city_name: "Jakarta Selatan",
        postal_code: "12230",
      },
      {
        city_id: "154",
        province_id: "6",
        type: "Kota",
        city_name: "Jakarta Timur",
        postal_code: "13330",
      },
      {
        city_id: "22",
        province_id: "9",
        type: "Kota",
        city_name: "Bandung",
        postal_code: "40111",
      },
      {
        city_id: "444",
        province_id: "11",
        type: "Kota",
        city_name: "Surabaya",
        postal_code: "60119",
      },
    ];

    if (provinceId) {
      return allCities.filter((c) => c.province_id === provinceId);
    }
    return allCities;
  }

  private getMockCost(courier: string, weight: number): RajaOngkirCostResult[] {
    // ... keep your existing mock logic here ...
    const baseCost = 10000;
    const weightKg = Math.ceil(weight / 1000);
    return [
      {
        code: courier,
        name: courier.toUpperCase(),
        costs: [
          {
            service: "REG",
            description: "Layanan Reguler (Mock)",
            cost: [
              { value: (baseCost + 5000) * weightKg, etd: "2-3", note: "" },
            ],
          },
        ],
      },
    ];
  }

  // --- API METHODS WITH FALLBACK ---
  async getCost(params: RajaOngkirCostParams): Promise<RajaOngkirCostResult[]> {
    try {
      if (!this.apiKey) throw new Error("No API Key");

      const formData = new URLSearchParams();
      formData.append("origin", params.origin);
      formData.append("originType", "city"); // REQUIRED for Komerce/Pro
      formData.append("destination", params.destination);
      formData.append("destinationType", "city"); // REQUIRED for Komerce/Pro
      formData.append("weight", params.weight.toString());
      formData.append("courier", params.courier);

      // Handle Endpoint differences
      let endpoint = "/cost";
      if (this.baseUrl.includes("komerce.id")) {
        endpoint = "/calculate/domestic-cost";
      }

      console.log(`🚀 Sending to ${params.courier.toUpperCase()}:`, {
        url: `${this.baseUrl}${endpoint}`,
        weight: params.weight,
      });

      const response = await axios.post(
        `${this.baseUrl}${endpoint}`,
        formData.toString(),
        {
          headers: {
            key: this.apiKey,
            "content-type": "application/x-www-form-urlencoded",
          },
        }
      );

      // [CRITICAL FIX] Handle Response Structure Safely
      let results: any[] = [];

      if (this.baseUrl.includes("komerce.id")) {
        // Komerce usually returns data in response.data.data
        results = response.data?.data;
      } else {
        // RajaOngkir standard
        results = response.data?.rajaongkir?.results;
      }

      // Check if results is valid array, if not return empty array (prevents crash)
      if (!results || !Array.isArray(results)) {
        console.warn(
          `API returned invalid data for ${params.courier}`,
          response.data
        );
        return [];
      }

      return results;
    } catch (error: any) {
      console.error(
        `RajaOngkir API Error (${params.courier}):`,
        error.response?.data?.meta?.message || error.message
      );
      // Return empty array instead of throwing, so other couriers can still work
      return [];
    }
  }

  // ... (Keep getCities and getProvinces as they are) ...
  async getCities(provinceId?: string): Promise<any> {
    try {
      if (!this.apiKey) throw new Error("No API Key");

      const url = provinceId
        ? `${this.baseUrl}/city?province=${provinceId}`
        : `${this.baseUrl}/city`;

      const response = await axios.get(url, { headers: { key: this.apiKey } });
      return response.data.rajaongkir.results;
    } catch (error) {
      console.warn("RajaOngkir API failed for cities, using mock data.");
      // Return Mock Data on failure
      return this.getMockCities(provinceId);
    }
  }
  async getProvinces(): Promise<any> {
    try {
      if (!this.apiKey) throw new Error("No API Key");

      const response = await axios.get(`${this.baseUrl}/province`, {
        headers: { key: this.apiKey },
      });
      return response.data.rajaongkir.results;
    } catch (error) {
      console.warn("RajaOngkir API failed for provinces, using mock data.");
      // Return Mock Data on failure
      return this.getMockProvinces();
    }
  }
}
