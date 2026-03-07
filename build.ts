import { writeFileSync, readFileSync } from "node:fs";

const result = await Bun.build({
    entrypoints: ["src/main.ts"],
    outdir: "dist",
    target: "node",
    format: "esm",
    minify: false,
    packages: "bundle",
});

if (!result.success) {
    console.error("Build failed:");
    for (const log of result.logs) {
        console.error(log);
    }
    process.exit(1);
}

// Prepend shebang to the output file
const outPath = "dist/main.js";
const content = readFileSync(outPath, "utf-8");
writeFileSync(outPath, `#!/usr/bin/env node\n${content}`);
