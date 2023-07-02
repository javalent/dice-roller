import { Notice } from "obsidian";
import DiceRollerPlugin from "src/main";
import { LexicalToken } from "src/parser/lexer";
import { TAG_REGEX, DATAVIEW_REGEX } from "src/utils/constants";
import { GenericRoller } from "./roller";
import { SectionRoller } from "./section";

abstract class DataViewEnabledRoller extends GenericRoller<SectionRoller> {
    base: string;
    abstract get query(): string;
    abstract regex: RegExp;

    collapse: boolean;
    types: string;
    results: SectionRoller[];

    get replacer() {
        return this.result.replacer;
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
        if (this.plugin.data.displayAsEmbed) {
            this.containerEl.addClasses(["has-embed", "markdown-embed"]);
        }
        const {
            roll = 1,
            query,
            collapse,
            types
        } = this.lexeme.value.match(this.regex).groups;

        this.base = query;
        this.collapse =
            collapse === "-"
                ? true
                : collapse === "+"
                ? false
                : !this.plugin.data.returnAllTags;
        this.rolls = Number(roll);
        this.types = types;
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
            (file) => `${this.rolls}d[[${file}]]${this.typeText}`
        );

        this.results = links.map((link) => {
            return new SectionRoller(
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
        });
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
        if (this.collapse) {
            this.chosen =
                this.random ??
                this.getRandomBetween(0, this.results.length - 1);
            let section = this.results[this.chosen];
            this.random = null;
            const container = this.resultEl.createDiv();
            container.createEl("h5", {
                cls: "dice-file-name",
                text: section.file.basename
            });
            container.appendChild(section.containerEl);
        } else {
            for (let section of this.results) {
                const container = this.resultEl.createDiv();
                container.createEl("h5", {
                    cls: "dice-file-name",
                    text: section.file.basename
                });
                container.appendChild(section.containerEl);
            }
        }
    }
    async roll(): Promise<SectionRoller> {
        return new Promise((resolve, reject) => {
            if (this.loaded) {
                this.results.forEach(async (section) => await section.roll());
                this.render();
                this.trigger("new-result");
                this.result = this.results[0];
                resolve(this.result);
            } else {
                this.on("loaded", () => {
                    this.results.forEach(
                        async (section) => await section.roll()
                    );
                    this.render();
                    this.trigger("new-result");
                    this.result = this.results[0];
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
