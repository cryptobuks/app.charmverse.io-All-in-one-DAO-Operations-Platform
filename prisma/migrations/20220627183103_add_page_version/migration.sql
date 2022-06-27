-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- CreateTrigger
CREATE OR REPLACE FUNCTION increment_version() RETURNS trigger AS $body$
BEGIN
  new.version := new.version + 1;
  return new;
END;
$body$ LANGUAGE plpgsql;

CREATE TRIGGER version_trigger
   BEFORE UPDATE ON "Page"
   FOR EACH ROW
   EXECUTE FUNCTION increment_version();