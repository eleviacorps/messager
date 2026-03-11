const { execSync } = require("child_process");
const path = require("path");

const schemaPath = process.env.PRISMA_SCHEMA || path.join("prisma", "schema.prisma");
const normalized = schemaPath.replace(/\\/g, "/");

const run = (cmd) => execSync(cmd, { stdio: "inherit" });

run(`npx prisma generate --schema="${normalized}"`);

const shouldPush = ["1", "true", "yes"].includes((process.env.PRISMA_DB_PUSH || "").toLowerCase());
if (shouldPush) {
  run(`npx prisma db push --schema="${normalized}"`);
}
