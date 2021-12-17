const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const isDevMode = process.env.NODE_ENV === "development";

module.exports = {
    entry: "./src/main.ts",
    output: {
        path: path.resolve(__dirname, "."),
        filename: "main.js",
        libraryTarget: "commonjs"
    },
    target: "node",
    mode: "production",
    ...(isDevMode ? { devtool: "eval" } : {}),
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: "ts-loader",
                options: {
                    transpileOnly: true,
                    appendTsSuffixTo: [/\.vue$/]
                }
            },
            {
                test: /\.css?$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    {
                        loader: "css-loader",
                        options: {
                            url: false
                        }
                    }
                ]
            },
            {
                test: /\.(svg|njk|html)$/,
                type: "asset/inline"
            }
        ]
    },
    plugins: [
        new CopyPlugin({
            patterns: [{ from: "./manifest.json", to: "." }]
        }),
        new MiniCssExtractPlugin({
            filename: "styles.css"
        })
    ],
    resolve: {
        alias: {
            svelte: path.resolve("node_modules", "svelte"),
            "~": path.resolve(__dirname, "src"),
            src: path.resolve(__dirname, "src")
        },
        extensions: [".ts", ".tsx", ".js", ".svelte"],
        mainFields: ["svelte", "browser", "module", "main"]
    },
    externals: {
        electron: "commonjs2 electron",
        obsidian: "commonjs2 obsidian",
        obsidian: "commonjs2 @codemirror/view",
        obsidian: "commonjs2 @codemirror/language"
    }
};
