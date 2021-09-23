const config = require("./webpack.config.js");

module.exports = {
    ...config,
    mode: "development",
    devtool: "eval",
    output: {
        ...config.output,
        path:
            "C:/Users/jvalentine/iCloudDrive/iCloud~md~obsidian/The Price of Revenge/.obsidian/plugins/obsidian-dice-roller"
    },
    watchOptions: {
        ignored: ["styles.css", "*.js", "**/node_modules"]
    }
};
