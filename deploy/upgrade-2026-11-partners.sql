-- Upgrade the live database for partner applications, partnership terms and the lead details (docs/app-spec.md, F7;
-- 2026-11-06): a new `partner_application` table, the partner's business name and kind, and the guardian's and dog's
-- details on each phone lead. Adds only: no table or column is dropped and no row is changed (existing leads get empty
-- details). The terms' acceptances go in the existing `consent` table (`kind` is free text).
--
-- How this file was made: `node --import tsx deploy/schema-diff.mjs 6a75125`, read through by hand.
--
-- Why it exists: `deploy.sh --db-push` cannot upgrade a database with a composite-primary-key table (docs/deploy.md).
--
-- How to apply (after a backup, from /opt/k9training on the server), then deploy without --db-push:
--   docker compose --env-file .env -f compose.server.yaml exec -T db \
--     psql -U zurvan -d zurvan -v ON_ERROR_STOP=1 < deploy/upgrade-2026-11-partners.sql
-- It is one transaction: if any statement fails, nothing is changed. Running it a second time fails on the first
-- statement («relation already exists») and changes nothing.

BEGIN;

CREATE TABLE "partner_application" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"phone_number" text NOT NULL,
	"business_name" text NOT NULL,
	"business_type" text NOT NULL,
	"address" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"marketer_name" text DEFAULT '' NOT NULL,
	"terms_version" text NOT NULL,
	"terms_accepted_at" timestamp NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reject_reason" text,
	"partner_id" text,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "partner" ADD COLUMN "business_name" text;
ALTER TABLE "partner" ADD COLUMN "business_type" text;
ALTER TABLE "partner_lead" ADD COLUMN "guardian_name" text DEFAULT '' NOT NULL;
ALTER TABLE "partner_lead" ADD COLUMN "dog_name" text DEFAULT '' NOT NULL;
ALTER TABLE "partner_lead" ADD COLUMN "dog_breed" text DEFAULT '' NOT NULL;
ALTER TABLE "partner_lead" ADD COLUMN "dog_age" text DEFAULT '' NOT NULL;
ALTER TABLE "partner_application" ADD CONSTRAINT "partner_application_partner_id_partner_user_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partner"("user_id") ON DELETE restrict ON UPDATE no action;
CREATE INDEX "partner_application_status_idx" ON "partner_application" USING btree ("status","created_at");

CREATE UNIQUE INDEX "partner_application_pending_phone_idx" ON "partner_application" USING btree ("phone_number") WHERE "partner_application"."status" = 'pending';

COMMIT;
