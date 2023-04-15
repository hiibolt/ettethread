{ pkgs ? import <nixpkgs> {} }:
  pkgs.mkShell {
    nativeBuildInputs = with pkgs; [ 
			nodejs
    ];
		shellHook = 
			''
			npm i openai
			npm i twilio
			npm i express
			npm i socket.io
			'';
}