#!/usr/bin/env node
/**
 * Bära — CI-compatible Expo web export script.
 *
 * Replaces the previous Metro-scraping approach which required a running
 * Replit environment and could not work in GitHub Actions.
 *
 * This script runs `expo export --platform web` as a single headless
 * command that exits when the build is done. No dev server needed.
 *
 * Output: artifacts/bara/static-build/
 */

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const projectRoot = path.resolve(__dirname, "..");
const outputDir = process.env.OUTPUT_DIR || "static-build";
const outPath = path.join(projectRoot, outputDir);

console.log("=== Bära — Expo web export ===");
console.log(`Project root : ${projectRoot}`);
console.log(`Output dir   : ${outPath}`);
console.log();

// Clean previous build so we always get a fresh output
if (fs.existsSync(outPath)) {
  fs.rmSync(outPath, { recursive: true, force: true });
  console.log("Cleaned previous build directory.");
}

const env = {
  ...process.env,
  NODE_ENV: "production",
  CI: "1",
};

// expo export handles bundling + asset processing in one shot.
// --platform web   → only the web target (no native bundles needed for CI)
// --output-dir     → write output to static-build/ instead of default dist/
const cmd = `npx expo export --platform web --output-dir ${outputDir}`;

console.log(`Running: ${cmd}\n`);

try {
  execSync(cmd, {
    cwd: projectRoot,
    stdio: "inherit",
    env,
  });
} catch (err) {
  console.error("\nExpo export failed.");
  process.exit(1);
}

// Verify output was created
if (!fs.existsSync(outPath)) {
  console.error(`\nERROR: Output directory not created: ${outPath}`);
  process.exit(1);
}

const files = fs.readdirSync(outPath);
console.log(`\nBuild complete. ${files.length} item(s) in ${outputDir}/:`);
files.slice(0, 20).forEach((f) => console.log(`  ${f}`));
if (files.length > 20) console.log(`  ... and ${files.length - 20} more`);
