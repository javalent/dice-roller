import {
    BlockCache,
    Component,
    ListItemCache,
    MarkdownRenderer,
    Notice,
    Pos,
    SectionCache,
    setIcon,
    TFile
} from "obsidian";
import DiceRollerPlugin from "src/main";
import { LexicalToken } from "src/parser/lexer";
import { Lexeme } from "src/types";
import { COPY_DEFINITION, SECTION_REGEX, TAG_REGEX } from "src/utils/constants";
import { GenericFileRoller, GenericRoller } from "./roller";

type RollerCache = SectionCache | ListItemCache;

function nanoid(num: number) {
    let result = "";
    const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    for (let i = 0; i < num; i++) {
        result += characters.charAt(
            Math.floor(Math.random() * charactersLength)
        );
    }
    return result;
}

export function blockid(len: number) {
    return `dice-${nanoid(4)}`;
}

abstract class GenericEmbeddedRoller<T> extends GenericFileRoller<T> {
    copy: HTMLDivElement;
    abstract transformResultsToString(): string;
    getEmbedClass() {
        return this.plugin.data.displayAsEmbed ? "markdown-embed" : "";
    }
    constructor(
        public plugin: DiceRollerPlugin,
        public original: string,
        public lexeme: LexicalToken,
        source: string,
        public inline: boolean = true,
        showDice = plugin.data.showDice
    ) {
        super(plugin, original, lexeme, source, showDice);
        if (this.plugin.data.displayAsEmbed) {
            this.containerEl.addClasses(["has-embed", "markdown-embed"]);
            this.resultEl.addClass("internal-embed");
        }
        this.resultEl.setAttrs({ src: source });
        this.copy = this.containerEl.createDiv({
            cls: "dice-content-copy dice-roller-button no-show",
            attr: { "aria-label": "Copy Contents" }
        });
        this.copy.addEventListener("click", (evt) => {
            evt.stopPropagation();
            navigator.clipboard
                .writeText(this.transformResultsToString())
                .then(async () => {
                    new Notice("Result copied to clipboard.");
                });
        });
        setIcon(this.copy, COPY_DEFINITION);
    }
}

export class SectionRoller extends GenericEmbeddedRoller<RollerCache> {
    result: RollerCache;
    get replacer() {
        const blockID = this.getBlockId(this.result);
        if (blockID) {
            return `![[${this.path}#^${blockID}]]`;
        }
        return ``;
    }
    types: string[];
    content: string;
    levels: string[];

    constructor(
        public plugin: DiceRollerPlugin,
        public original: string,
        public lexeme: LexicalToken,
        source: string,
        public inline: boolean = true,
        showDice = plugin.data.showDice
    ) {
        super(plugin, original, lexeme, source, showDice);
    }
    get tooltip() {
        return `${this.original}\n${this.path}`;
    }
    async build() {
        this.resultEl.empty();
        if (this.plugin.data.displayResultsInline && this.inline) {
            this.resultEl.createSpan({
                text: this.inlineText
            });
        }

        if (!this.results || !this.results.length) {
            this.resultEl.createDiv({
                cls: "dice-no-results",
                text: "No results."
            });

            return;
        }
        if (this.plugin.data.copyContentButton) {
            this.copy.removeClass("no-show");
        }

        for (const result of this.results) {
            this.resultEl.onclick = async (evt) => {
                if (
                    (evt && evt.getModifierState("Control")) ||
                    evt.getModifierState("Meta")
                ) {
                    evt.stopPropagation();
                    return;
                }
            };
            const ret = this.resultEl.createDiv({
                cls: this.getEmbedClass()
            });
            if (!this.plugin.data.displayResultsInline) {
                const type = "type" in result ? result.type : "List Item";
                ret.setAttrs({
                    "aria-label": `${this.file.basename}: ${type}`
                });
            }
            if (!result) {
                ret.createDiv({
                    cls: "dice-no-results",
                    text: "No results."
                });

                continue;
            }
            MarkdownRenderer.renderMarkdown(
                this.displayFromCache(result),
                ret.createDiv(),
                this.source,
                new Component()
            );
            if (this.plugin.data.copyContentButton && this.results.length > 1) {
                let copy = ret.createDiv({
                    cls: "dice-content-copy dice-roller-button",
                    attr: { "aria-label": "Copy Contents" }
                });
                copy.addEventListener("click", (evt) => {
                    evt.stopPropagation();
                    navigator.clipboard
                        .writeText(this.displayFromCache(result).trim())
                        .then(async () => {
                            new Notice("Result copied to clipboard.");
                        });
                });
                setIcon(copy, COPY_DEFINITION);
            }
        }
    }

    async load() {
        await this.getOptions();
    }
    displayFromCache(...caches: RollerCache[]) {
        let res: string[] = [];
        for (let cache of caches) {
            res.push(
                this.content.slice(
                    cache.position.start.offset,
                    cache.position.end.offset
                )
            );
        }

        return res.join("\n\n");
    }
    transformResultsToString(): string {
        return this.displayFromCache(...this.results);
    }
    getBlockId(cache: RollerCache) {
        const blocks = this.cache.blocks ?? {};
        const block = Object.entries(blocks).find(
            ([id, block]: [string, BlockCache]) => {
                return samePosition(block.position, cache.position);
            }
        );
        if (!block) {
            const blockID = `${blockid(4)}`;
            const content = `${this.content.slice(
                0,
                this.result.position.end.offset + 1
            )}^${blockID}${this.content.slice(
                this.result.position.end.offset
            )}`;
            this.watch = false;
            this.plugin.app.vault.modify(this.file, content);
            return blockID;
        }
        return block[0];
    }
    getPath() {
        const { groups } = this.lexeme.value.match(SECTION_REGEX) ?? {};

        const { roll = 1, link, types } = groups ?? {};
        if (!link) throw new Error("Could not parse link.");

        this.rolls = (roll && !isNaN(Number(roll)) && Number(roll)) ?? 1;
        this.path = decodeURIComponent(link.replace(/(\[|\]|\(|\))/g, ""));
        this.types = types?.split(",");
        this.levels = types
            ?.split(",")
            .map((type) =>
                /heading\-\d+/.test(type) ? type.split("-").pop() : null
            )
            .filter((t) => t);
        this.types = types
            ?.split(",")
            .map((type) =>
                /heading\-\d+/.test(type) ? type.split("-").shift() : type
            );
    }
    async getOptions() {
        this.cache = this.plugin.app.metadataCache.getFileCache(this.file);
        if (!this.cache || !this.cache.sections) {
            throw new Error("Could not read file cache.");
        }
        this.content = await this.plugin.app.vault.cachedRead(this.file);

        this.options = this.cache.sections.filter(({ type, position }) => {
            if (!this.types) return !["yaml", "thematicBreak"].includes(type);

            if (
                type == "heading" &&
                this.types.includes(type) &&
                this.levels.length
            ) {
                const headings = (this.cache.headings ?? []).filter(
                    ({ level }) => this.levels.includes(`${level}`)
                );
                return headings.some(({ position: pos }) =>
                    samePosition(pos, position)
                );
            }
            return this.types.includes(type);
        });

        if (this.types && this.types.includes("listItem")) {
            this.options.push(...this.cache.listItems);
        }
        this.loaded = true;
        this.trigger("loaded");
    }
    async roll(): Promise<RollerCache> {
        return new Promise((resolve, reject) => {
            if (!this.loaded) {
                this.on("loaded", () => {
                    const options = [...this.options];

                    this.results = [...Array(this.rolls)]
                        .map(() => {
                            let option =
                                options[
                                    this.getRandomBetween(0, options.length - 1)
                                ];
                            options.splice(options.indexOf(option), 1);
                            return option;
                        })
                        .filter((r) => r);
                    this.render();
                    this.trigger("new-result");
                    this.result = this.results[0];
                    resolve(this.results[0]);
                });
            } else {
                const options = [...this.options];

                this.results = [...Array(this.rolls)]
                    .map(() => {
                        let option =
                            options[
                                this.getRandomBetween(0, options.length - 1)
                            ];
                        options.splice(options.indexOf(option), 1);
                        return option;
                    })
                    .filter((r) => r);
                this.render();
                this.trigger("new-result");
                this.result = this.results[0];
                resolve(this.results[0]);
            }
        });
    }
    toResult() {
        return {
            type: "section",
            result: this.results
        };
    }
    async applyResult(result: any) {
        if (result.type !== "section") return;
        if (result.result) {
            this.results = result.result;
        }
        await this.render();
    }
}

export class TagRoller extends GenericRoller<SectionRoller> {
    tag: string;
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

        if (!this.plugin.canUseDataview) {
            new Notice(
                "A tag can only be rolled with the Dataview plugin enabled."
            );
            throw new Error(
                "A tag can only be rolled with the Dataview plugin enabled."
            );
        }

        if (plugin.data.displayAsEmbed) {
            this.containerEl.addClasses(["has-embed", "markdown-embed"]);
        }

        const {
            roll = 1,
            tag,
            collapse,
            types
        } = lexeme.value.match(TAG_REGEX).groups;

        this.collapse =
            collapse === "-"
                ? true
                : collapse === "+"
                ? false
                : !this.plugin.data.returnAllTags;
        this.tag = `#${tag}`;
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
                "Dice Roller: Dataview must be installed and enabled to use tag rollers."
            );
            return;
        }
        await this.plugin.dataviewReady();
        const query = await this.plugin.dataviewAPI.query(
            `list from ${this.tag}`
        );
        if (!query.successful) {
            throw new Error(
                "No files found with that tag. Is the tag correct?\n\n" +
                    this.tag
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
                "No files found with that tag. Is the tag correct?\n\n" +
                    this.tag
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
            type: "tag",
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
        if (result.type !== "tag") return;
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

export class LinkRoller extends GenericRoller<TFile> {
    tag: string;
    links: TFile[];
    constructor(
        public plugin: DiceRollerPlugin,
        public original: string,
        public lexeme: LexicalToken,
        public source: string,
        showDice = plugin.data.showDice
    ) {
        super(plugin, original, [lexeme], showDice);

        const { roll = 1, tag } = lexeme.value.match(TAG_REGEX)?.groups ?? {};

        this.tag = `#${tag}`;
        this.rolls = (roll && !isNaN(Number(roll)) && Number(roll)) ?? 1;
        this.getFiles();
    }
    result: TFile;
    get replacer() {
        return `[[${this.result.basename}]]`;
    }
    get tooltip() {
        return `${this.original}\n${this.result.basename}`;
    }
    async roll(): Promise<TFile> {
        return new Promise((resolve, reject) => {
            if (this.loaded) {
                this.result =
                    this.links[this.getRandomBetween(0, this.links.length - 1)];
                this.render();
                this.trigger("new-result");
                resolve(this.result);
            } else {
                this.on("loaded", () => {
                    this.result =
                        this.links[
                            this.getRandomBetween(0, this.links.length - 1)
                        ];
                    this.render();
                    this.trigger("new-result");
                    resolve(this.result);
                });
            }
        });
    }
    async build() {
        this.resultEl.empty();
        if (this.plugin.data.displayResultsInline) {
            this.resultEl.createSpan({
                text: this.inlineText
            });
        }
        const link = this.resultEl.createEl("a", {
            cls: "internal-link",
            text: this.result.basename
        });
        link.onclick = async (evt) => {
            evt.stopPropagation();
            this.plugin.app.workspace.openLinkText(
                this.result.path,
                this.plugin.app.workspace.getActiveFile()?.path,
                evt.getModifierState("Control")
            );
        };

        link.onmouseenter = async (evt) => {
            this.plugin.app.workspace.trigger(
                "link-hover",
                this, //not sure
                link, //targetEl
                this.result.path, //linkText
                this.plugin.app.workspace.getActiveFile()?.path //source
            );
        };
    }
    async getFiles() {
        if (!this.plugin.dataviewAPI) {
            new Notice(
                "Dice Roller: Dataview must be installed and enabled to use tag rollers."
            );
            return;
        }
        await this.plugin.dataviewReady();
        const query = await this.plugin.dataviewAPI.query(
            `list from ${this.tag}`
        );
        if (!query.successful) {
            throw new Error(
                "No files found with that tag. Is the tag correct?\n\n" +
                    this.tag
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
                "No files found with that tag. Is the tag correct?\n\n" +
                    this.tag
            );
        }

        this.links = Array.from(files).map((link) =>
            this.plugin.app.metadataCache.getFirstLinkpathDest(
                link,
                this.source
            )
        );
        this.loaded = true;
        this.trigger("loaded");
    }
    toResult() {
        return {
            type: "link",
            result: this.result.path
        };
    }
    async applyResult(result: any) {
        if (result.type !== "link") return;
        if (result.result) {
            const file = this.plugin.app.vault.getAbstractFileByPath(
                result.result
            );
            if (file && file instanceof TFile) {
                this.result = file;
            }
        }
        await this.render();
    }
}

export class LineRoller extends GenericEmbeddedRoller<string> {
    get replacer() {
        return this.result;
    }
    result: string;
    types: string[];
    content: string;

    constructor(
        public plugin: DiceRollerPlugin,
        public original: string,
        public lexeme: LexicalToken,
        source: string,
        inline: boolean = true,
        showDice = plugin.data.showDice
    ) {
        super(plugin, original, lexeme, source, showDice);
    }
    get tooltip() {
        return `${this.original}\n${this.path}`;
    }
    async build() {
        this.resultEl.empty();
        if (this.plugin.data.displayResultsInline && this.inline) {
            this.resultEl.createSpan({
                text: this.inlineText
            });
        }

        if (!this.results || !this.results.length) {
            this.resultEl.createDiv({
                cls: "dice-no-results",
                text: "No results."
            });

            return;
        }
        if (this.plugin.data.copyContentButton) {
            this.copy.removeClass("no-show");
        }

        for (const result of this.results) {
            this.resultEl.onclick = async (evt) => {
                if (
                    (evt && evt.getModifierState("Control")) ||
                    evt.getModifierState("Meta")
                ) {
                    evt.stopPropagation();
                    return;
                }
            };

            const ret = this.resultEl.createDiv({
                cls: this.getEmbedClass()
            });
            if (!result) {
                ret.createDiv({
                    cls: "dice-no-results",
                    text: "No results."
                });

                continue;
            }
            MarkdownRenderer.renderMarkdown(
                result,
                ret.createDiv(),
                this.source,
                new Component()
            );
            if (this.plugin.data.copyContentButton && this.results.length > 1) {
                let copy = ret.createDiv({
                    cls: "dice-content-copy dice-roller-button",
                    attr: { "aria-label": "Copy Contents" }
                });
                copy.addEventListener("click", (evt) => {
                    evt.stopPropagation();
                    navigator.clipboard.writeText(result).then(async () => {
                        new Notice("Result copied to clipboard.");
                    });
                });
                setIcon(copy, COPY_DEFINITION);
            }
        }
    }
    transformResultsToString(): string {
        return this.results.join("\n\n");
    }
    async load() {
        await this.getOptions();
    }
    getPath() {
        const { groups } = this.lexeme.value.match(SECTION_REGEX) ?? {};

        const { roll = 1, link, types } = groups ?? {};
        if (!link) throw new Error("Could not parse link.");

        this.rolls = (roll && !isNaN(Number(roll)) && Number(roll)) ?? 1;
        this.path = link.replace(/(\[|\])/g, "");
        this.types = types?.split(",");
    }
    async getOptions() {
        this.content = await this.plugin.app.vault.cachedRead(this.file);
        if (!this.content) {
            throw new Error("Could not read file cache.");
        }
        this.options = this.content
            .trim()
            .split("\n")
            .map((c) => c.trim())
            .filter((c) => c && c.length);

        this.loaded = true;
        this.trigger("loaded");
    }
    async roll(): Promise<string> {
        return new Promise((resolve, reject) => {
            if (!this.loaded) {
                this.on("loaded", () => {
                    const options = [...this.options];

                    this.results = [...Array(this.rolls)]
                        .map(() => {
                            let option =
                                options[
                                    this.getRandomBetween(0, options.length - 1)
                                ];
                            options.splice(options.indexOf(option), 1);
                            return option;
                        })
                        .filter((r) => r);
                    this.render();
                    this.trigger("new-result");
                    resolve(this.results[0]);
                });
            } else {
                const options = [...this.options];

                this.results = [...Array(this.rolls)]
                    .map(() => {
                        let option =
                            options[
                                this.getRandomBetween(0, options.length - 1)
                            ];
                        options.splice(options.indexOf(option), 1);
                        return option;
                    })
                    .filter((r) => r);
                this.render();
                this.trigger("new-result");
                resolve(this.results[0]);
            }
        });
    }
    toResult() {
        return {
            type: "section",
            result: this.results
        };
    }
    async applyResult(result: any) {
        if (result.type !== "section") return;
        if (result.result) {
            this.results = result.result;
        }
        await this.render();
    }
}

const samePosition = (pos: Pos, pos2: Pos) => {
    return (
        pos.start.col == pos2.start.col &&
        pos.start.line == pos2.start.line &&
        pos.start.offset == pos2.start.offset
    );
};
