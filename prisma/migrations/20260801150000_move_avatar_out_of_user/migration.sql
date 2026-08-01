-- CreateTable
CREATE TABLE "UserPhoto" (
    "userId" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "contentType" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPhoto_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "UserPhoto" ADD CONSTRAINT "UserPhoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Move any existing base64 data-URI avatars out of User.image and into the new
-- table, then point User.image at the route that serves them. decode() handles
-- the base64 payload after the "data:<type>;base64," prefix.
INSERT INTO "UserPhoto" ("userId", "data", "contentType", "updatedAt")
SELECT
    "id",
    decode(substring("image" from position(',' in "image") + 1), 'base64'),
    substring("image" from 6 for position(';' in "image") - 6),
    NOW()
FROM "User"
WHERE "image" LIKE 'data:image/%;base64,%';

UPDATE "User"
SET "image" = '/api/profile/photo?v=' || floor(extract(epoch from NOW()) * 1000)::bigint
WHERE "id" IN (SELECT "userId" FROM "UserPhoto");
