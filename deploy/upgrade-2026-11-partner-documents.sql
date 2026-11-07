-- Upgrade the live database for the papers sent with a partner application (docs/app-spec.md, F7; 2026-11-07): one new
-- table, `partner_application_document`. Adds only. Apply AFTER `upgrade-2026-11-partners.sql` (it points at that
-- file's `partner_application` table).
--
-- How this file was made: `node --import tsx deploy/schema-diff.mjs 4a3bfa1`, read through by hand.
--
-- Nothing else changes in the database for the other changes shipped with it: a partner who is also a customer is the
-- same `user` row with the `partner` role, and a customer who refers friends gets a `partner` row (the table already
-- exists) when they first open their referral page.
--
-- How to apply (after a backup, from /opt/k9training on the server), then deploy without --db-push:
--   docker compose --env-file .env -f compose.server.yaml exec -T db \
--     psql -U zurvan -d zurvan -v ON_ERROR_STOP=1 < deploy/upgrade-2026-11-partner-documents.sql
-- One transaction; a second run fails on the first statement and changes nothing.

BEGIN;

CREATE TABLE "partner_application_document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"format" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"file_name" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "partner_application_document" ADD CONSTRAINT "partner_application_document_application_id_partner_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."partner_application"("id") ON DELETE restrict ON UPDATE no action;
CREATE INDEX "partner_application_document_application_idx" ON "partner_application_document" USING btree ("application_id");

COMMIT;
