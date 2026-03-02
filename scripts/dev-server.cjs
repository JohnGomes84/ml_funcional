const { spawn, spawnSync } = require("node:child_process");
const path = require("node:path");

const nodeBin = process.execPath;
const projectRoot = path.resolve(__dirname, "..");
const tscBin = path.join(projectRoot, "node_modules", "typescript", "bin", "tsc");
const tsconfig = path.join(projectRoot, "tsconfig.server.runtime.json");
const serverEntry = path.join(projectRoot, "server-dist", "server", "core", "index.js");

const initialBuild = spawnSync(nodeBin, [tscBin, "-p", tsconfig], {
  stdio: "inherit",
  cwd: projectRoot,
});

if (initialBuild.status !== 0) {
  process.exit(initialBuild.status || 1);
}

const tscWatch = spawn(nodeBin, [tscBin, "-p", tsconfig, "--watch", "--preserveWatchOutput"], {
  stdio: ["inherit", "pipe", "pipe"],
  cwd: projectRoot,
});

let serverProcess = null;
let restartTimer = null;
let restarting = false;
let pendingRestart = false;
let skipNextSuccessfulBuild = true;
let tscStdoutBuffer = "";

function startServer() {
  if (serverProcess && !serverProcess.killed) {
    return;
  }

  serverProcess = spawn(nodeBin, [serverEntry], {
    stdio: "inherit",
    cwd: projectRoot,
  });

  serverProcess.on("exit", (code) => {
    serverProcess = null;

    if (restarting) {
      restarting = false;
      startServer();

      if (pendingRestart) {
        pendingRestart = false;
        restartServer();
      }
      return;
    }

    if (code && code !== 0) {
      shutdown(code);
    }
  });
}

function restartServer() {
  if (restartTimer) {
    clearTimeout(restartTimer);
  }

  restartTimer = setTimeout(() => {
    if (restarting) {
      pendingRestart = true;
      return;
    }

    if (!serverProcess || serverProcess.killed) {
      startServer();
      return;
    }

    restarting = true;
    pendingRestart = false;

    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill("SIGTERM");
    }
  }, 150);
}

startServer();

function onTscWatchLine(line) {
  // tsc prints this line after each completed watch cycle.
  if (line.includes("Found 0 errors. Watching for file changes.")) {
    if (skipNextSuccessfulBuild) {
      skipNextSuccessfulBuild = false;
      return;
    }
    restartServer();
  }
}

tscWatch.stdout.on("data", (chunk) => {
  const text = chunk.toString();
  process.stdout.write(text);
  tscStdoutBuffer += text;

  const lines = tscStdoutBuffer.split(/\r?\n/);
  tscStdoutBuffer = lines.pop() || "";
  for (const line of lines) {
    onTscWatchLine(line);
  }
});

tscWatch.stderr.on("data", (chunk) => {
  process.stderr.write(chunk.toString());
});

function shutdown(code = 0) {
  if (tscWatch && !tscWatch.killed) {
    tscWatch.kill("SIGTERM");
  }

  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill("SIGTERM");
  }

  setTimeout(() => process.exit(code), 100);
}

tscWatch.on("exit", (code) => {
  if (code && code !== 0) {
    shutdown(code);
  }
});

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
