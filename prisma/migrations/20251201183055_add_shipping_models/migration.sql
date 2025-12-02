-- CreateTable
CREATE TABLE "shipping_configs" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "store_id" INTEGER NOT NULL,
    "service_name" VARCHAR(255) NOT NULL,
    "service_code" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "cost" INTEGER NOT NULL,
    "estimated_days" VARCHAR(50) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "max_distance" DOUBLE PRECISION,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "shipping_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_cost_cache" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "store_id" INTEGER NOT NULL,
    "origin_city_id" VARCHAR(10) NOT NULL,
    "destination_city_id" VARCHAR(10) NOT NULL,
    "service_code" VARCHAR(255) NOT NULL,
    "service_name" VARCHAR(255) NOT NULL,
    "cost" INTEGER NOT NULL,
    "estimated_days" VARCHAR(50) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "shipping_cost_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shipping_cost_cache_store_id_origin_city_id_destination_cit_key" ON "shipping_cost_cache"("store_id", "origin_city_id", "destination_city_id", "service_code");

-- AddForeignKey
ALTER TABLE "shipping_configs" ADD CONSTRAINT "shipping_configs_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_cost_cache" ADD CONSTRAINT "shipping_cost_cache_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
