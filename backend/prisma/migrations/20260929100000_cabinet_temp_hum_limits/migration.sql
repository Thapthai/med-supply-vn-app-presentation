-- เกณฑ์อุณหภูมิและความชื้นของตู้ (ปรับต่ำสุด/สูงสุด)

ALTER TABLE `app_cabinets`
  ADD COLUMN `temp_min` DECIMAL(5, 2) NULL,
  ADD COLUMN `temp_max` DECIMAL(5, 2) NULL,
  ADD COLUMN `hum_min` DECIMAL(5, 2) NULL,
  ADD COLUMN `hum_max` DECIMAL(5, 2) NULL;
