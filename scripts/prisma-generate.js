const { execSync } = require("child_process");
const path = require("path");

const schemaPath = process.env.PRISMA_SCHEMA || path.join("prisma", "schema.prisma");
const normalized = schemaPath.replace(/\\/g, "/");

const run = (cmd) => execSync(cmd, { stdio: "inherit" });

console.log(`[prisma] schema: ${normalized}`);
run(`npx prisma generate --schema="${normalized}"`);

const shouldMigrate = ["1", "true", "yes"].includes((process.env.PRISMA_MIGRATE || "").toLowerCase());
if (shouldMigrate) {
  console.log("[prisma] running migrate deploy");
  run(`npx prisma migrate deploy --schema="${normalized}"`);
} else {
  console.log("[prisma] migrate deploy skipped");
}

const shouldPush = ["1", "true", "yes"].includes((process.env.PRISMA_DB_PUSH || "").toLowerCase());
if (shouldPush) {
  console.log("[prisma] running db push");
  run(`npx prisma db push --schema="${normalized}"`);
} else {
  console.log("[prisma] db push skipped");
}
