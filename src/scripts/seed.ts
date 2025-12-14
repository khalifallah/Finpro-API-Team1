import prisma from "../libs/prisma";

async function main() {
  console.log("Starting seed...");

  // Gunakan transaction untuk memastikan data konsisten
  await prisma.$transaction(async (tx) => {
    // Hapus data dengan urutan yang benar untuk menghindari foreign key constraint
    // 1. Hapus data yang bergantung pada shippingConfig dulu (jika ada)
    await tx.shippingCostCache.deleteMany({});

    // 2. Hapus shippingConfig
    await tx.shippingConfig.deleteMany({});

    // 3. JANGAN hapus store jika sudah ada data terkait
    // Sebagai gantinya, update store yang sudah ada atau buat jika belum ada

    console.log("Existing shipping data cleared");
  });

  // Cek apakah store sudah ada
  const existingStore1 = await prisma.store.findUnique({
    where: { id: 1 },
  });

  const existingStore2 = await prisma.store.findUnique({
    where: { id: 2 },
  });

  // Create or update stores
  const store1 = await prisma.store.upsert({
    where: { id: 1 },
    update: {
      name: "Beyond Market Central",
      address: "Jl. Sudirman No. 123, Jakarta Pusat",
      latitude: -6.2088,
      longitude: 106.8456,
    },
    create: {
      id: 1,
      name: "Beyond Market Central",
      address: "Jl. Sudirman No. 123, Jakarta Pusat",
      latitude: -6.2088,
      longitude: 106.8456,
    },
  });

  const store2 = await prisma.store.upsert({
    where: { id: 2 },
    update: {
      name: "Beyond Market Bandung",
      address: "Jl. Asia Afrika No. 45, Bandung",
      latitude: -6.9175,
      longitude: 107.6191,
    },
    create: {
      id: 2,
      name: "Beyond Market Bandung",
      address: "Jl. Asia Afrika No. 45, Bandung",
      latitude: -6.9175,
      longitude: 107.6191,
    },
  });

  console.log("Stores created/updated:", store1.name, "and", store2.name);

  // Create shipping configurations for store1
  await prisma.shippingConfig.createMany({
    data: [
      {
        storeId: store1.id,
        serviceName: "REG",
        serviceCode: "REG",
        description: "Regular Delivery - 2-3 days",
        cost: 15000,
        estimatedDays: "2-3 hari",
        maxDistance: 100,
        isActive: true,
      },
      {
        storeId: store1.id,
        serviceName: "ECO",
        serviceCode: "ECO",
        description: "Economy Delivery - 4-5 days",
        cost: 10000,
        estimatedDays: "4-5 hari",
        maxDistance: 100,
        isActive: true,
      },
      {
        storeId: store1.id,
        serviceName: "EXP",
        serviceCode: "EXP",
        description: "Express Delivery - 1 day",
        cost: 30000,
        estimatedDays: "1 hari",
        maxDistance: 50,
        isActive: true,
      },
      {
        storeId: store1.id,
        serviceName: "SDS",
        serviceCode: "SDS",
        description: "Same Day Service",
        cost: 50000,
        estimatedDays: "Hari yang sama",
        maxDistance: 25,
        isActive: true,
      },
    ],
  });

  // Create shipping configurations for store2
  await prisma.shippingConfig.createMany({
    data: [
      {
        storeId: store2.id,
        serviceName: "REG",
        serviceCode: "REG",
        description: "Regular Delivery - 2-3 days",
        cost: 12000,
        estimatedDays: "2-3 hari",
        maxDistance: 80,
        isActive: true,
      },
      {
        storeId: store2.id,
        serviceName: "EXP",
        serviceCode: "EXP",
        description: "Express Delivery - 1 day",
        cost: 25000,
        estimatedDays: "1 hari",
        maxDistance: 40,
        isActive: true,
      },
    ],
  });

  console.log("Shipping configurations created");

  // Create sample user addresses for testing
  const sampleAddresses = [
    {
      label: "Kantor",
      fullAddress: "Jl. Thamrin No. 10, Jakarta Pusat",
      latitude: -6.1955,
      longitude: 106.8229,
      recipientName: "John Doe",
      recipientPhone: "081234567890",
      isMain: true,
    },
    {
      label: "Rumah",
      fullAddress: "Jl. Kebon Jeruk Raya No. 27, Jakarta Barat",
      latitude: -6.1892,
      longitude: 106.793,
      recipientName: "Jane Doe",
      recipientPhone: "081298765432",
      isMain: false,
    },
    {
      label: "Apartemen",
      fullAddress: "Jl. Gatot Subroto Kav. 21, Jakarta Selatan",
      latitude: -6.2232,
      longitude: 106.8129,
      recipientName: "Bob Smith",
      recipientPhone: "081311223344",
      isMain: false,
    },
  ];

  // Find a user to attach addresses to
  const user = await prisma.user.findFirst({
    where: { email: "user3@gmail.com" },
  });

  if (user) {
    // Delete existing sample addresses first
    await prisma.userAddress.deleteMany({
      where: {
        userId: user.id,
        label: { in: ["Kantor", "Rumah", "Apartemen"] },
      },
    });

    await prisma.userAddress.createMany({
      data: sampleAddresses.map((addr) => ({
        ...addr,
        userId: user.id,
      })),
    });
    console.log("Sample user addresses created");
  } else {
    console.log("User not found, skipping address creation");
  }

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
