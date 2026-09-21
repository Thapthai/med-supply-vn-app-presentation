-- แผนก / ตู้ ในประวัติพิมพ์สติ๊กเกอร์ (mapping จาก app_cabinet_departments)

ALTER TABLE `app_sticker_print_histories`
  ADD COLUMN `department_id` int(11) DEFAULT NULL AFTER `template`,
  ADD COLUMN `cabinet_id` int(11) DEFAULT NULL AFTER `department_id`,
  ADD COLUMN `department_name` varchar(200) DEFAULT NULL AFTER `cabinet_id`,
  ADD COLUMN `cabinet_name` varchar(255) DEFAULT NULL AFTER `department_name`;

ALTER TABLE `app_sticker_print_histories`
  ADD INDEX `app_sticker_print_histories_department_id_idx` (`department_id`),
  ADD INDEX `app_sticker_print_histories_cabinet_id_idx` (`cabinet_id`);

ALTER TABLE `app_sticker_print_histories`
  ADD CONSTRAINT `app_sticker_print_histories_department_id_fkey`
    FOREIGN KEY (`department_id`) REFERENCES `department` (`ID`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `app_sticker_print_histories_cabinet_id_fkey`
    FOREIGN KEY (`cabinet_id`) REFERENCES `app_cabinets` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
