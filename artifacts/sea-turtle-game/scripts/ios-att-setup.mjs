#!/usr/bin/env node
/*
 * ios-att-setup.mjs — iOS App Tracking Transparency (ATT) plist patcher
 *
 * Run this ONCE after `npx cap add ios` on your Mac to inject the required
 * NSUserTrackingUsageDescription and GADApplicationIdentifier keys into
 * ios/App/App/Info.plist for Apple App Store compliance.
 *
 * Usage:
 *   pnpm cap:ios:setup
 *   — or —
 *   node scripts/ios-att-setup.mjs
 *
 * After running:
 *   npx cap sync ios          ← propagates all Capacitor config to Xcode
 *   npx cap open ios          ← opens Xcode for final build + submission
 *
 * The ATT prompt fires automatically on first native launch because
 * AdConfig.ts sets requestTrackingAuthorization: true in the AdMob init config.
 * This script simply ensures Apple's required plist key is present so the OS
 * knows what copy to show the user.
 *
 * If tracking is denied:
 *   - AdmobBridge.initialize(personalized=false) is called via AdConsentModal
 *   - All ad requests include npa:"1" (non-personalized mode)
 *   - The game continues normally — no crash, no missing ads
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, "..");
const PLIST     = join(ROOT, "ios", "App", "App", "Info.plist");

// ── Keys to inject ────────────────────────────────────────────────────────────

const ENTRIES = [
  {
    key:   "NSUserTrackingUsageDescription",
    value: "This identifier is used to show you relevant ads and measure their performance to improve the game experience.",
    description: "ATT prompt copy (required by Apple for apps using IDFA)",
  },
  {
    key:   "GADApplicationIdentifier",
    value: "ca-app-pub-1287355220585536~4125519824",
    description: "AdMob App ID (required by Google Mobile Ads SDK on iOS)",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function plistEntry(key, value) {
  return `\t<key>${key}</key>\n\t<string>${value}</string>`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

if (!existsSync(PLIST)) {
  console.error("\n❌  Info.plist not found at:");
  console.error(`   ${PLIST}\n`);
  console.error("   Run `npx cap add ios` first (requires macOS + Xcode),");
  console.error("   then re-run this script.\n");
  process.exit(1);
}

let content = readFileSync(PLIST, "utf-8");
let changed  = false;

for (const entry of ENTRIES) {
  if (content.includes(entry.key)) {
    console.log(`✅  ${entry.key} — already present, skipped`);
    continue;
  }

  // Insert before the final </dict></plist>
  content = content.replace(
    /(\s*<\/dict>\s*<\/plist>\s*)$/,
    `\n${plistEntry(entry.key, entry.value)}\n$1`
  );
  console.log(`✅  ${entry.key} — added`);
  console.log(`     ${entry.description}`);
  changed = true;
}

if (changed) {
  writeFileSync(PLIST, content, "utf-8");
  console.log(`\n📝  Info.plist updated at: ${PLIST}`);
  console.log("   Next: run `npx cap sync ios` then `npx cap open ios`\n");
} else {
  console.log("\n   No changes needed — Info.plist is already configured.\n");
}
