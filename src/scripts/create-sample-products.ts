import { PrismaClient } from "../generated/prisma-client";

const prisma = new PrismaClient();

async function createSampleProducts() {
  console.log("Creating sample products...");

  try {
    // Cek apakah kategori sudah ada
    let category = await prisma.category.findFirst({
      where: { name: "Groceries" },
    });

    if (!category) {
      category = await prisma.category.create({
        data: {
          name: "Groceries",
        },
      });
      console.log("Created category: Groceries");
    }

    // Sample products
    const sampleProducts = [
      {
        name: "Organic Apples",
        description: "Fresh organic apples from local farm",
        defaultPrice: 25000,
        categoryId: category.id,
      },
      {
        name: "Whole Wheat Bread",
        description: "Freshly baked whole wheat bread",
        defaultPrice: 15000,
        categoryId: category.id,
      },
      {
        name: "Fresh Milk",
        description: "1 liter fresh milk",
        defaultPrice: 18000,
        categoryId: category.id,
      },
      {
        name: "Organic Eggs",
        description: "12 organic free-range eggs",
        defaultPrice: 35000,
        categoryId: category.id,
      },
      {
        name: "Basmati Rice",
        description: "1kg premium basmati rice",
        defaultPrice: 45000,
        categoryId: category.id,
      },
    ];

    for (const productData of sampleProducts) {
      const existingProduct = await prisma.product.findFirst({
        where: {
          name: productData.name,
          deletedAt: null,
        },
      });

      if (!existingProduct) {
        const product = await prisma.product.create({
          data: productData,
        });
        console.log(`Created product: ${product.name} (ID: ${product.id})`);

        // Buat product image default
        await prisma.productImage.create({
          data: {
            productId: product.id,
            imageUrl:
              "https://via.placeholder.com/400x400.png?text=Product+Image",
          },
        });

        // Buat stock untuk semua stores (ID 1 dan 2)
        const stores = [1, 2];
        for (const storeId of stores) {
          await prisma.productStock.create({
            data: {
              productId: product.id,
              storeId: storeId,
              quantity: 100,
            },
          });
          console.log(`   Stock created in store ${storeId}: 100 units`);
        }
      } else {
        console.log(
          `roduct already exists: ${existingProduct.name} (ID: ${existingProduct.id})`
        );
      }
    }

    console.log("Sample products created successfully!");
  } catch (error) {
    console.error("Error creating sample products:", error);
    throw error;
  }
}

createSampleProducts()
  .catch((e) => {
    console.error("Fatal error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
