const config = require("./webpack.config.js");

module.exports = {
    ...config,
    mode: "development",
    devtool: "eval",
    output: {
        ...config.output,
        path: "/Users/jeremyvalentine/Library/Mobile Documents/iCloud~md~obsidian/Documents/The Price of Revenge/.obsidian/plugins/obsidian-dice-roller"
    },
    watchOptions: {
        ignored: ["styles.css", "*.js", "**/node_modules"]
    }
};
