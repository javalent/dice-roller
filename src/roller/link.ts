import { TFile, Notice } from "obsidian";
import DiceRollerPlugin from "src/main";
import type { LexicalToken } from "src/parser/lexer";
import { TAG_REGEX } from "src/utils/constants";
import { GenericRoller } from "./roller";

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
    async getReplacer() {
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
