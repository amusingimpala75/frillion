{
  lib,
  stdenvNoCC,
  jq,
  zip,
  nodejs,
}:

stdenvNoCC.mkDerivation (finalAttrs: {
  pname = "frillion";
  version = (lib.importJSON ./manifest.json).version;

  # Do not copy local authentication fixtures into the Nix store.
  src = lib.fileset.toSource {
    root = ./.;
    fileset = lib.fileset.unions [
      ./manifest.json
      ./src
      ./tests
    ];
  };

  __structuredAttrs = true;
  strictDeps = true;

  nativeBuildInputs = [ jq zip ];
  nativeCheckInputs = [ nodejs ];

  dontConfigure = true;
  doCheck = true;

  buildPhase = ''
    runHook preBuild

    mkdir -p chrome firefox dist
    for browser in chrome firefox; do
      install -m644 src/popup.html src/popup.css src/popup.mjs src/score.mjs "$browser/"
    done

    jq --arg version '${finalAttrs.version}' '.version = $version' manifest.json > chrome/manifest.json
    jq '. + {
      browser_specific_settings: {
        gecko: {
          id: "frillion@extensions.krillion.io",
          strict_min_version: "109.0"
        }
      }
    }' chrome/manifest.json > firefox/manifest.json

    # ZIP stores timestamps; normalize them and omit filesystem metadata.
    export TZ=UTC
    find chrome firefox -type f -exec touch -t 198001010000.00 {} +
    for browser in chrome firefox; do
      (
        cd "$browser"
        zip -X ../dist/frillion-"$browser".zip \
          manifest.json popup.html popup.css popup.mjs score.mjs
      )
    done

    runHook postBuild
  '';

  checkPhase = ''
    runHook preCheck
    node --test tests/*.test.mjs
    runHook postCheck
  '';

  installPhase = ''
    runHook preInstall
    install -Dm644 dist/frillion-chrome.zip "$out/frillion-chrome.zip"
    install -Dm644 dist/frillion-firefox.zip "$out/frillion-firefox.zip"
    runHook postInstall
  '';

  meta = {
    description = "Toolbar popup showing a team's best Krillion scores and shared contributions";
    platforms = lib.platforms.unix;
  };
})
