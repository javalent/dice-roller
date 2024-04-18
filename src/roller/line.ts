import { MarkdownRenderer, Component, Notice, setIcon } from "obsidian";
import { SECTION_REGEX } from "src/utils/constants";
import { GenericEmbeddedRoller } from "./roller";
import { Icons } from "src/utils/icons";

export class LineRoller extends GenericEmbeddedRoller<string> {
    async getReplacer() {
        return this.result;
    }
    result: string;
    types: string[];
    content: string;

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
            if (this.data.copyContentButton && this.results.length > 1) {
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
                setIcon(copy, Icons.COPY);
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
        this.content = await this.app.vault.cachedRead(this.file);
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
}
