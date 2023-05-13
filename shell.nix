{ pkgs ? import <nixpkgs> {} }:
let
	node_packages = [ "openai" "twilio" "express" "socket.io" ];
	get_node_modules = builtins.readDir ./node_modules;
	check_package_exists = p: builtins.hasAttr p get_node_modules;
	all_packages_exist = (builtins.pathExists ./node_modules) && (builtins.all (x: x == true) (map (p: check_package_exists p) node_packages));
in
  pkgs.mkShell {
    nativeBuildInputs = with pkgs; [
		nodejs
    ];
	shellHook =
		''
		./keys.sh
		${if all_packages_exist then "echo \"All packages installed\"" else "npm install"}
		'';
}