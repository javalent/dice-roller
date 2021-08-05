import { MarkdownRenderer, Notice, setIcon } from "obsidian";
import { SectionCacheWithFile } from "src/types";
import { COPY_DEFINITION } from "src/utils/constants";
import { BaseRoller, Roller } from "./roller";

export class SectionRoller
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
            const resultEl = holder.createDiv();
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
                    evt.stopPropagation()
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
