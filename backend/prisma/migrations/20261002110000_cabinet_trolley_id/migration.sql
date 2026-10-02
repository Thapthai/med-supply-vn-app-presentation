-- ตู้นาโคติกอ้าง item_narcotic_detail.trolley_id แทน stock_id
-- คอลัมน์อาจมีอยู่แล้วในฐานจริง — รัน ADD เฉพาะเมื่อยังไม่มี

SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'app_cabinets'
    AND COLUMN_NAME = 'trolley_id'
);

SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE `app_cabinets` ADD COLUMN `trolley_id` INT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE `app_cabinets`
  SET `trolley_id` = `stock_id`
  WHERE `trolley_id` IS NULL
    AND `stock_id` IS NOT NULL
    AND UPPER(IFNULL(`cabinet_type`, '')) LIKE '%NARCOTIC%';

SET @idx_exists := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'app_cabinets'
    AND INDEX_NAME = 'app_cabinets_trolley_id_key'
);

SET @sql := IF(
  @idx_exists = 0,
  'CREATE UNIQUE INDEX `app_cabinets_trolley_id_key` ON `app_cabinets` (`trolley_id`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
