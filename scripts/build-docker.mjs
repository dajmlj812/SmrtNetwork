#!/usr/bin/env node
// Build (and optionally push) the SmrtNetwork Docker image.
//
//   node scripts/build-docker.mjs          # build only, tagged with package.json version + latest
//   node scripts/build-docker.mjs --push   # build + push both tags to Docker Hub
//
// Override the namespace via env: DOCKER_NAMESPACE=youraccount node scripts/build-docker.mjs

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));

const namespace = process.env.DOCKER_NAMESPACE ?? "dajmlj812";
const name = "smrtnetwork";
const version = pkg.version;
const push = process.argv.includes("--push");

const versionTag = `${namespace}/${name}:${version}`;
const latestTag = `${namespace}/${name}:latest`;

function run(cmd, args) {
  console.log(`\n$ ${cmd} ${args.join(" ")}`);
  const result = spawnSync(cmd, args, { stdio: "inherit", cwd: root, shell: process.platform === "win32" });
  if (result.status !== 0) {
    console.error(`\nCommand failed with exit code ${result.status}`);
    process.exit(result.status ?? 1);
  }
}

console.log(`Building ${versionTag} and ${latestTag} ...`);
run("docker", ["build", "-t", versionTag, "-t", latestTag, "."]);

if (push) {
  console.log(`\nPushing both tags to Docker Hub (namespace: ${namespace}) ...`);
  console.log("If this fails with 'denied: requested access', run: docker login");
  run("docker", ["push", versionTag]);
  run("docker", ["push", latestTag]);
  console.log(`\nPushed:\n  ${versionTag}\n  ${latestTag}`);
} else {
  console.log(`\nBuilt locally. To push, re-run with --push (after 'docker login').`);
}
