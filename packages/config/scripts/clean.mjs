import { rmSync } from "node:fs";

rmSync(new URL("../dist", import.meta.url), { force: true, recursive: true });

console.log("config package artifacts cleaned.");
