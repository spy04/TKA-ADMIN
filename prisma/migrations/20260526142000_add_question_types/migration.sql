-- AlterTable
ALTER TABLE `Question`
    ADD COLUMN `questionType` ENUM('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'ESSAY') NOT NULL DEFAULT 'SINGLE_CHOICE',
    ADD COLUMN `correctAnswers` TEXT NULL,
    ADD COLUMN `sampleAnswer` TEXT NULL,
    MODIFY `optionA` TEXT NULL,
    MODIFY `optionB` TEXT NULL,
    MODIFY `optionC` TEXT NULL,
    MODIFY `optionD` TEXT NULL,
    MODIFY `correctAnswer` ENUM('A', 'B', 'C', 'D') NULL;
