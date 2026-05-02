/**
 * Promote (or create) an admin user.
 *
 *   pnpm --filter @lingualoop/api make-admin -- <email> [password]
 *
 * If a user with the given email already exists, their role is set to
 * 'admin' and their password is left untouched. If they don't exist
 * yet, a new admin account is created with the provided password
 * (required in that case).
 */

import "dotenv/config";
import { pool } from "../db.js";
import { hashPassword } from "../auth.js";

async function main() {
  const [, , emailArg, passwordArg] = process.argv;
  if (!emailArg) {
    console.error("Usage: make-admin <email> [password]");
    process.exit(1);
  }
  const email = emailArg.toLowerCase().trim();

  if (!pool) {
    console.error("DATABASE_URL missing in packages/api/.env");
    process.exit(1);
  }

  const existing = await pool.query<{ id: string; email: string; role: string }>(
    `SELECT id, email, role FROM users WHERE email = $1`,
    [email],
  );

  if (existing.rows.length > 0) {
    const u = existing.rows[0];
    if (u.role === "admin") {
      console.log(`✓ ${email} is already an admin (no change).`);
    } else {
      await pool.query(
        `UPDATE users SET role = 'admin', updated_at = NOW() WHERE id = $1`,
        [u.id],
      );
      console.log(
        `✓ Promoted ${email} to admin. Use the password you registered with — log out and back in for the new role to take effect.`,
      );
    }
    await pool.end();
    return;
  }

  // User doesn't exist — need a password to create.
  if (!passwordArg || passwordArg.length < 8) {
    console.error(
      `✗ ${email} is not registered yet. Pass a password as the second arg to create them, e.g.:\n  pnpm --filter @lingualoop/api make-admin -- ${email} 'YourStrongPassword!'`,
    );
    await pool.end();
    process.exit(1);
  }

  const passwordHash = await hashPassword(passwordArg);
  const inserted = await pool.query<{ id: string }>(
    `INSERT INTO users (email, password_hash, role, full_name)
     VALUES ($1, $2, 'admin', $3)
     RETURNING id`,
    [email, passwordHash, "Admin"],
  );
  console.log(
    `✓ Created admin user ${email} (id ${inserted.rows[0].id}). You can sign in with the password you provided. Change it after first login.`,
  );
  await pool.end();
}

main().catch(async (err) => {
  console.error("make-admin failed", err);
  if (pool) await pool.end();
  process.exit(1);
});
