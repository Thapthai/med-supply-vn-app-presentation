-- ตำแหน่ง Row/Rack/Shelf ต่อช่องในตู้ (อ้างอิง itemslotincabinet / itemslotincabinet_detail)

CREATE TABLE `app_cabinet_slot_locations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `stock_id` INTEGER NOT NULL,
    `slot_no` INTEGER NOT NULL,
    `sensor` INTEGER NOT NULL DEFAULT 0,
    `location_row` VARCHAR(50) NULL,
    `location_rack` VARCHAR(50) NULL,
    `location_shelf` VARCHAR(50) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `uq_cabinet_slot_location`(`stock_id`, `slot_no`, `sensor`),
    INDEX `app_cabinet_slot_locations_stock_id_idx`(`stock_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `app_cabinet_slot_locations`
ADD CONSTRAINT `app_cabinet_slot_locations_stock_id_fkey`
FOREIGN KEY (`stock_id`) REFERENCES `app_cabinets`(`stock_id`) ON DELETE CASCADE ON UPDATE CASCADE;
