import { PrismaClient } from "../generated/prisma-client";
import { ShippingService } from "./shipping.service";
import AppError from "../errors/app.error";

const prisma = new PrismaClient();

export interface HomepageData {
  navigation: {
    categories: Array<{
      id: number;
      name: string;
      productCount: number;
    }>;
    featuredLinks: Array<{
      name: string;
      url: string;
      icon?: string;
    }>;
  };
  heroSection: {
    carousel: Array<{
      id: number;
      title: string;
      description: string;
      imageUrl: string;
      link: string;
      type: "promotion" | "info" | "banner";
    }>;
  };
  nearestStore?: {
    id: number;
    name: string;
    address: string;
    distance?: number;
  };
  productList: {
    store: {
      id: number;
      name: string;
      address: string;
      distance?: number;
    };
    products: Array<{
      id: number;
      name: string;
      description: string;
      price: number;
      stock: number;
      category: {
        id: number;
        name: string;
      };
      images: Array<{
        id: number;
        imageUrl: string;
      }>;
      canAddToCart: boolean;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  footer: {
    companyInfo: {
      name: string;
      description: string;
      contactEmail: string;
    };
    quickLinks: Array<{
      name: string;
      url: string;
    }>;
    socialMedia: Array<{
      platform: string;
      url: string;
      icon: string;
    }>;
  };
}

export class HomepageService {
  private shippingService: ShippingService;

  constructor() {
    this.shippingService = new ShippingService();
  }

  async getHomepageData(
    latitude?: number,
    longitude?: number,
    page: number = 1,
    limit: number = 10,
    storeId?: number
  ): Promise<HomepageData> {
    try {
      let store;

      // LOGIC PENENTUAN TOKO:
      if (storeId) {
        // 1. Prioritas Utama: Jika storeId dikirim spesifik (Manual Select)
        store = await this.getStoreById(storeId);

        // (Opsional) Jika koordinat ada, hitung jaraknya sekalian biar UI tetap cantik
        if (latitude && longitude && store.latitude && store.longitude) {
          // Reuse logic hitung jarak (atau biarkan undefined)
          // store.distance = ...
        }
      } else {
        // 2. Prioritas Kedua: Auto-detect by Location
        store = await this.getNearestStore(latitude, longitude);
      }

      // 2. Get navigation data (categories)
      const categories = await this.getNavigationCategories();

      // 3. Get hero section carousel
      const carousel = await this.getHeroCarousel();

      // 4. Get products from nearest store
      const { products, total } = await this.getStoreProducts(
        store.id,
        page,
        limit
      );

      // 5. Get footer data
      const footer = await this.getFooterData();
      console.log(
        "Product images:",
        products.map((p) => ({
          name: p.name,
          imageCount: p.productImages.length,
          images: p.productImages.map((img) => ({
            id: img.id,
            imageUrl: img.imageUrl,
          })),
        }))
      );
      return {
        navigation: {
          categories: categories.map((cat) => ({
            id: cat.id,
            name: cat.name,
            productCount: cat._count?.products || 0,
          })),
          featuredLinks: [
            { name: "Home", url: "/", icon: "home" },
            { name: "Products", url: "/products", icon: "shopping-bag" },
            { name: "Categories", url: "/categories", icon: "grid" },
            { name: "Promotions", url: "/promotions", icon: "tag" },
            { name: "Cart", url: "/cart", icon: "shopping-cart" },
            { name: "Profile", url: "/profile", icon: "user" },
          ],
        },
        heroSection: {
          carousel: carousel.map((item) => ({
            id: item.id,
            title: item.title,
            description: item.description || "",
            imageUrl: item.imageUrl,
            link: item.link || "#",
            type: item.type as "promotion" | "info" | "banner",
          })),
        },
        nearestStore: {
          id: store.id,
          name: store.name,
          address: store.address || "",
          distance: latitude && longitude ? store.distance : undefined,
        },
        productList: {
          store: {
            id: store.id,
            name: store.name,
            address: store.address || "",
            distance: latitude && longitude ? store.distance : undefined,
          },
          products: products.map((product) => ({
            id: product.id,
            name: product.name,
            description: product.description || "",
            price: product.defaultPrice,
            stock: product.stock?.quantity || 0,
            category: {
              id: product.category.id,
              name: product.category.name,
            },
            images: product.productImages.map((img) => ({
              id: img.id,
              imageUrl: img.imageUrl,
            })),
            canAddToCart: (product.stock?.quantity || 0) > 0,
          })),
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
        footer,
      };
    } catch (error) {
      console.error("HomepageService error:", error);
      throw new AppError("Failed to load homepage data", 500);
    }
  }

  private async getNearestStore(
    latitude?: number,
    longitude?: number
  ): Promise<any> {
    try {
      // If location provided, find nearest store
      if (latitude && longitude) {
        const userLocation = {
          latitude,
          longitude,
          fullAddress: "User Location",
          recipientName: "User",
        };

        const nearestStore = await this.shippingService.findNearestStore(
          userLocation
        );
        return {
          ...nearestStore.store,
          distance: nearestStore.distance,
        };
      }

      // If no location, get default/main store
      const defaultStore = await prisma.store.findFirst({
        where: {
          deletedAt: null,
        },
        orderBy: {
          id: "asc",
        },
      });

      if (!defaultStore) {
        throw new AppError("No store available", 404);
      }

      return defaultStore;
    } catch (error) {
      console.error("Error finding nearest store:", error);
      // Fallback to default store
      const defaultStore = await prisma.store.findFirst({
        where: {
          deletedAt: null,
        },
        orderBy: {
          id: "asc",
        },
      });

      if (!defaultStore) {
        throw new AppError("No store available", 404);
      }

      return defaultStore;
    }
  }

  private async getNavigationCategories() {
    return await prisma.category.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            products: {
              where: {
                deletedAt: null,
              },
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
      take: 10, // Limit to 10 categories for navigation
    });
  }

  private async getHeroCarousel() {
    // For now, return some featured products as carousel items
    // In a real app, you might have a separate Carousel model
    const featuredProducts = await prisma.product.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        productImages: {
          where: {
            deletedAt: null,
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    });

    return featuredProducts.map((product, index) => ({
      id: product.id,
      title: product.name,
      description: product.description || `Check out our ${product.name}!`,
      imageUrl:
        product.productImages[0]?.imageUrl ||
        "https://via.placeholder.com/800x400",
      link: `/products/${product.id}`,
      type: index === 0 ? "promotion" : "banner",
    }));
  }

  private async getStoreProducts(storeId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;

    // Get product IDs available in this store
    const productStocks = await prisma.productStock.findMany({
      where: {
        storeId,
        deletedAt: null,
        quantity: {
          gt: 0, // Only products with stock
        },
      },
      select: {
        productId: true,
        quantity: true,
      },
    });

    const productIds = productStocks.map((stock) => stock.productId);

    if (productIds.length === 0) {
      return { products: [], total: 0 };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: {
          id: {
            in: productIds,
          },
          deletedAt: null,
        },
        include: {
          category: true,
          productImages: {
            where: {
              deletedAt: null,
            },
            take: 3,
          },
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.product.count({
        where: {
          id: {
            in: productIds,
          },
          deletedAt: null,
        },
      }),
    ]);

    // Merge with stock information
    const productsWithStock = products.map((product) => {
      const stock = productStocks.find((s) => s.productId === product.id);
      return {
        ...product,
        stock: stock || { quantity: 0 },
        // Ensure images structure matches frontend expectations
        images: product.productImages.map((img) => ({
          id: img.id,
          imageUrl: img.imageUrl,
        })),
      };
    });
    return {
      products: productsWithStock,
      total,
    };
  }

  private async getFooterData() {
    // This could be stored in database or config
    return {
      companyInfo: {
        name: "Beyond Market",
        description: "Your online grocery shopping solution",
        contactEmail: "support@beyondmarket.com",
      },
      quickLinks: [
        { name: "About Us", url: "/about" },
        { name: "Contact", url: "/contact" },
        { name: "FAQ", url: "/faq" },
        { name: "Privacy Policy", url: "/privacy" },
        { name: "Terms of Service", url: "/terms" },
      ],
      socialMedia: [
        {
          platform: "Facebook",
          url: "https://facebook.com/beyondmarket",
          icon: "facebook",
        },
        {
          platform: "Instagram",
          url: "https://instagram.com/beyondmarket",
          icon: "instagram",
        },
        {
          platform: "Twitter",
          url: "https://twitter.com/beyondmarket",
          icon: "twitter",
        },
      ],
    };
  }

  // Get store by ID (for testing/fallback)
  async getStoreById(storeId: number) {
    const store = await prisma.store.findUnique({
      where: {
        id: storeId,
        deletedAt: null,
      },
    });

    if (!store) {
      throw new AppError("Store not found", 404);
    }

    return store;
  }
}
