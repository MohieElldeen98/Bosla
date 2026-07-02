import { pgSchema, uuid } from "drizzle-orm/pg-core";

/**
 * Shadow reference to Supabase's own `auth.users` table. Drizzle needs a
 * local table definition to model the `profiles.user_id` foreign key, but
 * this schema owns none of these columns and no migration here ever
 * creates or alters `auth.users` — Supabase Auth is the only writer.
 *
 * Never query this directly from application code — read identity via
 * `AuthRepository`/`SessionService` (Supabase Auth), never by selecting
 * from this table. Its only purpose is the foreign key in
 * `db/schema/profiles.ts`.
 */
export const authSchema = pgSchema("auth");

export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});
