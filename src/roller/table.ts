import type { Pos } from "obsidian";

import { TABLE_REGEX } from "src/utils/constants";
import { GenericFileRoller } from "./roller";

export class TableRoller extends GenericFileRoller<string> {
    content: string;
    position: Pos;
    block: string;
    header: string;
    getPath() {
        const { groups } = this.lexeme.data.match(TABLE_REGEX);

        const { roll = 1, link, block, header } = groups;
        if (!link || !block) throw new Error("Could not parse link.");

        this.rolls = (roll && !isNaN(Number(roll)) && Number(roll)) ?? 1;
        this.path = link.replace(/(\[|\])/g, "");
        this.block = block
            .replace(/(\^|#)/g, "")
            .trim()
            .toLowerCase();
        this.header = header;
    }
    get tooltip() {
        return `${this.original}\n${this.path} > ${this.block}${
            this.header ? " | " + this.header : ""
        }`;
    }
    result: string;
    async build() {
        this.resultEl.empty();
        const result = [this.result];
        if (this.plugin.data.displayResultsInline) {
            result.unshift(this.tooltip.split("\n").join(" -> "), " -> ");
        }
        const split = result.join("").split(/(\[\[(?:[\s\S]+?)\]\])/);

        for (let str of split) {
            if (/\[\[(?:[\s\S]+?)\]\]/.test(str)) {
                //link;
                const [, match] = str.match(/\[\[([\s\S]+?)\]\]/);
                const internal = this.resultEl.createEl("a", {
                    cls: "internal-link",
                    text: match
                });
                internal.onmouseover = () => {
                    this.plugin.app.workspace.trigger(
                        "link-hover",
                        this, //not sure
                        internal, //targetEl
                        match.replace("^", "#^").split("|").shift(), //linkText
                        this.plugin.app.workspace.getActiveFile()?.path //source
                    );
                };
                internal.onclick = async (ev: MouseEvent) => {
                    ev.stopPropagation();
                    await this.plugin.app.workspace.openLinkText(
                        match.replace("^", "#^").split(/\|/).shift(),
                        this.plugin.app.workspace.getActiveFile()?.path,
                        ev.getModifierState("Control")
                    );
                };
                continue;
            }
            this.resultEl.createSpan({ text: str });
        }
    }
    async roll(): Promise<string> {
        return new Promise((resolve) => {
            if (this.loaded) {
                const options = [...this.options];

                this.result = [...Array(this.rolls)]
                    .map(() => {
                        let option =
                            options[
                                this.getRandomBetween(0, options.length - 1)
                            ];
                        options.splice(options.indexOf(option), 1);
                        return option;
                    })
                    .join("||");

                this.render();

                this.trigger("new-result");
                resolve(this.result);
            } else {
                this.on("loaded", () => {
                    const options = [...this.options];

                    this.result = [...Array(this.rolls)]
                        .map(() => {
                            let option =
                                options[
                                    this.getRandomBetween(0, options.length - 1)
                                ];
                            options.splice(options.indexOf(option), 1);
                            return option;
                        })
                        .join("||");

                    this.render();

                    this.trigger("new-result");
                    resolve(this.result);
                });
            }
        });
    }
    async load() {
        await this.getOptions();
    }

    async getOptions() {
        this.cache = this.plugin.app.metadataCache.getFileCache(this.file);

        if (
            !this.cache ||
            !this.cache.blocks ||
            !(this.block in this.cache.blocks)
        ) {
            throw new Error(
                "Could not read file cache. Does the block reference exist?\n\n" +
                    `${this.path} > ${this.block}`
            );
        }

        this.position = this.cache.blocks[this.block].position;

        this.content = (
            await this.plugin.app.vault.cachedRead(this.file)
        )?.slice(this.position.start.offset, this.position.end.offset);
        let table = extract(this.content);

        if (this.header && table.columns[this.header]) {
            this.options = table.columns[this.header];
        } else {
            if (this.header)
                throw new Error(
                    `Header ${this.header} was not found in table ${this.path} > ${this.block}.`
                );
            this.options = table.rows;
        }
        this.loaded = true;
        this.trigger("loaded");
    }
}
const MATCH = /^\|?([\s\S]+?)\|?$/;
const SPLIT = /\|/;

function extract(content: string) {
    const lines = content.split("\n");

    const inner = lines.map((l) => (l.trim().match(MATCH) ?? [, l.trim()])[1]);

    const headers = inner[0].split(SPLIT);

    const rows: string[] = [];
    const ret: [string, string[]][] = [];

    for (let index in headers) {
        let header = headers[index];
        if (!header.trim().length) header = index;
        ret.push([header.trim(), []]);
    }

    for (let line of lines.slice(2)) {
        const entries = line
            .trim()
            .split(SPLIT)
            .map((e) => e.trim())
            .filter((e) => e.length);

        rows.push(entries.join(" | "));

        for (let index in entries) {
            const entry = entries[index].trim();
            if (!entry.length || !ret[index]) continue;
            ret[index][1].push(entry);
        }
    }
    return {
        columns: Object.fromEntries(ret),
        rows: rows
    };
}
