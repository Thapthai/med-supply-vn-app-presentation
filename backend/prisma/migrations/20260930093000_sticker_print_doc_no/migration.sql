-- เลขที่เอกสารต่อครั้งที่พิมพ์สติ๊กเกอร์

ALTER TABLE `app_sticker_print_histories`
  ADD COLUMN `doc_no` VARCHAR(32) NULL;

CREATE UNIQUE INDEX `app_sticker_print_histories_doc_no_key`
  ON `app_sticker_print_histories`(`doc_no`);
