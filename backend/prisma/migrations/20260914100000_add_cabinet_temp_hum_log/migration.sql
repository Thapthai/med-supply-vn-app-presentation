-- อุณหภูมิ/ความชื้นของตู้ (ตาราง weighing ตาม DDL cabinet_temp_hum_log)

CREATE TABLE IF NOT EXISTS `cabinet_temp_hum_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `cabinet_id` int(11) NOT NULL DEFAULT 0,
  `temp_log` decimal(5,2) NOT NULL DEFAULT 0.00,
  `hum_log` decimal(5,2) NOT NULL DEFAULT 0.00,
  `create_date` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_cabinet_date` (`cabinet_id`,`create_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
