-- CreateTable
CREATE TABLE `Question` (
    `id` VARCHAR(191) NOT NULL,
    `prompt` TEXT NOT NULL,
    `optionA` TEXT NOT NULL,
    `optionB` TEXT NOT NULL,
    `optionC` TEXT NOT NULL,
    `optionD` TEXT NOT NULL,
    `correctAnswer` ENUM('A', 'B', 'C', 'D') NOT NULL,
    `explanation` TEXT NULL,
    `orderNumber` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `exerciseId` VARCHAR(191) NOT NULL,

    INDEX `Question_exerciseId_idx`(`exerciseId`),
    UNIQUE INDEX `Question_exerciseId_orderNumber_key`(`exerciseId`, `orderNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Question` ADD CONSTRAINT `Question_exerciseId_fkey` FOREIGN KEY (`exerciseId`) REFERENCES `Exercise`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
