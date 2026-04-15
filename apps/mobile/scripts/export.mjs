import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

rmSync(new URL("../build", import.meta.url), { force: true, recursive: true });

const cwd = fileURLToPath(new URL("..", import.meta.url));

const result =
  process.platform === "win32"
    ? spawnSync(
        "cmd.exe",
        ["/d", "/s", "/c", "pnpm exec expo export --platform ios --platform android --output-dir build"],
        {
          cwd,
          stdio: "inherit"
        }
      )
    : spawnSync("pnpm", ["exec", "expo", "export", "--platform", "ios", "--platform", "android", "--output-dir", "build"], {
        cwd,
        stdio: "inherit"
      });

if (typeof result.status === "number" && result.status !== 0) {
  process.exit(result.status);
}

if (result.error) {
  throw result.error;
}
