import type { Pos } from "obsidian";

import { DICE_REGEX, TABLE_REGEX } from "src/utils/constants";
import { StackRoller } from ".";
import { BasicRoller, GenericFileRoller } from "./roller";

export class TableRoller extends GenericFileRoller<string> {
    content: string;
    position: Pos;
    block: string;
    header: string;
    isLookup: any;
    lookupRoller: StackRoller;
    lookupRanges: [range: [min: number, max: number], option: string][];
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
            result.unshift(this.inlineText);
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
    async getResult() {
        if (this.isLookup) {
            const result = await this.lookupRoller.roll();
            const option = this.lookupRanges.find(
                ([range]) =>
                    (range[1] === undefined && result === range[0]) ||
                    (result >= range[0] && range[1] >= result)
            );
            if (option) {
                let iteration = 0;
                let ret = option[1];
                const results = [];

                while (iteration < 5 && /dice:\s?[\s\S]+\s?/.test(ret)) {
                    iteration++;
                    let [, full, content] =
                        ret.match(/(`dice:\s*([\s\S]+)`)\s?/) ?? [];
                    if (!content) break;

                    const roller = await this.plugin.getRoller(
                        content,
                        this.source
                    );
                    if (!roller) break;
                    ret = await roller.roll();
                    results.push({
                        full,
                        result: ret
                    });
                }

                let actual = option[1];
                results.forEach(({ full, result }) => {
                    actual = actual.replace(full, result);
                });

                return `${result} > ${actual}`;
            }
        }
        const options = [...this.options];

        return [...Array(this.rolls)]
            .map(() => {
                let option =
                    options[this.getRandomBetween(0, options.length - 1)];
                options.splice(options.indexOf(option), 1);
                return option;
            })
            .join("||");
    }
    async roll(): Promise<string> {
        return new Promise(async (resolve) => {
            if (this.loaded) {
                this.result = await this.getResult();

                this.render();

                this.trigger("new-result");
                resolve(this.result);
            } else {
                this.on("loaded", async () => {
                    this.result = await this.getResult();

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

        const section = this.cache.sections?.find(
            (s) => s.position == this.cache.blocks[this.block].position
        );
        this.position = this.cache.blocks[this.block].position;
        this.content = (
            await this.plugin.app.vault.cachedRead(this.file)
        )?.slice(this.position.start.offset, this.position.end.offset);

        if (section && section.type === "list") {
            this.options = this.content.split("\n");
        } else {
            let table = extract(this.content);

            /** Check for Lookup Table */
            if (
                Object.keys(table.columns).length === 2 &&
                /dice:\s*([\s\S]+)\s*?/.test(Object.keys(table.columns)[0])
            ) {
                const roller = this.plugin.getRoller(
                    Object.keys(table.columns)[0].split(":").pop(),
                    this.source
                );
                if (roller instanceof StackRoller) {
                    this.lookupRoller = roller;
                    await this.lookupRoller.roll();

                    this.lookupRanges = table.rows.map((row) => {
                        const [range, option] = row
                            .split("|")
                            .map((s) => s.trim());

                        let [, min, max] =
                            range.match(/(\d+)(?:[^\d]+?(\d+))?/) ?? [];

                        if (!min && !max) return;
                        return [
                            [Number(min), max ? Number(max) : undefined],
                            option
                        ];
                    });
                    this.isLookup = true;
                }
            }

            if (this.header && table.columns[this.header]) {
                this.options = table.columns[this.header];
            } else {
                if (this.header)
                    throw new Error(
                        `Header ${this.header} was not found in table ${this.path} > ${this.block}.`
                    );
                this.options = table.rows;
            }
        }

        this.loaded = true;
        this.trigger("loaded");
    }
    toResult() {
        return {
            type: "table",
            result: this.result
        };
    }
    async applyResult(result: any) {
        if (result.type !== "table") return;
        if (result.result) {
            this.result = result.result;
        }
        await this.render();
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
