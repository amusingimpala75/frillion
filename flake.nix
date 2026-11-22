{
  description = "Frillion Chrome and Firefox extension ZIPs";
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-parts.url = "github:hercules-ci/flake-parts";
  };
  outputs = inputs: inputs.flake-parts.lib.mkFlake { inherit inputs; } {
    systems = [ "aarch64-darwin" "x86_64-darwin" "aarch64-linux" "x86_64-linux" ];
    perSystem = { pkgs, ... }: {
      packages.default = pkgs.runCommand "frillion-extension-zips-0.1.0" {
        __structuredAttrs = true;
        strictDeps = true;
        nativeBuildInputs = [ pkgs.python3 ];
      } ''
        mkdir -p "$out"
        python3 ${./scripts/package.py} ${./src} ${./manifest.json} "$out"
      '';
      checks.tests = pkgs.runCommand "frillion-tests" {
        __structuredAttrs = true;
        strictDeps = true;
        nativeBuildInputs = [ pkgs.nodejs ];
      } ''
        cp -r ${./src} src
        cp -r ${./tests} tests
        node --test tests/*.test.mjs
        touch "$out"
      '';
    };
  };
}
