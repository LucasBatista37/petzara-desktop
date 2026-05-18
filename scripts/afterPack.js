'use strict';

// Ad-hoc code signing for macOS — applied after electron-builder packs the .app
// but before it wraps everything into the DMG.
//
// WHY: Without any signature, macOS Gatekeeper shows "app is damaged and can't
// be opened" and hides the "Open Anyway" button entirely. With an ad-hoc
// signature (--sign -) the error changes to "unidentified developer" and the
// "Open Anyway" button becomes accessible under System Settings → Privacy.
//
// WHY NOT --deep: The --deep flag is deprecated and doesn't guarantee the
// correct signing order inside Electron bundles. Electron requires that inner
// components (dylibs → helper executables → helper apps → frameworks) are
// signed before the main app bundle, or the signature is invalid.
//
// Long-term fix: Apple Developer Program ($99/year) + Developer ID certificate
// + notarization via notarytool → Gatekeeper passes automatically.

const { spawnSync, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

module.exports = async ({ appOutDir, packager }) => {
  if (packager.platform.name !== 'mac') return;
  if (process.platform !== 'darwin') return;

  const appName = packager.appInfo.productName;
  const appPath = path.join(appOutDir, `${appName}.app`);

  if (!fs.existsSync(appPath)) {
    console.warn(`[afterPack] Bundle not found: ${appPath}`);
    return;
  }

  const sign = (target) => {
    const r = spawnSync('codesign', [
      '--force',
      '--timestamp=none',
      '--sign', '-',
      target,
    ], { stdio: ['ignore', 'pipe', 'pipe'] });
    if (r.status !== 0) {
      const err = r.stderr?.toString().trim();
      if (err) console.warn(`[afterPack] warn signing ${path.basename(target)}: ${err}`);
    }
  };

  const find = (dir, name) => {
    try {
      return execSync(`find "${dir}" -name "${name}" 2>/dev/null`, { encoding: 'utf8' })
        .split('\n').filter(Boolean);
    } catch { return []; }
  };

  console.log(`[afterPack] Ad-hoc signing ${appName}.app ...`);

  // 1. Dylibs and native modules (deepest leaves first)
  for (const f of [
    ...find(appPath, '*.dylib'),
    ...find(appPath, '*.so'),
    ...find(appPath, '*.node'),
  ]) sign(f);

  // 2. Executables and app bundles inside Frameworks (must come before framework itself)
  const frameworksDir = path.join(appPath, 'Contents', 'Frameworks');
  if (fs.existsSync(frameworksDir)) {
    // Helper app executables
    for (const helper of find(frameworksDir, '*.app')) {
      const helperExec = path.join(
        helper, 'Contents', 'MacOS', path.basename(helper, '.app')
      );
      if (fs.existsSync(helperExec)) sign(helperExec);
      sign(helper);
    }

    // Electron Framework binary (before the .framework bundle)
    for (const f of find(frameworksDir, 'Electron Framework')) {
      if (!f.endsWith('.framework')) sign(f);
    }

    // Framework bundles
    for (const f of find(frameworksDir, '*.framework')) sign(f);
  }

  // 3. Main executable
  const mainExec = path.join(appPath, 'Contents', 'MacOS', appName);
  if (fs.existsSync(mainExec)) sign(mainExec);

  // 4. Main app bundle — must be LAST
  sign(appPath);

  // Verify (will show "adhoc" — expected)
  const verify = spawnSync('codesign', ['--verify', '--verbose=1', appPath], {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
  });
  if (verify.status === 0) {
    console.log(`[afterPack] Signature OK (ad-hoc)`);
  } else {
    console.warn(`[afterPack] Verification output: ${verify.stderr?.trim()}`);
  }
};
