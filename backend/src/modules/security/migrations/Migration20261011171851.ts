import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261011171851 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "audit_event" ("id" text not null, "action" text not null, "actor_type" text null, "actor_id" text null, "actor_email" text null, "ip" text null, "target_type" text null, "target_id" text null, "metadata" jsonb null, "anonymized_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "audit_event_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_audit_event_action" ON "audit_event" ("action") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_audit_event_actor_id" ON "audit_event" ("actor_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_audit_event_target_id" ON "audit_event" ("target_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_audit_event_deleted_at" ON "audit_event" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "login_attempt" ("id" text not null, "key" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "login_attempt_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_login_attempt_key" ON "login_attempt" ("key") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_login_attempt_deleted_at" ON "login_attempt" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "audit_event" cascade;`);

    this.addSql(`drop table if exists "login_attempt" cascade;`);
  }

}
