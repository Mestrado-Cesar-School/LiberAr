// Aplica as migrações no banco de teste uma vez por execução do vitest.
import { execSync } from "node:child_process";

export default function globalSetup() {
  const url =
    process.env.TEST_DATABASE_URL ?? "postgresql://liberar:liberar@localhost:5434/liberar_test";
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });
}
