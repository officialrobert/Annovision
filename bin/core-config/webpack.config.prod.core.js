const path = require('path');

const config = {
  mode: 'production',
  target: 'electron-main',
  node: {
    __dirname: false,
    __filename: false,
  },
  entry: {
    main: path.resolve(__dirname, '../src/index.js'),
    a: path.resolve(__dirname, '../src/preload.js'),
  },
  output: {
    path: path.resolve(__dirname, '../core'),
    filename: '[name].js',
    chunkFilename: '[name].[contenthash:8].js',
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
    ],
  },
};

module.exports = config;
