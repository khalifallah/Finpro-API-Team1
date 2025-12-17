import prisma from "../libs/prisma";

// 1. The Function Definition (This is what you already had)
async function seedShippingConfigs() {

  const stores = await prisma.store.findMany();

  if (stores.length === 0) {
    console.warn(
      "No stores found! Make sure you have Stores in the database first."
    );
    return;
  }

  for (const store of stores) {
    // Optional: Check if config already exists to avoid duplicates
    // But since you deleted everything, createMany is fine.
    await prisma.shippingConfig.createMany({
      data: [
        {
          storeId: store.id,
          courierCode: "jne",
          serviceCode: "REG",
          serviceName: "JNE Reguler",
          description: "Layanan reguler JNE",
          isActive: true,
          maxDistance: 100,
          cost: 12000,
          estimatedDays: "2",
        },
        {
          storeId: store.id,
          courierCode: "jne",
          serviceCode: "OKE",
          serviceName: "JNE OKE",
          description: "Layanan ekonomi JNE",
          isActive: true,
          maxDistance: 100,
          cost: 9000,
          estimatedDays: "4",
        },
        {
          storeId: store.id,
          courierCode: "pos",
          serviceCode: "REG",
          serviceName: "POS Reguler",
          description: "Layanan reguler POS",
          isActive: true,
          maxDistance: 100,
          cost: 10000,
          estimatedDays: "3",
        },
      ],
      skipDuplicates: true, // Safety: Skips if exactly same data exists
    });
  }
  console.log("Seeding finished.");
}

// 2. The Execution Block (THE MISSING PART)
seedShippingConfigs()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    // 3. Close the connection when done
    await prisma.$disconnect();
  });
