import {
    type BlockCache,
    type ListItemCache,
    type Pos,
    type SectionCache,
    Component,
    MarkdownRenderer,
    Notice,
    setIcon
} from "obsidian";
import DiceRollerPlugin from "src/main";
import type { LexicalToken } from "src/parser/lexer";
import { SECTION_REGEX } from "src/utils/constants";
import { GenericEmbeddedRoller } from "./roller";
import { Icons } from "src/utils/icons";

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

export class SectionRoller extends GenericEmbeddedRoller<RollerCache> {
    result: RollerCache;
    async getReplacer() {
        const blockID = await this.getBlockId();
        if (blockID) {
            return `![[${this.path}#^${blockID}]]`;
        }
        return ``;
    }
    types: string[];
    content: string;
    levels: string[];

    get tooltip() {
        return `${this.original}\n${this.path}`;
    }
    async build() {
        this.resultEl.empty();
        if (this.data.displayResultsInline && this.inline) {
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
        if (this.data.copyContentButton) {
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
            if (!this.data.displayResultsInline) {
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
            MarkdownRenderer.render(
                app,
                this.displayFromCache(result),
                ret.createDiv(),
                this.source,
                new Component()
            );
            if (this.data.copyContentButton && this.results.length > 1) {
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
                setIcon(copy, Icons.COPY);
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
    async getBlockId() {
        if (!this.result) {
            await this.roll();
        }
        const blocks = this.cache.blocks ?? {};
        const block = Object.entries(blocks).find(
            ([id, block]: [string, BlockCache]) => {
                return samePosition(block.position, this.result.position);
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
            this.app.vault.modify(this.file, content);
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
        this.cache = this.app.metadataCache.getFileCache(this.file);
        if (!this.cache || !this.cache.sections) {
            throw new Error("Could not read file cache.");
        }
        this.content = await this.app.vault.cachedRead(this.file);

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

const samePosition = (pos: Pos, pos2: Pos) => {
    return (
        pos.start.col == pos2.start.col &&
        pos.start.line == pos2.start.line &&
        pos.start.offset == pos2.start.offset
    );
};
