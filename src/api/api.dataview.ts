import { Component, type App } from "obsidian";
import { getAPI } from "obsidian-dataview";
import type { DvAPIInterface } from "obsidian-dataview/lib/typings/api";
import { Lexer } from "src/parser/lexer";

class DVManager extends Component {
    app: App;
    api: DvAPIInterface;

    inline: Map<string, number> = new Map();
    async registerDataviewInlineFields() {
        if (!this.canUseDataview) return;

        await this.dataviewReady();

        const pages = this.api.index.pages;

        pages.forEach(({ fields }) => {
            for (const [key, value] of fields) {
                if (
                    typeof value !== "number" ||
                    Number.isNaN(value) ||
                    value == undefined
                )
                    continue;
                this.inline.set(key, value);
            }
        });

        Lexer.setInlineFields(this.inline);
        this.registerEvent(
            this.app.metadataCache.on(
                "dataview:metadata-change",
                (type, file) => {
                    if (type === "update") {
                        const page = this.api.page(file.path);

                        if (!page) return;

                        for (let key in page) {
                            let value = page[key];
                            if (
                                typeof value !== "number" ||
                                Number.isNaN(value) ||
                                value == undefined
                            )
                                continue;
                            this.inline.set(key, value);
                        }
                        Lexer.setInlineFields(this.inline);
                    }
                }
            )
        );
    }
    initialize(app: App) {
        this.app = app;
        this.api = getAPI();

        this.app.workspace.onLayoutReady(async () => {
            await this.registerDataviewInlineFields();
        });
        return this;
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
