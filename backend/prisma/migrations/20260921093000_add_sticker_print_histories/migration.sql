-- ประวัติการพิมพ์สติ๊กเกอร์

CREATE TABLE IF NOT EXISTS `app_sticker_print_histories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `printed_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `printed_by_user_id` int(11) DEFAULT NULL,
  `source` varchar(32) NOT NULL,
  `host` varchar(128) DEFAULT NULL,
  `port` int(11) DEFAULT NULL,
  `template` varchar(64) DEFAULT NULL,
  `line_count` int(11) NOT NULL DEFAULT 0,
  `total_copies` int(11) NOT NULL DEFAULT 0,
  `total_bytes_sent` int(11) NOT NULL DEFAULT 0,
  `status` varchar(16) NOT NULL DEFAULT 'SUCCESS',
  `remark` varchar(512) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `app_sticker_print_histories_printed_at_idx` (`printed_at`),
  KEY `app_sticker_print_histories_printed_by_user_id_idx` (`printed_by_user_id`),
  KEY `app_sticker_print_histories_status_idx` (`status`),
  KEY `app_sticker_print_histories_source_idx` (`source`),
  CONSTRAINT `app_sticker_print_histories_printed_by_user_id_fkey`
    FOREIGN KEY (`printed_by_user_id`) REFERENCES `app_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `app_sticker_print_history_lines` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `history_id` int(11) NOT NULL,
  `line_order` int(11) NOT NULL DEFAULT 0,
  `itemcode` varchar(25) NOT NULL,
  `item_name` varchar(255) DEFAULT NULL,
  `copies` int(11) NOT NULL DEFAULT 1,
  `expire_date` varchar(10) DEFAULT NULL,
  `bytes_sent` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `app_sticker_print_history_lines_history_id_idx` (`history_id`),
  KEY `app_sticker_print_history_lines_itemcode_idx` (`itemcode`),
  CONSTRAINT `app_sticker_print_history_lines_history_id_fkey`
    FOREIGN KEY (`history_id`) REFERENCES `app_sticker_print_histories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
