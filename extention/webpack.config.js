const path = require("path");

module.exports = {
  entry: "./content.js", // Your entry point
  output: {
    filename: "content.bundle.js",
    path: path.resolve(__dirname, "dist"),
  },
  mode: "production", // Change to 'development' for debugging
  module: {
    rules: [
      {
        test: /\.css$/, // Match CSS files
        use: [
          {
            loader: "style-loader",
            options: {
              insert: "head", // Specify where to inject <style> tags
            },
          },
          "css-loader",
        ],
      },
    ],
  },
};
