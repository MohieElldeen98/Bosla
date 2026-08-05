/**
 * One-time backfill: `profiles.status` activation was only ever wired
 * through the sign-up email-confirmation link (`AuthService.verifyOtp`),
 * which never fires for a sign-up that gets an immediate Supabase session
 * or for the OAuth path — see docs/authentication-architecture.md
 * "Profile lifecycle". `ProfileService.recordLogin` now self-heals this
 * going forward for every future sign-in; this script activates the
 * existing rows that are already stuck: `status = 'pending'` but a real
 * `last_login_at` (proof the account already works).
 *
 * Never touches a row without a real login on it, and never touches
 * `suspended`/`archived`/`deleted` — only `pending` rows qualify.
 *
 * Usage:  node --env-file=.env.local scripts/backfill-pending-profiles-with-login.mjs [--dry-run]
 */

import postgres from "postgres";

const dryRun = process.argv.includes("--dry-run");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL must be set.");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { max: 1 });

async function main() {
  const affected = await sql`
    SELECT id, email, role, last_login_at, created_at
    FROM profiles
    WHERE status = 'pending' AND last_login_at IS NOT NULL
    ORDER BY last_login_at DESC
  `;

  console.log(`Found ${affected.length} pending profile(s) with a real last_login_at:\n`);
  for (const row of affected) {
    console.log(`  ${row.email}  (role: ${row.role}, last_login_at: ${row.last_login_at.toISOString()})`);
  }

  if (affected.length === 0) {
    console.log("\nNothing to do.");
    await sql.end();
    return;
  }

  if (dryRun) {
    console.log("\n--dry-run: no rows updated.");
    await sql.end();
    return;
  }

  const updated = await sql`
    UPDATE profiles
    SET status = 'active', updated_at = now()
    WHERE status = 'pending' AND last_login_at IS NOT NULL
    RETURNING id, email
  `;
  console.log(`\nActivated ${updated.length} profile(s).`);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
