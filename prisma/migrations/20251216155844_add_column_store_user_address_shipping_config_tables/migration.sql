/*
  Warnings:

  - Added the required column `courier_code` to the `shipping_configs` table without a default value. This is not possible if the table is not empty.
  - Made the column `address` on table `stores` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "shipping_configs" ADD COLUMN     "courier_code" VARCHAR(255) NOT NULL;

-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "province_id" VARCHAR(10),
ALTER COLUMN "address" SET NOT NULL,
ALTER COLUMN "city_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "user_addresses" ADD COLUMN     "city_id" VARCHAR(10),
ADD COLUMN     "province_id" VARCHAR(10);
