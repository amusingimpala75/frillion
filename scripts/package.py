"""Build deterministic, source-only extension archives (never include examples)."""
import json
from pathlib import Path
import sys
import zipfile

source, manifest_path, output = map(Path, sys.argv[1:])
manifest = json.loads(manifest_path.read_text())
files = ("popup.html", "popup.css", "popup.mjs", "score.mjs")
for browser in ("chrome", "firefox"):
    config = dict(manifest)
    if browser == "firefox":
        config["browser_specific_settings"] = {
            "gecko": {"id": "frillion@extensions.krillion.io", "strict_min_version": "109.0"}
        }
    with zipfile.ZipFile(output / f"frillion-{browser}.zip", "w", zipfile.ZIP_DEFLATED) as archive:
        contents = {name: (source / name).read_bytes() for name in files}
        contents["manifest.json"] = (json.dumps(config, indent=2) + "\n").encode()
        for name in sorted(contents):
            info = zipfile.ZipInfo(name, (1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, contents[name])
