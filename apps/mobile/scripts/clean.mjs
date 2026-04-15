import { rmSync } from "node:fs";

rmSync(new URL("../build", import.meta.url), { force: true, recursive: true });
rmSync(new URL("../.expo", import.meta.url), { force: true, recursive: true });
