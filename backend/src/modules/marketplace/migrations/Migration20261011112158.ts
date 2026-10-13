import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261011112158 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "vendor" drop constraint if exists "vendor_status_check";`);

    this.addSql(`alter table if exists "vendor" add column if not exists "closing_requested_at" timestamptz null, add column if not exists "archived_at" timestamptz null;`);
    this.addSql(`alter table if exists "vendor" add constraint "vendor_status_check" check("status" in ('pending', 'active', 'suspended', 'closing', 'archived'));`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "vendor" drop constraint if exists "vendor_status_check";`);

    this.addSql(`alter table if exists "vendor" drop column if exists "closing_requested_at", drop column if exists "archived_at";`);

    this.addSql(`alter table if exists "vendor" add constraint "vendor_status_check" check("status" in ('pending', 'active', 'suspended'));`);
  }

}
