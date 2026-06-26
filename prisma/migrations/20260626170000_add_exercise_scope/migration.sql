-- CreateEnum
CREATE TYPE "ExerciseScope" AS ENUM ('CATEGORY', 'TOPIC');

-- AlterTable
ALTER TABLE "Exercise"
ADD COLUMN "scope" "ExerciseScope" NOT NULL DEFAULT 'TOPIC';
