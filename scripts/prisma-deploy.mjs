import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const rootDir = process.cwd();
const migrationsDir = resolve(rootDir, "prisma", "migrations");

if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

const hasMigrations =
  existsSync(migrationsDir) &&
  readdirSync(migrationsDir, { withFileTypes: true }).some((entry) => entry.isDirectory());

const prismaArgs = hasMigrations ? ["prisma", "migrate", "deploy"] : ["prisma", "db", "push"];
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";

console.log(`[prisma-deploy] running: ${npxCommand} ${prismaArgs.join(" ")}`);

const result = spawnSync(npxCommand, prismaArgs, {
  stdio: "inherit",
  shell: process.platform !== "win32",
  env: process.env
});

if (typeof result.status === "number" && result.status !== 0) {
  process.exit(result.status);
}

if (result.error) {
  console.error("[prisma-deploy] failed", result.error);
  process.exit(1);
}
