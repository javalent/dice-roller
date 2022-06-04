import { MarkdownRenderer, Notice, Pos } from "obsidian";

import { TABLE_REGEX } from "src/utils/constants";
import { StackRoller } from ".";
import { GenericFileRoller } from "./roller";

class SubRollerResult {
    result: string="";
    combinedTooltip: string="";
}

export class TableRoller extends GenericFileRoller<string> {
    content: string;
    position: Pos;
    block: string;
    header: string;
    rollsFormula: string;
    isLookup: any;
    lookupRoller: StackRoller;
    lookupRanges: [range: [min: number, max: number], option: string][];
    combinedTooltip: string = "";
    prettyTooltip: string = "";
    getPath() {
        const { groups } = this.lexeme.value.match(TABLE_REGEX);

        const { diceRoll="1", link, block, header } = groups;
        if (!link || !block) throw new Error("Could not parse link.");

        // For backward compatiblity: xd transformed into x (instead of xd100)
        const matches = diceRoll.match(/(\d*?)[Dd]$/);
        if (matches) {
            const [, nbRolls = "1", ] = matches;
            this.rollsFormula = nbRolls;
        }
        else {
            this.rollsFormula = diceRoll;
        }
        this.rolls = 1;

        this.path = decodeURIComponent(link.replace(/(\[|\]|\(|\))/g, ""));
        this.block = block
            .replace(/(\^|#)/g, "")
            .trim()
            .toLowerCase();
        this.header = header;
    }
    get tooltip() {
        return this.prettyTooltip;
    }
    get replacer() {
        return this.result;
    }
    result: string;
    async build() {
        this.resultEl.empty();
        const result = [this.result];
        if (this.plugin.data.displayResultsInline) {
            result.unshift(this.inlineText);
        }
        MarkdownRenderer.renderMarkdown(
            result.join(""),
            this.resultEl.createSpan("embedded-table-result"),
            this.source,
            null
        );
    }

    prettify(input: string): string {
        const specialChars = /(.*?)(\(|\)|;|\|\|)(.*)/
        const tab = "\t";
        let tabCount = 0;
        let output:string = "";

        let remaining:string = input;
        let matches: RegExpMatchArray;
        while (matches = remaining.match(specialChars)) {
            let [, beforeSpecial, special, afterSpecial] = matches;
            output += beforeSpecial;
            if (special == ")") {
                tabCount--;
                output += "\n";
                output += tab.repeat(tabCount);
                output += ")";
            }
            else {
                if (special == "(") {
                    tabCount++;
                    output += "(";
                }
                else if (special == ";") {
                    output += ",";
                }
                else if (special == "||") {
                    output += "|";
                }
                output += "\n"
                output += tab.repeat(tabCount);
            }
            remaining = afterSpecial;
        }
        output += remaining;

        return output;
    }

    async getSubResult(input: string | number): Promise<SubRollerResult> {
        let res: SubRollerResult = new SubRollerResult();
        if (typeof input === "number") {
            res.result = input.toString();
        }
        else {
            res.result = input;
        }
        let subTooltips: string[] = [];

        // WARN: we may receive an input that is not string (but a number). Check
        // for embeded formulas only if we can.
        if (typeof input === "string") {
            // Look for dice blocks: `dice: <formula>`
            const rollerPattern = /(?:\`dice:)(.*?)(?:\`)/g;
            const foundRollers = input.matchAll(rollerPattern);

            for (let foundRoller of foundRollers) {
                const formula = foundRoller[1].trim();

                // Create sub roller with formula
                const subRoller = await this.plugin.getRoller(formula, this.source);
                // Roll it
                await subRoller.roll();
                // Get sub result
                const rollerResult = await this.getSubResult(subRoller.result);

                // Replace dice block by sub result
                res.result = res.result.replace(foundRoller[0], rollerResult.result);

                // Update tooltip
                if (subRoller instanceof TableRoller) {
                    subTooltips.push(subRoller.combinedTooltip);
                }
                else {
                    const [top, bottom] = subRoller.tooltip.split("\n");
                    subTooltips.push(top + " --> " + bottom);
                }
            }
        }

        res.combinedTooltip = subTooltips.join(";");

        return res;
    }

    async getResult() {
        let res = [];
        let subTooltips: string[] = [];
        let formula = this.original;

        if (this.rollsFormula) {
            try {
                const roller = await this.plugin.getRoller(this.rollsFormula, this.source);
                if (!(roller instanceof StackRoller)) {
                    this.prettyTooltip = "TableRoller only supports dice rolls to select multiple elements.";
                    new Notice(this.prettyTooltip);
                    return("ERROR");
                }
                const rollsRoller = roller as StackRoller;
                await rollsRoller.roll();
                this.rolls = rollsRoller.result;
                if (!rollsRoller.isStatic) {
                    formula = formula.replace(this.rollsFormula, `${this.rollsFormula.trim()} --> ${rollsRoller.resultText} > `);
                }
            }
            catch(error) {
                this.prettyTooltip = `TableRoller: '${this.rollsFormula}' is not a valid dice roll.`;
                new Notice(this.prettyTooltip);
                return("ERROR");
            }
        }

        for (let i = 0; i < this.rolls; i++) {
            let subTooltip:string = "";
            let subResult: SubRollerResult;
            let selectedOption:string = "";

            if (this.isLookup) {
                const result = await this.lookupRoller.roll();
                const option = this.lookupRanges.find(
                    ([range]) =>
                        (range[1] === undefined && result === range[0]) ||
                        (result >= range[0] && range[1] >= result)
                );
                if (option) {
                    subTooltip = this.lookupRoller.original.trim() + " --> " + `${this.lookupRoller.resultText}${this.header ? " | " + this.header : ""}`.trim();
                    selectedOption = option[1];
                }
            }
            else {
                const options = [...this.options];
                const randomRowNumber = this.getRandomBetween(0, options.length - 1);
                subTooltip = options.length + " rows" + " --> " + "[row " + (randomRowNumber+1) + "]";
                selectedOption = options[randomRowNumber];
            }

            subResult = await this.getSubResult(selectedOption);
            res.push(subResult.result);

            if (subResult.combinedTooltip) {
                subTooltip += " > (" + subResult.combinedTooltip + ")";
            }
            subTooltips.push(subTooltip);
        }

        if (subTooltips.length == 0) {
            this.combinedTooltip = formula;
        }
        else if (subTooltips.length == 1) {
            this.combinedTooltip = formula + " " + subTooltips.join("");
        }
        else {
            this.combinedTooltip = formula + " ==> (" + subTooltips.join(" ||") + ")";
        }

        this.prettyTooltip = this.prettify(this.combinedTooltip);

        return res.join("||");
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
                const roller = await this.plugin.getRoller(
                    Object.keys(table.columns)[0].split(":").pop(),
                    this.source
                );
                if (roller instanceof StackRoller) {
                    this.lookupRoller = roller;
                    // TODO: useless roll I think
                    // let result = await this.lookupRoller.roll();

                    this.lookupRanges = table.rows.map((row) => {
                        const [range, option] = row
                            .replace(/\\\|/g, "{ESCAPED_PIPE}")
                            .split("|")
                            .map((str) => str.replace(/{ESCAPED_PIPE}/g, "\\|"))
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
                if (this.header) {
                    throw new Error(
                        `Header ${this.header} was not found in table ${this.path} > ${this.block}.`
                    );
                }
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
const SPLIT = /\|/g;

function extract(content: string) {
    const lines = content.split("\n");

    const inner = lines.map((l) => (l.trim().match(MATCH) ?? [, l.trim()])[1]);

    const headers = inner[0].replace("\\|", "{ESCAPED_PIPE}").split(SPLIT);

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
            .replace(/\\\|/g, "{ESCAPED_PIPE}")
            .split(SPLIT)
            .map((e) => e.replace(/{ESCAPED_PIPE}/g, "\\|"))
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
