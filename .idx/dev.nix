# Google Project IDX / Google Studio Execution Configuration
# See https://developers.google.com/idx/guides/customize-idx-env
{ pkgs, ... }: {
  channel = "stable-24.05";

  packages = [
    pkgs.nodejs_20
    pkgs.nodePackages.npm
  ];

  env = {};

  idx = {
    extensions = [
      "dbaeumer.vscode-eslint"
    ];

    workspace = {
      onCreate = {
        npm-install = "npm install";
      };
      onStart = {
        # Runs on workspace start
      };
    };

    previews = {
      enable = true;
      previews = {
        web = {
          command = ["npm" "run" "dev" "--" "--port" "$PORT" "--host" "0.0.0.0"];
          manager = "web";
        };
      };
    };
  };
}

