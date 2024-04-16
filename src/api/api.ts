import type DiceRollerPlugin from "src/main";
import type { BasicRoller } from "src/roller/roller";
import type { DiceRollerSettings } from "src/settings/settings.types";
import { ExpectedValue, type RollerOptions, Round } from "src/types";

import { decode } from "he";
import type { LexicalToken } from "src/parser/lexer";

export default class API {
    initialize(plugin: DiceRollerPlugin) {
        this.data = plugin.data;
    }

    data: DiceRollerSettings;

    getTypeFromLexemes(lexemes: LexicalToken[]) {
        if (lexemes.some(({ type }) => type === "table")) {
            return "table";
        }
        if (lexemes.some(({ type }) => type === "section")) {
            return "section";
        }
        if (lexemes.some(({ type }) => type === "dataview")) {
            return "dataview";
        }
        if (lexemes.some(({ type }) => type === "tag")) {
            return "tag";
        }
        if (lexemes.some(({ type }) => type === "link")) {
            return "link";
        }
        if (lexemes.some(({ type }) => type === "line")) {
            return "line";
        }
        return "dice";
    }
    getParametersForRoller(
        content: string,
        options: RollerOptions
    ): { content: string } & RollerOptions {
        content = content.replace(/\\\|/g, "|");

        let showDice = options?.showDice ?? true;
        let shouldRender = options?.shouldRender ?? this.data.renderAllDice;
        let showFormula =
            options?.showFormula ?? this.data.displayResultsInline;
        let showParens = options?.showParens ?? this.data.displayFormulaAfter;
        let expectedValue: ExpectedValue =
            options?.expectedValue ?? this.data.initialDisplay;
        let text: string = options?.text ?? "";
        let round = options?.round ?? this.data.round;
        let signed = options?.signed ?? this.data.signed;

        const regextext = /\|text\((.*)\)/;

        //Flags always take precedence.
        if (content.includes("|nodice")) {
            showDice = false;
        }
        if (content.includes("|render")) {
            shouldRender = true;
        }
        if (content.includes("|norender")) {
            shouldRender = false;
        }
        if (content.includes("|form")) {
            showFormula = true;
        }
        if (content.includes("|noform")) {
            showFormula = false;
        }
        if (content.includes("|avg")) {
            expectedValue = ExpectedValue.Average;
        }
        if (content.includes("|none")) {
            expectedValue = ExpectedValue.None;
        }
        if (content.includes("|text(")) {
            let [, matched] = content.match(regextext) ?? [null, ""];
            text = matched;
        }
        if (content.includes("|paren")) {
            showParens = true;
        }
        if (content.includes("|noparen")) {
            showParens = false;
        }

        if (content.includes("|round")) {
            round = Round.Normal;
        }
        if (content.includes("|noround")) {
            round = Round.None;
        }
        if (content.includes("|ceil")) {
            round = Round.Up;
        }
        if (content.includes("|floor")) {
            round = Round.Down;
        }
        if (content.includes("|signed")) {
            signed = true;
        }

        content = decode(
            //remove flags...
            content
                .replace("|nodice", "")
                .replace("|render", "")
                .replace("|norender", "")
                .replace("|noform", "")
                .replace("|form", "")
                .replace("|noparen", "")
                .replace("|paren", "")
                .replace("|avg", "")
                .replace("|none", "")
                .replace("|round", "")
                .replace("|noround", "")
                .replace("|ceil", "")
                .replace("|floor", "")
                .replace("|signed", "")
                .replace(regextext, "")
        );

        if (content in this.data.formulas) {
            content = this.data.formulas[content];
        }

        return {
            content,
            showDice,
            showParens,
            showFormula,
            expectedValue,
            shouldRender,
            text,
            round,
            signed
        };
    }

    sources: Map<string, RollerOptions> = new Map();

    registerSource(source: string, options: RollerOptions): void {
        this.sources.set(source, options);
    }

    plugin: DiceRollerPlugin;
    getRollerSync(roll: string, source?: string): BasicRoller {
        const options =
            this.sources.get(source) ?? API.RollerOptions(this.data);
        return this.plugin.getRollerSync(roll, source, options);
    }

    async getRoller(roll: string, source?: string): Promise<BasicRoller> {
        const options =
            this.sources.get(source) ?? API.RollerOptions(this.data);
        return this.plugin.getRoller(roll, source, options);
    }

    getRollerString(roll: string, source?: string): string {
        if (!source) return roll;
        const options =
            this.sources.get(source) ?? API.RollerOptions(this.data);
        if ("showDice" in options) {
            roll += options.showDice ? "" : "|nodice";
        }
        if ("shouldRender" in options) {
            roll += options.shouldRender ? "|render" : "|norender";
        }
        if ("showFormula" in options) {
            roll += options.showFormula ? "|form" : "|noform";
        }
        if ("expectedValue" in options) {
            if (options.expectedValue == ExpectedValue.Average) {
                roll += "|avg";
            }
            if (options.expectedValue == ExpectedValue.None) {
                roll += "|none";
            }
        }
        if ("text" in options && options.text) {
            roll += "|text(" + options.text + ")";
        }
        if ("showParens" in options) {
            roll += options.showParens ? "|paren" : "|noparen";
        }
        if ("round" in options) {
            switch (options.round) {
                case Round.Down: {
                    roll += "|floor";
                    break;
                }
                case Round.Up: {
                    roll += "|ceil";
                    break;
                }
                case Round.Normal: {
                    roll += "|round";
                    break;
                }
                case Round.None: {
                    roll += "|noround";
                }
            }
        }
        if (options.signed) {
            roll += "|signed";
        }
        return roll;
    }

    static RollerOptions(data: DiceRollerSettings): RollerOptions {
        return {
            showDice: data.showDice,
            shouldRender: data.renderAllDice,
            showFormula: data.displayResultsInline,
            showParens: data.displayFormulaAfter,
            expectedValue: data.initialDisplay,
            round: data.round,
            text: null,
            signed: data.signed
        };
    }
}
