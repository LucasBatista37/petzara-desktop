'use strict';

// Applies an ad-hoc code signature to the .app bundle on macOS.
// Without any signature, Gatekeeper shows "app is damaged and can't be opened" —
// a misleading error that hides the "Open Anyway" button in System Settings.
// An ad-hoc signature (--sign -) changes the error to "unidentified developer",
// which surfaces the "Open Anyway" button under Privacy & Security.
// This is a free workaround; the proper fix is an Apple Developer ID certificate.
const { execSync } = require('child_process');
const path = require('path');

module.exports = async ({ appOutDir, packager }) => {
  if (packager.platform.name !== 'mac') return;

  const appName = packager.appInfo.productName;
  const appPath = path.join(appOutDir, `${appName}.app`);

  try {
    execSync(`codesign --force --deep --sign - "${appPath}"`, { stdio: 'inherit' });
    console.log(`Ad-hoc signed: ${appPath}`);
  } catch (err) {
    console.warn('Ad-hoc signing skipped (not on macOS or codesign unavailable):', err.message);
  }
};
