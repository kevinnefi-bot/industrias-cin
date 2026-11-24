const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const schemaPath = path.resolve(__dirname, "../prisma/schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf-8");

const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
const isPostgres = dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://");
const targetProvider = isPostgres ? "postgresql" : "sqlite";

console.log(`[DB Setup] DATABASE_URL detectada: ${isPostgres ? "PostgreSQL (Producción / Remota)" : "SQLite (Local / Offline)"}`);
console.log(`[DB Setup] Configurando provider en schema.prisma -> "${targetProvider}"`);

// Reemplazar provider en datasource db
const updatedSchema = schema.replace(
  /datasource\s+db\s*\{\s*provider\s*=\s*"[^"]+"\s*url\s*=\s*env\("DATABASE_URL"\)\s*\}/,
  `datasource db {\n  provider = "${targetProvider}"\n  url      = env("DATABASE_URL")\n}`
);

if (schema !== updatedSchema) {
  fs.writeFileSync(schemaPath, updatedSchema, "utf-8");
  console.log(`[DB Setup] schema.prisma actualizado a provider = "${targetProvider}".`);
} else {
  console.log(`[DB Setup] schema.prisma ya tenía provider = "${targetProvider}".`);
}

// Regenerar Prisma Client según el provider seleccionado
try {
  console.log(`[DB Setup] Ejecutando prisma generate para ${targetProvider}...`);
  execSync("npx prisma generate", { stdio: "inherit" });
} catch (e) {
  console.error("[DB Setup] Error generando Prisma Client:", e.message);
  process.exit(1);
}
