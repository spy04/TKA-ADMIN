-- AlterTable
ALTER TABLE `Material`
    ADD COLUMN `filePath` VARCHAR(191) NULL,
    ADD COLUMN `coverPath` VARCHAR(191) NULL,
    ADD COLUMN `fileUrl` TEXT NULL,
    ADD COLUMN `coverUrl` TEXT NULL;
