{
  description = "Frillion Chrome and Firefox extension ZIPs";
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-parts.url = "github:hercules-ci/flake-parts";
  };
  outputs = inputs: inputs.flake-parts.lib.mkFlake { inherit inputs; } {
    systems = [ "aarch64-darwin" "x86_64-darwin" "aarch64-linux" "x86_64-linux" ];
    perSystem = { pkgs, self', ... }: {
      packages = {
        frillion = pkgs.callPackage ./package.nix { };
        default = self'.packages.frillion;
      };
      checks.tests = self'.packages.frillion;
    };
  };
}
