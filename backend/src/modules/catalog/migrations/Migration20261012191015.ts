import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261012191015 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "catalog_product" drop constraint if exists "catalog_product_handle_unique";`);
    this.addSql(`create table if not exists "catalog_product" ("id" text not null, "handle" text not null, "title" text not null, "brand" text null, "description" text null, "category_handle" text null, "attributes" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "catalog_product_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_catalog_product_handle_unique" ON "catalog_product" ("handle") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_catalog_product_title" ON "catalog_product" ("title") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_catalog_product_brand" ON "catalog_product" ("brand") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_catalog_product_category_handle" ON "catalog_product" ("category_handle") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_catalog_product_deleted_at" ON "catalog_product" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "catalog_product" cascade;`);
  }

}
