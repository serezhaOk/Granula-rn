// Dependency-free postinstall patch.
//
// react-native-audio-api's TurboModule spec (NativeAudioAPIModule.ts) declares
//   type OptionsMap = { [key: string]: string | boolean | number | undefined };
// The React Native 0.76 New Architecture codegen cannot express a union type as
// a struct field and aborts `pod install` with
//   "Error: Union types are unsupported in structs".
// OptionsMap is only used by the notification API, which this app never calls,
// so we narrow it to `string`. Runtime behaviour is unaffected (JS is untyped);
// this only unblocks codegen.
//
// Idempotent and safe: if the spec is already patched, or its shape changed in a
// future version, it does nothing. Runs automatically via the postinstall hook.

const fs = require("fs");
const path = require("path");

const target = path.join(
  __dirname,
  "..",
  "node_modules",
  "react-native-audio-api",
  "src",
  "specs",
  "NativeAudioAPIModule.ts"
);

const BEFORE = "type OptionsMap = { [key: string]: string | boolean | number | undefined };";
const AFTER = "type OptionsMap = { [key: string]: string };";

try {
  let src = fs.readFileSync(target, "utf8");
  if (src.includes(BEFORE)) {
    fs.writeFileSync(target, src.replace(BEFORE, AFTER));
    console.log("[patch-audio-api] Narrowed OptionsMap union for RN 0.76 codegen.");
  } else if (src.includes(AFTER)) {
    console.log("[patch-audio-api] Already patched.");
  } else {
    console.log("[patch-audio-api] Spec shape changed; nothing to patch (skipping).");
  }
} catch (e) {
  console.log("[patch-audio-api] Skipped:", e.message);
}
