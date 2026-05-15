/**
 * Packages the Next.js standalone build into a single Linux binary using caxa.
 * Run after `next build`: node scripts/build-linux.mjs
 *
 * Output: dist/SmrtNetwork-linux (~100-150 MB)
 * - Embeds Node.js runtime (no install needed on target machine)
 * - Config and data stored in ~/.config/SmrtNetwork
 */

import { execSync } from "child_process";
import { cpSync, mkdirSync, writeFileSync, copyFileSync, existsSync, statSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execPath } from "process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const standalone = join(root, ".next", "standalone");
const dist = join(root, "dist");

const { version } = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

if (!existsSync(standalone)) {
  console.error("ERROR: .next/standalone not found. Run `npm run build` first.");
  process.exit(1);
}

console.log("\n📦 Packaging SmrtNetwork for Linux...\n");

// 1. Copy browser-side static chunks
console.log("  → Copying .next/static assets...");
cpSync(join(root, ".next", "static"), join(standalone, ".next", "static"), { recursive: true });

// 2. Copy public directory
if (existsSync(join(root, "public"))) {
  console.log("  → Copying public assets...");
  cpSync(join(root, "public"), join(standalone, "public"), { recursive: true });
}

// 3. Embed Node.js binary
console.log(`  → Embedding Node.js runtime (${execPath})...`);
copyFileSync(execPath, join(standalone, "node"));

// 4. Write launcher
console.log("  → Writing launcher...");
writeFileSync(
  join(standalone, "launcher.cjs"),
  `
'use strict';
const path = require('path');
const os   = require('os');
const fs   = require('fs');
const net  = require('net');
const { exec } = require('child_process');

const dataDir = process.env.XDG_CONFIG_HOME
  ? path.join(process.env.XDG_CONFIG_HOME, 'SmrtNetwork')
  : path.join(os.homedir(), '.config', 'SmrtNetwork');
fs.mkdirSync(dataDir, { recursive: true });

process.env.SMRT_DATA_DIR = dataDir;
process.env.NODE_ENV      = 'production';

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
  console.log('  ║       SmrtNetwork v${version.padEnd(18)}║');
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');
  console.log('  URL        : ' + url);
  console.log('  Config dir : ' + dataDir);
  console.log('');
  console.log('  Opening browser in 3 seconds...');
  console.log('  Press Ctrl+C to stop the server.');
  console.log('');

  // Try xdg-open, fall back to sensible-browser or just print the URL
  setTimeout(() => {
    exec('xdg-open "' + url + '"', (err) => {
      if (err) exec('sensible-browser "' + url + '"', (err2) => {
        if (err2) console.log('  Navigate to: ' + url);
      });
    });
  }, 3000);

  process.chdir(__dirname);
  require('./server.js');
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
`.trimStart(),
  "utf8"
);

// 5. Create dist directory
mkdirSync(dist, { recursive: true });

// 6. Bundle with caxa
const output = join(dist, "SmrtNetwork-linux");
console.log("  → Bundling binary (this takes 1-2 minutes)...\n");

execSync(
  [
    "npx caxa",
    `--input "${standalone}"`,
    `--output "${output}"`,
    `--`,
    `"{{caxa}}/node"`,
    `"{{caxa}}/launcher.cjs"`,
  ].join(" "),
  { stdio: "inherit", cwd: root }
);

// Make executable
execSync(`chmod +x "${output}"`, { cwd: root });

const sizeMB = (statSync(output).size / 1024 / 1024).toFixed(0);

console.log(`\n✅  dist/SmrtNetwork-linux   (${sizeMB} MB)`);
console.log("    Config stored in ~/.config/SmrtNetwork/");
console.log("    Run with: ./dist/SmrtNetwork-linux");
console.log("");
console.log("    To run as a systemd service, use the example unit file in docs/");
