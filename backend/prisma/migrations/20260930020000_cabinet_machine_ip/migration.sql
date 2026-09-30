-- IP เครื่องตู้ (ใช้คำนวณ stock_id จากเลขท้าย)

ALTER TABLE `app_cabinets`
  ADD COLUMN `machine_ip` VARCHAR(45) NULL;
