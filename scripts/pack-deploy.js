const fs = require('fs');
const path = require('path');

const root = process.cwd();
const deployDir = path.join(root, 'deploy-temp');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest) {
  fs.cpSync(src, dest, { recursive: true });
}

function safeExists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function main() {
  if (safeExists(deployDir)) {
    fs.rmSync(deployDir, { recursive: true, force: true });
  }
  ensureDir(deployDir);

  const backendPkg = path.join(root, 'backend', 'package.json');
  const backendLock = path.join(root, 'backend', 'package-lock.json');
  copyFile(backendPkg, path.join(deployDir, 'package.json'));
  if (safeExists(backendLock)) {
    copyFile(backendLock, path.join(deployDir, 'package-lock.json'));
  }

  const backendNodeModules = path.join(root, 'backend', 'node_modules');
  if (safeExists(backendNodeModules)) {
    copyDir(backendNodeModules, path.join(deployDir, 'node_modules'));
  }

  const distStandard = path.join(root, 'backend', 'dist', 'server.js');
  const distNested = path.join(root, 'backend', 'dist', 'backend', 'src', 'server.js');

  let destPublic;
  let destWorker;
  let serverEntry;

  if (safeExists(distStandard)) {
    serverEntry = 'dist/server.js';
    destPublic = path.join(deployDir, 'public');
    destWorker = path.join(deployDir, 'dist', 'stockfish-worker.js');
    copyDir(path.join(root, 'backend', 'dist'), path.join(deployDir, 'dist'));
  } else if (safeExists(distNested)) {
    serverEntry = 'dist/backend/src/server.js';
    destPublic = path.join(deployDir, 'dist', 'backend', 'public');
    destWorker = path.join(deployDir, 'dist', 'backend', 'stockfish-worker.js');
    copyDir(path.join(root, 'backend', 'dist'), path.join(deployDir, 'dist'));

    const pkgPath = path.join(deployDir, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkg.scripts = pkg.scripts || {};
    pkg.scripts.start = 'node dist/backend/src/server.js';
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  } else {
    throw new Error('Could not locate server.js in backend/dist.');
  }

  const frontendDist = path.join(root, 'frontend', 'dist');
  if (!safeExists(frontendDist)) {
    throw new Error('frontend/dist not found. Run frontend build first.');
  }

  ensureDir(destPublic);
  copyDir(frontendDist, destPublic);

  const workerSrc = path.join(root, 'backend', 'src', 'stockfish-worker.js');
  if (safeExists(workerSrc)) {
    copyFile(workerSrc, destWorker);
  }

  console.log('✅ Deployment staging complete.');
  console.log(`Server entry: ${serverEntry}`);
}

main();
