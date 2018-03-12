const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    resolve: {
      extensions: ['.ts', '.js'],
      modules: ['node_modules']
    },
    mode: 'development',
    devtool: 'source-map',
    output: {
        path: path.resolve(__dirname, './dist'),
        publicPath: 'http://localhost:3000/',
        filename: '[name].js',
        chunkFilename: '[id].chunk.js'
    },
    devServer: {
        historyApiFallback: true,
        port: 3000,
        stats: 'minimal',
        inline: true
    },
    entry: './src/index.ts',
    module: {
      rules: [
        {
          test: /\.ts?$/,
          exclude: /node_modules/,
          loader: 'awesome-typescript-loader'
        }
      ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: 'index.html'
        })
    ]
  };