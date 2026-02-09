import { build } from "esbuild";

await build({
    entryPoints: ["src/main.ts"],
    bundle: true,
    platform: "node",
    target: "node20",
    format: "esm",
    outfile: "dist/main.js",
    banner: { js: "#!/usr/bin/env node" },
    alias: {
        "@triliumnext/commons": "./Trilium/packages/commons/src/index.ts",
    },
});
