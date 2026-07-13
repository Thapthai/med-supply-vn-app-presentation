-- CreateTable: ตำแหน่งจัดเก็บอุปกรณ์ แยกจาก itemstock / itemslotincabinet
CREATE TABLE `app_item_storage_locations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `stock_id` INTEGER NOT NULL,
    `itemcode` VARCHAR(25) NOT NULL,
    `location_row` VARCHAR(50) NULL,
    `location_rack` VARCHAR(50) NULL,
    `location_shelf` VARCHAR(50) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `uq_item_storage_location`(`stock_id`, `itemcode`),
    INDEX `app_item_storage_locations_stock_id_idx`(`stock_id`),
    INDEX `app_item_storage_locations_itemcode_idx`(`itemcode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `app_item_storage_locations` ADD CONSTRAINT `app_item_storage_locations_stock_id_fkey` FOREIGN KEY (`stock_id`) REFERENCES `app_cabinets`(`stock_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `app_item_storage_locations` ADD CONSTRAINT `app_item_storage_locations_itemcode_fkey` FOREIGN KEY (`itemcode`) REFERENCES `item`(`itemcode`) ON DELETE CASCADE ON UPDATE CASCADE;
