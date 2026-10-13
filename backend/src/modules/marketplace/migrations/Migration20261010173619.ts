import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261010173619 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "vendor_admin" drop constraint if exists "vendor_admin_email_unique";`);
    this.addSql(`alter table if exists "vendor" drop constraint if exists "vendor_handle_unique";`);
    this.addSql(`create table if not exists "vendor" ("id" text not null, "handle" text not null, "name" text not null, "logo" text null, "status" text check ("status" in ('pending', 'active', 'suspended')) not null default 'pending', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "vendor_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_vendor_handle_unique" ON "vendor" ("handle") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_vendor_deleted_at" ON "vendor" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "vendor_admin" ("id" text not null, "first_name" text null, "last_name" text null, "email" text not null, "vendor_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "vendor_admin_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_vendor_admin_email_unique" ON "vendor_admin" ("email") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_vendor_admin_vendor_id" ON "vendor_admin" ("vendor_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_vendor_admin_deleted_at" ON "vendor_admin" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "vendor_refund" ("id" text not null, "vendor_order_id" text not null, "parent_order_id" text not null, "payment_id" text not null, "amount" numeric not null, "currency_code" text not null, "reason" text null, "created_by" text null, "raw_amount" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "vendor_refund_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_vendor_refund_vendor_order_id" ON "vendor_refund" ("vendor_order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_vendor_refund_parent_order_id" ON "vendor_refund" ("parent_order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_vendor_refund_deleted_at" ON "vendor_refund" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "vendor_admin" add constraint "vendor_admin_vendor_id_foreign" foreign key ("vendor_id") references "vendor" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "vendor_admin" drop constraint if exists "vendor_admin_vendor_id_foreign";`);

    this.addSql(`drop table if exists "vendor" cascade;`);

    this.addSql(`drop table if exists "vendor_admin" cascade;`);

    this.addSql(`drop table if exists "vendor_refund" cascade;`);
  }

}
