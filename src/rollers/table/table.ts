import {
    App,
    Component,
    MarkdownRenderer,
    Notice,
    setIcon,
    TFile,
    type CachedMetadata
} from "obsidian";

import { TABLE_REGEX } from "src/utils/constants";
import { StackRoller } from "../dice/stack";
import { GenericFileRoller } from "../roller";
import { API } from "src/api/api";
import type { DiceRollerSettings } from "src/settings/settings.types";
import type { LexicalToken } from "src/lexer/lexer";

class SubRollerResult {
    result: string = "";
    combinedTooltip: string = "";
}

export class TableRoller extends GenericFileRoller<string> {
    content: string;
    block: string;
    header: string;
    rollsFormula: string;
    isLookup: boolean = false;
    lookupRoller: StackRoller;
    lookupRanges: [range: [min: number, max: number], option: string][];
    combinedTooltip: string = "";
    prettyTooltip: string = "";

    constructor(
        data: DiceRollerSettings,
        original: string,
        lexeme: LexicalToken,
        source: string,
        app: App,
        position = data.position,
        public lookup?: string
    ) {
        super(data, original, lexeme, source, app, position);
        if (lookup) {
        }
        this.getPath();
    }
    getPath() {
        const { groups } = this.lexeme.value.match(TABLE_REGEX) ?? {};

        const { diceRoll = "1", link, block, header } = groups ?? {};
        if (!link || !block) throw new Error("Could not parse link.");

        // For backward compatiblity: xd transformed into x (instead of xd100)
        const matches = diceRoll.match(/(\d*?)[Dd]$/);
        if (matches) {
            const [, nbRolls = "1"] = matches;
            this.rollsFormula = nbRolls;
        } else {
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
    getTooltip() {
        return this.prettyTooltip;
    }
    async getReplacer() {
        return this.result;
    }
    result: string;
    getResultText(): string {
        const result = [this.result];
        if (this.data.displayResultsInline) {
            result.unshift(this.inlineText);
        }
        return result.join("");
    }
    async build() {
        this.resultEl.empty();
        const result = [this.result];
        if (this.data.displayResultsInline) {
            result.unshift(this.inlineText);
        }
        const div = createSpan();
        MarkdownRenderer.render(
            this.app,
            this.getResultText(),
            div,
            this.source,
            new Component()
        );
        const resultEl = this.resultEl.createSpan("embedded-table-result");
        if (
            div.childElementCount == 1 &&
            div.firstElementChild instanceof HTMLParagraphElement
        ) {
            resultEl.append(...Array.from(div.firstElementChild.childNodes));
        } else {
            resultEl.append(...Array.from(div.childNodes));
        }
    }

    prettify(input: string): string {
        const specialChars = /(.*?)(\(|\)|;|\|\|)(.*)/;
        const tab = "\t";
        let tabCount = 0;
        let output: string = "";

        let remaining: string = input;
        let matches: RegExpMatchArray;
        while ((matches = remaining.match(specialChars))) {
            let [, beforeSpecial, special, afterSpecial] = matches;
            output += beforeSpecial;
            if (special == ")") {
                tabCount--;
                output += "\n";
                output += tab.repeat(tabCount);
                output += ")";
            } else {
                if (special == "(") {
                    tabCount++;
                    output += "(";
                } else if (special == ";") {
                    output += ",";
                } else if (special == "||") {
                    output += "|";
                }
                output += "\n";
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
        } else {
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
                const subRoller = await API.getRoller(formula, this.source);
                if (subRoller == null) {
                    continue;
                }
                subRoller.addContexts(...this.components);
                // Roll it
                await subRoller.roll();
                // Get sub result
                const rollerResult = await this.getSubResult(subRoller.result);

                let result: string;
                if ((rollerResult.result as any) instanceof TFile) {
                    result = (rollerResult.result as unknown as TFile).basename;
                } else {
                    result = rollerResult.result;
                }

                // Replace dice block by sub result
                res.result = res.result.replace(foundRoller[0], result);

                // Update tooltip
                if (subRoller instanceof TableRoller) {
                    subTooltips.push(subRoller.combinedTooltip);
                } else {
                    const [top, bottom] = subRoller.getTooltip().split("\n");
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
                const roller = await API.getRoller(
                    this.rollsFormula,
                    this.source
                );
                if (roller) {
                    if (!(roller instanceof StackRoller)) {
                        this.prettyTooltip =
                            "TableRoller only supports dice rolls to select multiple elements.";
                        new Notice(this.prettyTooltip);
                        return "ERROR";
                    }
                    const rollsRoller = roller as StackRoller;
                    rollsRoller.addContexts(...this.components);
                    await rollsRoller.roll();
                    this.rolls = rollsRoller.result;
                    if (!rollsRoller.isStatic) {
                        formula = formula.replace(
                            this.rollsFormula,
                            `${this.rollsFormula.trim()} --> ${rollsRoller.getDisplayText()} > `
                        );
                    }
                }
            } catch (error) {
                this.prettyTooltip = `TableRoller: '${this.rollsFormula}' is not a valid dice roll.`;
                new Notice(this.prettyTooltip);
                return "ERROR";
            }
        }

        for (let i = 0; i < this.rolls; i++) {
            let subTooltip: string = "";
            let subResult: SubRollerResult;
            let selectedOption: string = "";

            if (this.isLookup) {
                const result = await this.lookupRoller.roll();
                const option = this.lookupRanges.find(
                    ([range]) =>
                        (range[1] === undefined && result === range[0]) ||
                        (result >= range[0] && range[1] >= result)
                );
                if (option) {
                    subTooltip =
                        this.lookupRoller.original.trim() +
                        " --> " +
                        `${this.lookupRoller.getDisplayText()}${
                            this.header ? " | " + this.header : ""
                        }`.trim();
                    selectedOption = option[1];
                }
            } else {
                const options = [...this.options];
                const randomRowNumber = this.getRandomBetween(
                    0,
                    options.length - 1
                );
                subTooltip =
                    options.length +
                    " rows" +
                    " --> " +
                    "[row " +
                    (randomRowNumber + 1) +
                    "]";
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
        } else if (subTooltips.length == 1) {
            this.combinedTooltip = formula + " " + subTooltips.join("");
        } else {
            this.combinedTooltip =
                formula + " ==> (" + subTooltips.join(" ||") + ")";
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
                this.once("loaded", async () => {
                    this.result = await this.getResult();

                    this.render();

                    this.trigger("new-result");
                    resolve(this.result);
                });

                this.load();
            }
        });
    }

    async getOptions(cache: CachedMetadata, data: string) {
        this.cache = cache;

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
        const position = this.cache.blocks[this.block].position;
        const content = data.slice(position.start.offset, position.end.offset);

        if (!(await this.checkForDirtiness(content))) return;

        this.content = content;

        if (section && section.type === "list") {
            this.options = this.content.split("\n");
        } else {
            let table = extract(this.content);

            /** Check for Lookup Table */
            if (
                /dice:\s*([\s\S]+)\s*?/.test(
                    Array.from(table.columns.keys())[0]
                ) ||
                this.lookup
            ) {
                const rollString =
                    this.lookup ??
                    Array.from(table.columns.keys())[0]
                        .split(":")
                        .pop()
                        .replace(/\`/g, "");

                const roller = await API.getRoller(
                    rollString.replace(/{ESCAPED_PIPE}/g, "\\|"),
                    this.source
                );
                if (roller) {
                    roller.addContexts(...this.components);
                    if (roller instanceof StackRoller) {
                        this.lookupRoller = roller;

                        this.lookupRanges = table.rows.map((row) => {
                            const [range, option] = row
                                .replace(/\\\|/g, "{ESCAPED_PIPE}")
                                .split("|")
                                .map((str) =>
                                    str.replace(/{ESCAPED_PIPE}/g, "\\|")
                                )
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
            }
            /** Check for 2d Rolling */
            if (this.header === "xy" && !table.columns.has("xy")) {
                this.options = [];
                for (const column of Array.from(table.columns.values()).slice(
                    1
                )) {
                    this.options.push(...column);
                }
            } else if (this.header && table.columns.has(this.header)) {
                this.options = table.columns.get(this.header);
            } else {
                if (this.header) {
                    throw new Error(
                        `Header ${this.header} was not found in table ${this.path} > ${this.block}.`
                    );
                }
                this.options = table.rows;
            }
        }
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
        columns: new Map(ret),
        rows: rows
    };
}
