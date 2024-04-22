import { Component, TFile, type App } from "obsidian";
import { getAPI } from "obsidian-dataview";
import type { DvAPIInterface } from "obsidian-dataview/lib/typings/api";
import { Lexer } from "src/lexer/lexer";

declare module "obsidian" {
    interface App {
        plugins: {
            getPlugin: (plugin: string) => Plugin;
        };
    }
}

class DVManager extends Component {
    app: App;
    api: DvAPIInterface;

    inline: Map<string, number> = new Map();

    ready: boolean = false;

    initialize(app: App) {
        this.app = app;
        this.api = getAPI();
        this.dataviewReady().then(() => (this.ready = true));
        return this;
    }

    getFieldValueFromActiveFile(field: string): string | null {
        const file = this.app.workspace.getActiveFile();
        if (!file) return null;
        if (!this.canUseDataview || !this.ready) return null;

        return this.api.index.pages.get(file.path)?.fields.get(field) ?? null;
    }

    get canUseDataview() {
        return this.app.plugins.getPlugin("dataview") != null;
    }
    async dataviewReady() {
        return new Promise((resolve) => {
            if (!this.canUseDataview) resolve(false);
            if (this.api) {
                resolve(true);
            }
            this.registerEvent(
                this.app.metadataCache.on("dataview:api-ready", () => {
                    this.api = getAPI();
                    resolve(true);
                })
            );
        });
    }
}

export const DataviewManager = new DVManager();
