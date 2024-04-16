import { Component, MarkdownRenderer, Notice } from "obsidian";
import DiceRollerPlugin from "src/main";
import type { LexicalToken } from "src/parser/lexer";
import { TAG_REGEX, DATAVIEW_REGEX } from "src/utils/constants";
import { GenericRoller } from "./roller";
import { SectionRoller } from "./section";

abstract class DataViewEnabledRoller extends GenericRoller<SectionRoller> {
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
        public plugin: DiceRollerPlugin,
        public original: string,
        public lexeme: LexicalToken,
        public source: string,
        showDice = plugin.data.showDice
    ) {
        super(plugin, original, [lexeme], showDice);

        this.guardDataview();
    }
    guardDataview() {
        if (!this.plugin.canUseDataview) {
            new Notice(
                "A query can only be rolled with the Dataview plugin enabled."
            );
            throw new Error(
                "A query can only be rolled with the Dataview plugin enabled."
            );
        }
    }

    initialize() {
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

        if (!this.isLink && this.plugin.data.displayAsEmbed) {
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
        if (!this.plugin.dataviewAPI) {
            new Notice(
                "Dice Roller: Dataview must be installed and enabled to use query rollers."
            );
            return;
        }
        await this.plugin.dataviewReady();
        const query = await this.plugin.dataviewAPI.query(this.query);
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
                        this.plugin,
                        link,
                        {
                            ...this.lexeme,
                            value: link,
                            type: "section"
                        },
                        this.source,
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
        if (this.plugin.data.displayResultsInline) {
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
                this.plugin.app,
                text.join(" "),
                this.resultEl,
                this.plugin.app.workspace.getActiveFile()?.path,
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
                        this.plugin.app.workspace.openLinkText(
                            result.path,
                            this.plugin.app.workspace.getActiveFile()?.path,
                            evt.getModifierState("Control")
                        );
                    };
    
                    link.onmouseenter = async (evt) => {
                        this.plugin.app.workspace.trigger(
                            "link-hover",
                            this, //not sure
                            link, //targetEl
                            result.path, //linkText
                            this.plugin.app.workspace.getActiveFile()?.path //source
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
    toResult() {
        return {
            type: "query",
            random: this.chosen,
            result: Object.fromEntries(
                this.results.map((section) => [
                    section.path,
                    section.toResult()
                ])
            )
        };
    }
    async applyResult(result: any) {
        if (result.type !== "query") return;
        if (result.result) {
            for (let path in result.result) {
                const section = this.results.find(
                    (section) => section.path === path
                );
                if (!section) continue;
                section.applyResult(result.result[path]);
            }
        }
        if (result.random) {
            this.random = result.random;
        }
        await this.render();
    }
}

export class DataViewRoller extends DataViewEnabledRoller {
    get query() {
        return this.base;
    }
    regex = DATAVIEW_REGEX;
    constructor(
        public plugin: DiceRollerPlugin,
        public original: string,
        public lexeme: LexicalToken,
        public source: string,
        showDice = plugin.data.showDice
    ) {
        super(plugin, original, lexeme, source, showDice);

        this.initialize();
    }
}

export class TagRoller extends DataViewEnabledRoller {
    get query() {
        return `list from #${this.base}`;
    }
    regex = TAG_REGEX;
    constructor(
        public plugin: DiceRollerPlugin,
        public original: string,
        public lexeme: LexicalToken,
        public source: string,
        showDice = plugin.data.showDice
    ) {
        super(plugin, original, lexeme, source, showDice);

        this.initialize();
    }
}
