# Frillion

A Chrome and Firefox extension that shows the best combined Krillion score for you and your friends, in a toolbar popup.

## Scoring

For each question, Frillion takes the highest available score across you and your friends. The sum of those scores is the **team score**.

Each question's points are divided equally among the players tied for its best score. For example, if John and Jill score 85 and Jake scores 60, the team receives 85 points; John and Jill contribute 42.5 each. The question breakdown lists the winning players and their answers.

Players without available results are excluded. Contributions are calculated at full precision but displayed rounded to whole points. Displayed contributions may therefore not sum exactly to the team score.

## Build

Requires Nix with flakes enabled:

```sh
nix build
```

The default package, also available as `nix build .#frillion`, produces a
directory containing symlinks to two unsigned extension archives:

- `result/frillion-chrome.zip`
- `result/frillion-firefox.zip`

Each browser is also a distinct package whose output is the ZIP file itself:

```sh
nix build .#frillion-firefox  # result points directly to the Firefox ZIP
nix build .#frillion-chrome   # result points directly to the Chrome ZIP
```

To keep both individual build links with recognizable archive names:

```sh
nix build .#frillion-firefox --out-link frillion-firefox.zip
nix build .#frillion-chrome --out-link frillion-chrome.zip
```

The browser-loading instructions below use the combined `nix build` layout.

The flake uses `callPackage` to load `package.nix`, a browser-parameterized
`stdenvNoCC.mkDerivation` with standard build, check, and install phases. Tests
run as part of each browser package's build. Only the
manifest, extension sources, and tests are included in the derivation's source;
local authentication fixtures are excluded. Archive timestamps are normalized
for reproducible output.

## Load in a browser

### Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…**.
3. Select `result/frillion-firefox.zip` directly—no extraction needed.

Firefox normally distributes extensions as `.xpi` files, which are ZIP archives with a different extension. Temporary add-ons are removed when Firefox restarts. Permanent installation in standard Firefox requires Mozilla signing; this project does not sign or publish extensions.

### Chrome

1. Extract `result/frillion-chrome.zip` into a folder outside the Nix store.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select the extracted folder.

## Use

Sign in to [Krillion](https://krillion.io), keep a Krillion page active, and click Frillion's toolbar icon. If necessary, find or pin it through your browser's extensions menu.

The popup refreshes whenever it opens. Use **Refresh** to reload scores without closing it. Expand **Best scores by question** to see the winning answers and individual shares.

Frillion only works while the active page is on `https://krillion.io`. If results are locked or unavailable, it displays a message instead of a score. If authentication fails, reopen Krillion, sign in again, and refresh.

## Authentication and privacy

On each refresh, Frillion reads the current Firebase access token from Krillion's IndexedDB and uses it to request `https://krillion.io/api/friends`. The token stays inside the injected function on the Krillion tab; it is not returned to the popup, logged, or saved in extension storage.

The extension uses only the `activeTab` and `scripting` permissions. It does not modify the webpage, maintain historical results, independently refresh credentials, or send data to a separate service.

Files under `examples/` are local development fixtures and are not included in either extension archive. Authentication fixtures can contain sensitive credentials; do not share them.

## Tests

```sh
nix flake check
```

Tests cover scoring, tied contributions, missing results, origin restrictions, and authentication handling using synthetic credentials. They do not replace live testing in Chrome and Firefox.

See [GLOSSARY.md](GLOSSARY.md) for scoring terminology.
