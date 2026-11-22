{
  lib,
  stdenvNoCC,
  jq,
  zip,
  nodejs,
  typescript,
  browser,
}:

assert lib.assertOneOf "browser" browser [
  "chrome"
  "firefox"
];

stdenvNoCC.mkDerivation (finalAttrs: {
  pname = "frillion-${browser}";
  inherit ((lib.importJSON ./manifest.json)) version;
  name = "${finalAttrs.pname}-${finalAttrs.version}.zip";

  # Do not copy local authentication fixtures into the Nix store.
  src = lib.fileset.toSource {
    root = ./.;
    fileset = lib.fileset.unions [
      ./manifest.json
      ./tsconfig.json
      ./src
      ./tests
    ];
  };

  __structuredAttrs = true;
  strictDeps = true;

  nativeBuildInputs = [
    jq
    zip
    typescript
  ];
  nativeCheckInputs = [ nodejs ];

  dontConfigure = true;
  # The output is an archive file, not a directory with binaries to fix up.
  dontFixup = true;
  doCheck = true;

  buildPhase = ''
    runHook preBuild

    tsc --project tsconfig.json
    mkdir -p extension dist
    install -m644 src/popup.html src/popup.css build/popup.js build/score.js extension/

    jq --arg version '${finalAttrs.version}' '.version = $version' manifest.json > extension/manifest.json
    ${lib.optionalString (browser == "firefox") ''
      jq '. + {
        browser_specific_settings: {
          gecko: {
            id: "frillion@extensions.krillion.io",
            strict_min_version: "109.0"
          }
        }
      }' extension/manifest.json > extension/manifest.json.tmp
      mv extension/manifest.json.tmp extension/manifest.json
    ''}

    # ZIP stores timestamps; normalize them and omit filesystem metadata.
    export TZ=UTC
    find extension -type f -exec touch -t 198001010000.00 {} +
    (
      cd extension
      zip -X ../dist/${finalAttrs.pname}.zip \
        manifest.json popup.html popup.css popup.js score.js
    )

    runHook postBuild
  '';

  checkPhase = ''
    runHook preCheck
    node --test tests/*.test.mjs
    runHook postCheck
  '';

  installPhase = ''
    runHook preInstall
    install -m644 dist/${finalAttrs.pname}.zip "$out"
    runHook postInstall
  '';

  meta = {
    description = "Toolbar popup showing a team's best Krillion scores and shared contributions";
    platforms = lib.platforms.unix;
  };
})
