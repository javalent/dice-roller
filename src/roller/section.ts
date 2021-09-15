import { MarkdownRenderer, Notice, SectionCache, setIcon } from "obsidian";
import DiceRollerPlugin from "src/main";
import { Lexeme, SectionCacheWithFile } from "src/types";
import { COPY_DEFINITION, SECTION_REGEX } from "src/utils/constants";
import { BaseRoller, GenericFileRoller, GenericRoller, Roller } from "./roller";

export class Section
    extends BaseRoller
    implements Roller<SectionCacheWithFile>
{
    resultArray: SectionCacheWithFile[];
    private selected: Set<SectionCacheWithFile> = new Set();

    constructor(
        public rolls: number = 1,
        public options: SectionCacheWithFile[],
        public content: Map<string, string>,
        public file: string,
        public copy: boolean
    ) {
        super();
        if (!rolls) this.rolls = 1;
        this.roll();
    }
    get text() {
        return this.display;
    }

    get result() {
        return this.resultArray[0];
    }
    get display() {
        let res = this.content
            .get(this.file)
            .slice(
                this.result.position.start.offset,
                this.result.position.end.offset
            );

        return `${res}`;
    }
    displayFromCache(cache: SectionCacheWithFile) {
        let res = this.content
            .get(cache.file)
            .slice(cache.position.start.offset, cache.position.end.offset);

        return `${res}`;
    }
    get remaining() {
        return this.options.filter((o) => !this.selected.has(o));
    }

    element(parent: HTMLElement) {
        parent.empty();
        const holder = parent.createDiv();

        for (let result of Array.from(this.selected)) {
            const resultEl = holder.createDiv("dice-roller-result-element");
            if (this.content.size > 1) {
                resultEl.createEl("h5", {
                    cls: "dice-file-name",
                    text: result.file
                });
            }
            resultEl.onclick = async (evt) => {
                if (
                    (evt && evt.getModifierState("Control")) ||
                    evt.getModifierState("Meta")
                ) {
                    evt.stopPropagation();
                    /*                     this.trigger("open-link", result.file); */
                    return;
                }
            };
            const ret = resultEl.createDiv({
                cls: "markdown-embed"
            });
            if (!result) {
                ret.createDiv({
                    cls: "dice-no-results",
                    text: "No results."
                });

                continue;
            }
            if (this.copy) {
                let copy = resultEl.createDiv({
                    cls: "dice-content-copy",
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

            const embed = ret.createDiv({
                attr: {
                    "aria-label": `${result.file}: ${result.type}`
                }
            });
            MarkdownRenderer.renderMarkdown(
                this.displayFromCache(result),
                embed,
                "",
                null
            );
        }

        holder.onclick = async (evt) => {
            evt.stopPropagation();

            this.roll();
            this.element(parent);
        };

        return holder;
    }
    roll() {
        this.selected = new Set();
        this.resultArray = [...Array(this.rolls)].map(() => {
            const choice =
                this.remaining[
                    this._getRandomBetween(0, this.remaining.length - 1)
                ];
            this.selected.add(choice);
            return choice;
        });
        return this.resultArray;
    }
}

export class SectionRoller extends GenericFileRoller<SectionCache> {
    result: SectionCache;
    results: SectionCache[];
    types: string[];
    content: string;

    constructor(
        public plugin: DiceRollerPlugin,
        public original: string,
        public lexeme: Lexeme,
        source: string,
        show: boolean = false
    ) {
        super(plugin, original, lexeme, source);
        this.containerEl.addClasses(["has-embed", "markdown-embed"]);
        this.resultEl.addClass("internal-embed");
    }
    get tooltip() {
        return `${this.original}\n${this.path}`;
    }
    async build(parent?: HTMLElement) {
        this.resultEl.empty();
        if (this.results.length > 1) {
            this.resultEl.createEl("h5", {
                cls: "dice-file-name",
                text: this.file.basename
            });
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
            if (this.plugin.data.copyContentButton) {
                let copy = this.resultEl.createDiv({
                    cls: "dice-content-copy",
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
            MarkdownRenderer.renderMarkdown(
                this.displayFromCache(result),
                ret.createDiv(),
                "",
                null
            );
        }
    }

    async load() {
        await this.getOptions();

        this.roll();
    }
    displayFromCache(cache: SectionCache) {
        let res = this.content.slice(
            cache.position.start.offset,
            cache.position.end.offset
        );

        return `${res}`;
    }
    getPath() {
        const { groups } = this.lexeme.data.match(SECTION_REGEX);

        const { roll, link, types } = groups;
        if (!link) throw new Error("Could not parse link.");

        this.rolls = Number(roll);
        this.path = link.replace(/(\[|\])/g, "");
        this.types = types?.split(",");
    }
    async getOptions() {
        this.cache = this.plugin.app.metadataCache.getFileCache(this.file);
        if (!this.cache || !this.cache.sections) {
            throw new Error("Could not read file cache.");
        }
        this.content = await this.plugin.app.vault.cachedRead(this.file);
        console.log(
            "🚀 ~ file: section.ts ~ line 253 ~ this.options",
            this.cache.sections,
            this.types
        );
        this.options = this.cache.sections.filter(({ type }) =>
            this.types
                ? this.types.includes(type)
                : !["yaml", "thematicBreak"].includes(type)
        );
    }
    roll(parent?: HTMLElement) {
        const options = [...this.options];
        console.log("🚀 ~ file: section.ts ~ line 266 ~ options", options);

        this.results = [...Array(this.rolls)]
            .map(() => {
                let option =
                    options[this.getRandomBetween(0, options.length - 1)];
                options.splice(options.indexOf(option), 1);
                return option;
            })
            .filter((r) => r);
        this.render(parent);
        return this.results[0];
    }
}

export class TagRoller extends GenericRoller<SectionCacheWithFile> {
    result: SectionCacheWithFile;
    async build() {}
    roll() {
        return this.result;
    }
    get tooltip() {
        return "";
    }
}
