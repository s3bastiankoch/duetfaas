#!/usr/bin/env node
import "dotenv/config";
import yargs from "yargs";
import path from "path";
import { cp, mkdir, rm } from "fs/promises";
import { build } from "esbuild";

import { readConfig } from "./config.js";

const CLI_VERSION = "0.0.1";

async function main() {
  console.log(`You are running CLI version ${CLI_VERSION}`);

  const { config: configPath } = await yargs(process.argv.slice(2))
    .version(CLI_VERSION)
    .option("config", {
      describe: "specify path to the config file",
      type: "string",
    })
    .default("config", "config.yml")
    .help().argv;

  // Read config.yaml
  const config = await readConfig(path.join(process.cwd(), configPath));

  // Clean the .faas-duet directory
  console.log("Cleaning up old build artifacts...");
  await rm(path.join(process.cwd(), ".faas-duet"), {
    recursive: true,
    force: true,
  });

  if (config.type === "micro") {
    console.log("Microbenchmarks");

    // Build lambda_a
    await build({
      entryPoints: [config.lambda_a.entry],
      outdir: path.join(process.cwd(), ".faas-duet/lambda_a"),
      format: "esm",
      minify: true,
      bundle: true,
      platform: "node",
    });

    // Build lambda_b
    await build({
      entryPoints: [config.lambda_b.entry],
      outdir: path.join(process.cwd(), ".faas-duet/lambda_b"),
      format: "esm",
      minify: true,
      bundle: true,
      platform: "node",
    });

    await cp(
      path.join(
        process.cwd(),
        "cli",
        "templates",
        config.platform,
        "duet-micro"
      ),
      path.join(process.cwd(), ".faas-duet"),
      {
        recursive: true,
      }
    );

    return;
  }

  await rm(path.join(process.cwd(), ".faas-classic-a"), {
    recursive: true,
    force: true,
  });
  await rm(path.join(process.cwd(), ".faas-classic-b"), {
    recursive: true,
    force: true,
  });

  // Build the project
  console.log("Building project...");
  await mkdir(path.join(process.cwd(), ".faas-duet"), { recursive: true });
  await mkdir(path.join(process.cwd(), ".faas-classic-a"), {
    recursive: true,
  });
  await mkdir(path.join(process.cwd(), ".faas-classic-b"), {
    recursive: true,
  });
  await mkdir(path.join(process.cwd(), ".faas-rmit"), {
    recursive: true,
  });

  // Build first lambda
  await build({
    entryPoints: [config.lambda_a.entry],
    outdir: path.join(process.cwd(), ".faas-duet/lambda_a"),
    format: "esm",
    minify: true,
    bundle: true,
    platform: "node",
  });

  await build({
    entryPoints: [config.lambda_a.entry],
    outdir: path.join(process.cwd(), ".faas-classic-a/lambda"),
    format: "esm",
    minify: true,
    bundle: true,
    platform: "node",
  });

  await build({
    entryPoints: [config.lambda_a.entry],
    outdir: path.join(process.cwd(), ".faas-rmit/lambda_a"),
    format: "esm",
    minify: true,
    bundle: true,
    platform: "node",
  });

  // Build second lambda
  await build({
    entryPoints: [config.lambda_b.entry],
    outdir: path.join(process.cwd(), ".faas-duet/lambda_b"),
    format: "esm",
    minify: true,
    bundle: true,
    platform: "node",
  });

  await build({
    entryPoints: [config.lambda_b.entry],
    outdir: path.join(process.cwd(), ".faas-classic-b/lambda"),
    format: "esm",
    minify: true,
    bundle: true,
    platform: "node",
  });

  await build({
    entryPoints: [config.lambda_b.entry],
    outdir: path.join(process.cwd(), ".faas-rmit/lambda_b"),
    format: "esm",
    minify: true,
    bundle: true,
    platform: "node",
  });

  // Copy duet-server-template to .faas-duet
  await cp(
    path.join(process.cwd(), "cli", "duet-server-template"),
    path.join(process.cwd(), ".faas-duet"),
    {
      recursive: true,
    }
  );

  // Do the same thing for classic-template
  await cp(
    path.join(process.cwd(), "cli", "classic-template"),
    path.join(process.cwd(), ".faas-classic-a"),
    {
      recursive: true,
    }
  );

  await cp(
    path.join(process.cwd(), "cli", "classic-template"),
    path.join(process.cwd(), ".faas-classic-b"),
    {
      recursive: true,
    }
  );

  // Do the same thing for rmit-template
  await cp(
    path.join(process.cwd(), "cli", "rmit-template"),
    path.join(process.cwd(), ".faas-rmit"),
    {
      recursive: true,
    }
  );

  console.log("Project built successfully!");
}

main();
