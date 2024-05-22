import { App, Component, MarkdownRenderer, Notice } from "obsidian";
import type { LexicalToken } from "src/lexer/lexer";
import { TAG_REGEX, DATAVIEW_REGEX } from "src/utils/constants";
import { BasicRoller } from "./roller";
import { SectionRoller } from "./section";
import type { DiceRollerSettings } from "src/settings/settings.types";
import { DataviewManager } from "src/api/api.dataview";

abstract class DataViewEnabledRoller extends BasicRoller<SectionRoller> {
    base: string;
    isLink: boolean = false;
    abstract get query(): string;
    abstract regex: RegExp;

    types: string;
    results: SectionRoller[];

    async getReplacer() {
        if (this.isLink) {
            return `[[${this.result.file.basename}]]`;
        }
        return await this.result.getReplacer();
    }
    random: number;
    chosen: any;
    loaded: boolean = false;
    constructor(
        public data: DiceRollerSettings,
        public original: string,
        public lexeme: LexicalToken,
        public source: string,
        public app: App,
        showDice = data.showDice
    ) {
        super(data, original, [lexeme], showDice);
    }
    guardDataview() {
        if (!DataviewManager.canUseDataview) {
            new Notice(
                "A query can only be rolled with the Dataview plugin enabled."
            );
            throw new Error(
                "A query can only be rolled with the Dataview plugin enabled."
            );
        }
    }

    initialize() {
        this.guardDataview();
        const {
            roll = 1,
            query,
            types
        } = this.lexeme.value.match(this.regex).groups;

        this.base = query;
        this.rolls = Number(roll);
        this.types = types;
        if (this.types) {
            this.isLink = this.types.includes("link");
            this.types = this.types.replace("link", "");
        }

        if (!this.isLink && this.data.displayAsEmbed) {
            this.containerEl.addClasses(["has-embed", "markdown-embed"]);
        }
        this.getFiles();
    }

    get typeText() {
        if (!this.types?.length) {
            return "";
        }
        return `|${this.types}`;
    }
    async getFiles() {
        if (!DataviewManager.canUseDataview) {
            new Notice(
                "Dice Roller: Dataview must be installed and enabled to use query rollers."
            );
            return;
        }
        await DataviewManager.dataviewReady();
        const query = await DataviewManager.api.query(this.query);
        if (!query.successful) {
            throw new Error(
                "No files found with that query. Is the query correct?\n\n" +
                    this.query
            );
        }

        const files = new Set(
            query.value.values.reduce((acc, curr) => {
                if (curr.type == "file") {
                    acc.push(curr.path);
                }
                return acc;
            }, [])
        );

        if (files) files.delete(this.source);
        if (!files || !files.size) {
            throw new Error(
                "No files found with that query. Is the query correct?\n\n" +
                    this.query
            );
        }

        const links = Array.from(files).map(
            (file) => `[[${file}]]${this.typeText}`
        );

        this.results = [];
        const promises = [];
        for (const link of links) {
            promises.push(
                new Promise<void>(async (resolve) => {
                    const roller = new SectionRoller(
                        this.data,
                        link,
                        {
                            ...this.lexeme,
                            value: link,
                            type: "section"
                        },
                        this.source,
                        this.app,
                        false
                    );
                    /* await roller.roll(); */
                    this.results.push(roller);
                    resolve();
                })
            );
        }
        await Promise.all(promises);
        this.loaded = true;
        this.trigger("loaded");
    }
    result: SectionRoller;
    async build() {
        this.resultEl.empty();
        if (this.data.displayResultsInline) {
            this.resultEl.createSpan({
                text: this.inlineText
            });
        }
        const results: SectionRoller[] = [];
        const clone = new Map(this.results.map((r, i) => [i, r]));
        for (let i = 0; i < this.rolls; i++) {
            if (!clone.size) continue;
            const result = this.getRandomBetween(0, clone.size);
            const cloned = clone.get(result);
            await cloned.roll();
            results.push(cloned);
            clone.delete(result);
        }
        if (this.isLink) {
            const text: string[] = results.reduce((a, b, i, arr) => {
                a.push(`[[${b.file.basename}]]`);
                if (arr.length > 1 && i != arr.length - 1) {
                    a.push(",");
                }
                return a;
            }, []);
            MarkdownRenderer.render(
                this.app,
                text.join(" "),
                this.resultEl,
                this.app.workspace.getActiveFile()?.path,
                new Component()
            );
        } else {
            for (const result of results) {
                /* const link = this.resultEl.createEl("a", {
                        cls: "internal-link",
                        text: result.file.basename
                    });
                    link.onclick = async (evt) => {
                        evt.stopPropagation();
                        this.app.workspace.openLinkText(
                            result.path,
                            this.app.workspace.getActiveFile()?.path,
                            evt.getModifierState("Control")
                        );
                    };
    
                    link.onmouseenter = async (evt) => {
                        this.app.workspace.trigger(
                            "link-hover",
                            this, //not sure
                            link, //targetEl
                            result.path, //linkText
                            this.app.workspace.getActiveFile()?.path //source
                        );
                    };
                    if (results.length > 1 && r != results.length - 1) {
                        this.resultEl.createSpan({ text: ", " });
                    } */

                const container = this.resultEl.createDiv();
                container.createEl("h5", {
                    cls: "dice-file-name",
                    text: result.file.basename
                });
                container.appendChild(result.containerEl);
            }
        }
    }
    async roll(): Promise<SectionRoller> {
        return new Promise((resolve, reject) => {
            if (this.loaded) {
                this.result = this.results[0];
                this.render();
                this.trigger("new-result");
                resolve(this.result);
            } else {
                this.on("loaded", () => {
                    this.result = this.results[0];
                    this.render();
                    this.trigger("new-result");
                    resolve(this.result);
                });
            }
        });
    }
    get tooltip() {
        return this.original;
    }
}

export class DataViewRoller extends DataViewEnabledRoller {
    get query() {
        return this.base;
    }
    regex = DATAVIEW_REGEX;
    constructor(
        public data: DiceRollerSettings,
        public original: string,
        public lexeme: LexicalToken,
        public source: string,
        app: App,
        showDice = data.showDice
    ) {
        super(data, original, lexeme, source, app, showDice);

        this.initialize();
    }
}

export class TagRoller extends DataViewEnabledRoller {
    get query() {
        return `list from #${this.base}`;
    }
    regex = TAG_REGEX;
    constructor(
        public data: DiceRollerSettings,
        public original: string,
        public lexeme: LexicalToken,
        public source: string,
        app: App,
        showDice = data.showDice
    ) {
        super(data, original, lexeme, source, app, showDice);

        this.initialize();
    }
}
