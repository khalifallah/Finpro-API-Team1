import prisma from "../libs/prisma";

async function fixShipping() {
  console.log("Updating maxDistance to 20000km...");

  await prisma.shippingConfig.updateMany({
    data: {
      maxDistance: 20000, // Ubah dari 100 menjadi 20000
    },
  });

  console.log("Done!");
}

fixShipping()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
