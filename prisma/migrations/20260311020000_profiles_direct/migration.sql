-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarColor" TEXT NOT NULL DEFAULT '#4f7cff';

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "directKey" TEXT,
ADD COLUMN     "isDirect" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Room_directKey_key" ON "Room"("directKey");

