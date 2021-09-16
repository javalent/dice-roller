import {
    MarkdownRenderer,
    Notice,
    SectionCache,
    setIcon,
    TFile
} from "obsidian";
import DiceRollerPlugin from "src/main";
import { Lexeme } from "src/types";
import { COPY_DEFINITION, SECTION_REGEX, TAG_REGEX } from "src/utils/constants";
import { GenericFileRoller, GenericRoller } from "./roller";

export class SectionRoller extends GenericFileRoller<SectionCache> {
    result: SectionCache;
    results: SectionCache[];
    types: string[];
    content: string;
    loaded: boolean;
    copy: HTMLDivElement;

    constructor(
        public plugin: DiceRollerPlugin,
        public original: string,
        public lexeme: Lexeme,
        source: string,
        private inline: boolean = true
    ) {
        super(plugin, original, lexeme, source);
        this.containerEl.addClasses(["has-embed", "markdown-embed"]);
        this.resultEl.addClass("internal-embed");
        this.resultEl.setAttrs({ src: source });
        this.copy = this.containerEl.createDiv({
            cls: "dice-content-copy dice-roller-button no-show",
            attr: { "aria-label": "Copy Contents" }
        });
        this.copy.addEventListener("click", (evt) => {
            evt.stopPropagation();
            navigator.clipboard
                .writeText(this.displayFromCache(...this.results).trim())
                .then(async () => {
                    new Notice("Result copied to clipboard.");
                });
        });
        setIcon(this.copy, COPY_DEFINITION);
    }
    get tooltip() {
        return `${this.original}\n${this.path}`;
    }
    async build() {
        this.resultEl.empty();
        if (this.plugin.data.displayResultsInline && this.inline) {
            this.resultEl.createSpan({
                text: `${this.tooltip.split("\n").join(" -> ")} -> `
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
                cls: "markdown-embed"
            });
            if (!this.plugin.data.displayResultsInline) {
                ret.setAttrs({
                    "aria-label": `${this.file.basename}: ${result.type}`
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
                null
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
    displayFromCache(...caches: SectionCache[]) {
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
    getPath() {
        const { groups } = this.lexeme.data.match(SECTION_REGEX);

        const { roll = 1, link, types } = groups;
        if (!link) throw new Error("Could not parse link.");

        this.rolls = (roll && !isNaN(Number(roll)) && Number(roll)) ?? 1;
        this.path = link.replace(/(\[|\])/g, "");
        this.types = types?.split(",");
    }
    async getOptions() {
        this.cache = this.plugin.app.metadataCache.getFileCache(this.file);
        if (!this.cache || !this.cache.sections) {
            throw new Error("Could not read file cache.");
        }
        this.content = await this.plugin.app.vault.cachedRead(this.file);
        this.options = this.cache.sections.filter(({ type }) =>
            this.types
                ? this.types.includes(type)
                : !["yaml", "thematicBreak"].includes(type)
        );
        this.loaded = true;
        this.trigger("loaded");
    }
    async roll(): Promise<SectionCache> {
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
}

export class TagRoller extends GenericRoller<SectionRoller> {
    tag: string;
    collapse: boolean;
    types: string;
    results: SectionRoller[];
    constructor(
        public plugin: DiceRollerPlugin,
        public original: string,
        public lexeme: Lexeme,
        public source: string
    ) {
        super(plugin, original, [lexeme]);

        this.containerEl.addClasses(["has-embed", "markdown-embed"]);

        const {
            roll = 1,
            tag,
            collapse,
            types
        } = lexeme.data.match(TAG_REGEX).groups;

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
        const files =
            this.plugin.app.plugins.plugins.dataview.index.tags.invMap.get(
                this.tag
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
                    data: link,
                    original: link,
                    conditionals: null,
                    type: "section"
                },
                this.source,
                false
            );
        });
    }
    result: SectionRoller;
    async build() {
        this.resultEl.empty();
        if (this.plugin.data.displayResultsInline) {
            this.resultEl.createSpan({
                text: `${this.tooltip.split("\n").join(" -> ")} -> `
            });
        }
        if (this.collapse) {
            let section =
                this.results[this.getRandomBetween(0, this.results.length - 1)];
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
    async roll() {
        this.results.forEach(async (section) => await section.roll());
        this.render();
        this.trigger("new-result");
        return this.result;
    }
    get tooltip() {
        return this.original;
    }
}

export class LinkRoller extends GenericRoller<TFile> {
    tag: string;
    links: TFile[];
    constructor(
        public plugin: DiceRollerPlugin,
        public original: string,
        public lexeme: Lexeme,
        public source: string
    ) {
        super(plugin, original, [lexeme]);

        const { roll = 1, tag } = lexeme.data.match(TAG_REGEX).groups;

        this.tag = `#${tag}`;
        this.rolls = (roll && !isNaN(Number(roll)) && Number(roll)) ?? 1;
        this.getFiles();
    }
    result: TFile;
    get tooltip() {
        return `${this.original}\n${this.result.basename}`;
    }
    async roll() {
        return (
            (this.result =
                this.links[this.getRandomBetween(0, this.links.length - 1)]),
            await this.render(),
            this.trigger("new-result"),
            this.result
        );
    }
    async build() {
        this.resultEl.empty();
        if (this.plugin.data.displayResultsInline) {
            this.resultEl.createSpan({
                text: `${this.tooltip.split("\n").join(" -> ")} -> `
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
                true
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
        const files =
            this.plugin.app.plugins.plugins.dataview.index.tags.invMap.get(
                this.tag
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
    }
}
