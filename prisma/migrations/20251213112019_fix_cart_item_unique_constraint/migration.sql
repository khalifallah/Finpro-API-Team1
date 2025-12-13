/*
  Warnings:

  - A unique constraint covering the columns `[cart_id,product_id,store_id]` on the table `cart_items` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "cart_product";

-- CreateIndex
CREATE UNIQUE INDEX "cart_product_store" ON "cart_items"("cart_id", "product_id", "store_id");
