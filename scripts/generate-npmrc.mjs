import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const npmrcPath = join(rootDir, ".npmrc");
const envPath = join(rootDir, ".env");

function readDotenvValue(key) {
  if (!existsSync(envPath)) {
    return undefined;
  }

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const name = trimmed.slice(0, separatorIndex).trim();

    if (name !== key) {
      continue;
    }

    const value = trimmed.slice(separatorIndex + 1).trim();
    return value.replace(/^(['"])(.*)\1$/, "$2");
  }

  return undefined;
}

const ghPackagesToken =
  process.env.GH_PACKAGES_TOKEN ?? readDotenvValue("GH_PACKAGES_TOKEN");

if (!ghPackagesToken) {
  throw new Error(
    "GH_PACKAGES_TOKEN is required in the environment or .env to generate .npmrc",
  );
}

const lines = [
  "@toshi7878:registry=https://npm.pkg.github.com",
  `//npm.pkg.github.com/:_authToken=${ghPackagesToken}`,
  "always-auth=true",
];

writeFileSync(npmrcPath, `${lines.join("\n")}\n`);
