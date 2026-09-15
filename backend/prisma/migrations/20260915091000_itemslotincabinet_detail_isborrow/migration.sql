-- ฐาน presentation ยังไม่มีคอลัมน์ที่ schema ItemSlotInCabinetDetail ใช้
ALTER TABLE `itemslotincabinet_detail`
  ADD COLUMN `IsBorrow` TINYINT(1) NULL DEFAULT 0,
  ADD COLUMN `DepID` INT NULL;

ALTER TABLE `itemslotincabinet_detail`
  ADD CONSTRAINT `itemslotincabinet_detail_DepID_fkey`
  FOREIGN KEY (`DepID`) REFERENCES `department`(`ID`)
  ON DELETE SET NULL ON UPDATE CASCADE;
