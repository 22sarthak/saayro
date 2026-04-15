import { mkdirSync, writeFileSync } from "node:fs";

const distPath = new URL("../dist", import.meta.url);
mkdirSync(distPath, { recursive: true });
writeFileSync(new URL("./build.txt", distPath), "config package uses source-of-truth JSON and CJS assets.\n");

console.log("config package build marker created.");
