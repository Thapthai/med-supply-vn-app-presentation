-- เอกสารควบคุมการเบิกอุปกรณ์ให้หน่วยงาน (Department Dispense)

CREATE TABLE `app_department_dispense_documents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `doc_no` VARCHAR(32) NOT NULL,
    `department_id` INTEGER NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED',
    `remark` TEXT NULL,
    `created_by_user_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `app_department_dispense_documents_doc_no_key`(`doc_no`),
    INDEX `app_department_dispense_documents_department_id_idx`(`department_id`),
    INDEX `app_department_dispense_documents_created_at_idx`(`created_at` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `app_department_dispense_document_lines` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `document_id` INTEGER NOT NULL,
    `line_order` INTEGER NOT NULL DEFAULT 0,
    `itemcode` VARCHAR(25) NOT NULL,
    `item_name` VARCHAR(255) NULL,
    `qty` INTEGER NOT NULL DEFAULT 1,
    `location_row` VARCHAR(50) NULL,
    `location_rack` VARCHAR(50) NULL,
    `location_shelf` VARCHAR(50) NULL,
    `store_ref` VARCHAR(255) NULL,
    `slot_no` INTEGER NULL,
    `sensor` INTEGER NULL,

    INDEX `app_department_dispense_document_lines_document_id_idx`(`document_id`),
    INDEX `app_department_dispense_document_lines_itemcode_idx`(`itemcode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `app_department_dispense_documents`
ADD CONSTRAINT `app_department_dispense_documents_department_id_fkey`
FOREIGN KEY (`department_id`) REFERENCES `department`(`ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `app_department_dispense_documents`
ADD CONSTRAINT `app_department_dispense_documents_created_by_user_id_fkey`
FOREIGN KEY (`created_by_user_id`) REFERENCES `app_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `app_department_dispense_document_lines`
ADD CONSTRAINT `app_department_dispense_document_lines_document_id_fkey`
FOREIGN KEY (`document_id`) REFERENCES `app_department_dispense_documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `app_department_dispense_document_lines`
ADD CONSTRAINT `app_department_dispense_document_lines_itemcode_fkey`
FOREIGN KEY (`itemcode`) REFERENCES `item`(`itemcode`) ON DELETE RESTRICT ON UPDATE CASCADE;
