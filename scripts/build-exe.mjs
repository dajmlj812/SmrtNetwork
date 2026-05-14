/**
 * Packages the Next.js standalone build into a single Windows .exe using caxa.
 * Run after `next build`: node scripts/build-exe.mjs
 *
 * Output: dist/SmrtNetwork.exe (~100-150 MB)
 * - Embeds Node.js runtime (no install needed on target machine)
 * - Config and data stored in %APPDATA%\SmrtNetwork on the target machine
 */

import { execSync } from "child_process";
import { cpSync, mkdirSync, writeFileSync, copyFileSync, existsSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execPath } from "process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const standalone = join(root, ".next", "standalone");
const dist = join(root, "dist");

if (!existsSync(standalone)) {
  console.error("ERROR: .next/standalone not found. Run `npm run build` first.");
  process.exit(1);
}

console.log("\n📦 Packaging SmrtNetwork...\n");

// 1. Copy browser-side static chunks into standalone so the server can serve them
console.log("  → Copying .next/static assets...");
cpSync(join(root, ".next", "static"), join(standalone, ".next", "static"), { recursive: true });

// 2. Copy public directory
if (existsSync(join(root, "public"))) {
  console.log("  → Copying public assets...");
  cpSync(join(root, "public"), join(standalone, "public"), { recursive: true });
}

// 3. Embed the current Node.js binary so the exe runs without Node installed
console.log(`  → Embedding Node.js runtime (${execPath})...`);
copyFileSync(execPath, join(standalone, "node.exe"));

// 4. Write the launcher that opens the browser and starts the server
console.log("  → Writing launcher...");
writeFileSync(
  join(standalone, "launcher.cjs"),
  `
'use strict';
const path = require('path');
const os  = require('os');
const fs  = require('fs');
const net = require('net');
const { exec } = require('child_process');

// Persist config + data next to the exe, not inside the temp extraction dir
const dataDir = process.env.APPDATA
  ? path.join(process.env.APPDATA, 'SmrtNetwork')
  : path.join(os.homedir(), '.smrt-network');
fs.mkdirSync(dataDir, { recursive: true });

process.env.SMRT_DATA_DIR = dataDir;
process.env.NODE_ENV      = 'production';

// Find the first free port starting at 3000
function findFreePort(port) {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(port, '127.0.0.1', () => srv.close(() => resolve(port)));
    srv.on('error', () => port < 3099 ? resolve(findFreePort(port + 1)) : reject(new Error('No free port 3000-3099')));
  });
}

async function main() {
  const port = await findFreePort(3000);
  process.env.PORT     = String(port);
  process.env.HOSTNAME = '127.0.0.1';

  const url = 'http://localhost:' + port;

  console.log('');
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║           SmrtNetwork v0.1           ║');
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');
  console.log('  URL        : ' + url);
  console.log('  Config dir : ' + dataDir);
  console.log('');
  console.log('  Opening browser in 3 seconds...');
  console.log('  Press Ctrl+C to stop the server.');
  console.log('');

  setTimeout(() => exec('start "" "' + url + '"'), 3000);

  // Start Next.js standalone server
  require('./server.js');
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
`.trimStart(),
  "utf8"
);

// 5. Create dist output directory
mkdirSync(dist, { recursive: true });

// 6. Bundle with caxa
const output = join(dist, "SmrtNetwork.exe");
console.log("  → Bundling executable (this takes 1-2 minutes)...\n");

execSync(
  [
    "npx caxa",
    `--input "${standalone}"`,
    `--output "${output}"`,
    `--`,
    `"{{caxa}}/node.exe"`,
    `"{{caxa}}/launcher.cjs"`,
  ].join(" "),
  { stdio: "inherit", cwd: root }
);

const sizeMB = (statSync(output).size / 1024 / 1024).toFixed(0);
console.log(`\n✅  dist/SmrtNetwork.exe  (${sizeMB} MB)`);
console.log("    Copy anywhere — double-click to run. No Node.js needed.");
console.log(`    Config stored in %APPDATA%\\SmrtNetwork\\`);
