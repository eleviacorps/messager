const { execSync } = require("child_process");
const path = require("path");

const schemaPath = process.env.PRISMA_SCHEMA || path.join("prisma", "schema.prisma");
const normalized = schemaPath.replace(/\\/g, "/");

execSync(`npx prisma generate --schema="${normalized}"`, {
  stdio: "inherit"
});
