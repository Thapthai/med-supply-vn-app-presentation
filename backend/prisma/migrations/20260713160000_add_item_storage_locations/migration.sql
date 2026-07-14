-- CreateTable: 1 item มีได้หลายตำแหน่ง — unique ที่ itemcode + Row + Rack + Shelf
CREATE TABLE `app_item_storage_locations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `itemcode` VARCHAR(25) NOT NULL,
    `location_row` VARCHAR(50) NOT NULL DEFAULT '',
    `location_rack` VARCHAR(50) NOT NULL DEFAULT '',
    `location_shelf` VARCHAR(50) NOT NULL DEFAULT '',
    `qty` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `uq_item_storage_location`(`itemcode`, `location_row`, `location_rack`, `location_shelf`),
    INDEX `app_item_storage_locations_itemcode_idx`(`itemcode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `app_item_storage_locations` ADD CONSTRAINT `app_item_storage_locations_itemcode_fkey` FOREIGN KEY (`itemcode`) REFERENCES `item`(`itemcode`) ON DELETE CASCADE ON UPDATE CASCADE;
