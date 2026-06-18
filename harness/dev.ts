import { spawn, type ChildProcess } from "node:child_process";

const commands = [
  ["run", "dev"],
  ["run", "build:ui:watch"],
  ["run", "dev:harness:web"]
];

const children: ChildProcess[] = commands.map((args) =>
  spawn("npm", args, {
    stdio: "inherit",
    shell: process.platform === "win32"
  })
);

let stopping = false;
const stop = (code = 0) => {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill("SIGTERM");
  process.exitCode = code;
};

for (const child of children) {
  child.on("exit", (code, signal) => {
    if (!stopping && code !== 0) {
      console.error(`Harness process exited (${signal ?? code ?? "unknown"}).`);
      stop(code ?? 1);
    }
  });
}

process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
