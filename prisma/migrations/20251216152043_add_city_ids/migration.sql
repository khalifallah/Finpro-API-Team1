/*
  Warnings:

  - Added the required column `city_id` to the `stores` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
-- Tambahkan DEFAULT '152' (Contoh ID Jakarta Pusat) agar data lama tidak error
ALTER TABLE "stores" ADD COLUMN "city_id" VARCHAR(10) NOT NULL DEFAULT '152';

-- AlterTable
-- Lakukan hal yang sama untuk user_addresses jika ada error serupa
ALTER TABLE "user_addresses" ADD COLUMN "city_id" VARCHAR(10) NOT NULL DEFAULT '152';

-- Opsional: Jika kamu ingin menghapus default setelah migrasi selesai (agar data baru nanti wajib isi manual), tambahkan ini di baris paling bawah:
ALTER TABLE "stores" ALTER COLUMN "city_id" DROP DEFAULT;
ALTER TABLE "user_addresses" ALTER COLUMN "city_id" DROP DEFAULT;
