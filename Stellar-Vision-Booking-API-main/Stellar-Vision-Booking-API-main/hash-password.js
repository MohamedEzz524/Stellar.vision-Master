// Tiny CLI utility to generate a bcrypt hash for the admin password.
// Usage:  node hash-password.js <yourPassword>
// Then copy the printed hash into .env as ADMIN_PASSWORD_HASH=...

const bcrypt = require("bcryptjs");

const password = process.argv[2];
if (!password) {
  console.error("Usage: node hash-password.js <password>");
  process.exit(1);
}

const rounds = 12;
const hash = bcrypt.hashSync(password, rounds);
console.log("\nPaste this into your .env as:\n");
console.log(`ADMIN_PASSWORD_HASH=${hash}\n`);
