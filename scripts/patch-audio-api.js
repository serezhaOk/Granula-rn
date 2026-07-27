// Dependency-free postinstall patch for react-native-audio-api @ 0.12.0.
//
// The library's TurboModule spec (NativeAudioAPIModule.ts and its .web.ts twin)
// uses union types that the React Native 0.76 New Architecture codegen cannot
// express, so `pod install` aborts with:
//   "Error: Union types are unsupported in structs"
// Three offenders, all in APIs this app never calls (notifications / audio-focus
// interruptions):
//   1. OptionsMap map value  : string | boolean | number | undefined  -> string
//   2. observeAudioInterruptions(focusType: AudioFocusType)            -> string
//   3. showNotification(type: NotificationType)                        -> string
// Narrowing them to `string` removes the unions from the generated schema.
// Runtime behaviour is unaffected (the JS is untyped); this only unblocks codegen.
//
// Idempotent and safe: applies only the replacements it still finds, and never
// throws. Runs automatically via the "postinstall" hook.

const fs = require("fs");
const path = require("path");

const specDir = path.join(
  __dirname,
  "..",
  "node_modules",
  "react-native-audio-api",
  "src",
  "specs"
);

const FILES = ["NativeAudioAPIModule.ts", "NativeAudioAPIModule.web.ts"];

const REPLACEMENTS = [
  {
    from: "[key: string]: string | boolean | number | undefined;",
    to: "[key: string]: string;",
  },
  { from: "focusType: AudioFocusType", to: "focusType: string" },
  { from: "type: NotificationType,", to: "type: string," },
];

let touched = 0;
for (const file of FILES) {
  const target = path.join(specDir, file);
  try {
    let src = fs.readFileSync(target, "utf8");
    let changed = false;
    for (const { from, to } of REPLACEMENTS) {
      if (src.includes(from)) {
        src = src.split(from).join(to);
        changed = true;
      }
    }
    if (changed) {
      fs.writeFileSync(target, src);
      touched++;
    }
  } catch (e) {
    // file missing / renamed in a future version — skip quietly
  }
}

if (touched > 0) {
  console.log(
    "[patch-audio-api] Narrowed union types in " +
      touched +
      " spec file(s) for RN 0.76 codegen."
  );
} else {
  console.log("[patch-audio-api] Nothing to patch (already patched or spec changed).");
}
