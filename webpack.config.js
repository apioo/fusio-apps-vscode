const path = require('path');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');

module.exports = {
    mode: 'production',
    entry: {
        'app': './src/index.js',
    },
    output: {
        globalObject: 'self',
        filename: '[name].bundle.js',
        path: path.resolve(__dirname, 'dist'),
        publicPath: 'dist/'
    },
    optimization: {
        concatenateModules: false
    },
    module: {
        rules: [{
            test: /\.css$/,
            use: ['style-loader', 'css-loader']
        }]
    },
    plugins: [
        new CleanWebpackPlugin(),
        new MonacoWebpackPlugin({
            languages: ['javascript', 'php', 'json', 'typescript', 'sql', 'yaml']
        })
    ]
};
