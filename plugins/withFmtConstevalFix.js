// Expo config plugin: fix the `fmt` consteval build error on Xcode 16.3+.
//
// React Native 0.76 vendors fmt 11.0.2, whose FMT_STRING/consteval path is
// rejected by the newer Apple Clang in Xcode 16.3+, failing the pod build with:
//   "call to consteval function 'fmt::basic_format_string<...>' is not a
//    constant expression"  (ios/Pods/fmt/include/fmt/format-inl.h)
//
// fmt's base.h *unconditionally* redefines FMT_USE_CONSTEVAL from its own
// compiler detection, so an external -DFMT_USE_CONSTEVAL=0 is overwritten and
// ignored. The reliable fix is to edit the header itself: flip every
// `#define FMT_USE_CONSTEVAL 1` to 0, which makes FMT_CONSTEVAL expand to
// nothing (constexpr fallback) and compiles. fmt sources are downloaded by
// CocoaPods before post_install runs, so we patch them there — after install,
// before xcodebuild.
//
// Idempotent: re-running finds no `... 1` lines left and does nothing.

const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const MARKER = "withFmtConstevalFix";
const SNIPPET = `
    # --- fmt consteval fix for Xcode 16.3+ (RN 0.76); added by withFmtConstevalFix ---
    fmt_base_h = File.join(installer.sandbox.root.to_s, 'fmt', 'include', 'fmt', 'base.h')
    if File.exist?(fmt_base_h)
      fmt_src = File.read(fmt_base_h)
      fmt_new = fmt_src.gsub('define FMT_USE_CONSTEVAL 1', 'define FMT_USE_CONSTEVAL 0')
      if fmt_new != fmt_src
        File.write(fmt_base_h, fmt_new)
        Pod::UI.puts '[withFmtConstevalFix] Disabled fmt consteval for Xcode 16.3+ compatibility.'
      end
    end
    # --- end fmt consteval fix ---
`;

module.exports = function withFmtConstevalFix(config) {
  return withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, "Podfile");
      let contents = fs.readFileSync(podfile, "utf8");
      if (!contents.includes(MARKER)) {
        // insert right after the post_install block opens
        contents = contents.replace(
          /post_install do \|installer\|\n/,
          (match) => match + SNIPPET + "\n"
        );
        fs.writeFileSync(podfile, contents);
      }
      return cfg;
    },
  ]);
};
