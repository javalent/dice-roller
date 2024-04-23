import { ArrayRoller, type BasicRoller } from "../roller/roller";
import type { DiceRollerSettings } from "../settings/settings.types";
import { ExpectedValue, Round } from "../types/api";

import { decode } from "he";
import { Lexer, type LexicalToken } from "../lexer/lexer";
import type { App } from "obsidian";
import type DiceRenderer from "../renderer/renderer";
import {
    StackRoller,
    TableRoller,
    SectionRoller,
    DataViewRoller,
    TagRoller,
    LineRoller
} from "../roller";
import { DataviewManager } from "./api.dataview";

export * from "../types/api";

export {
    type StackRoller,
    type TableRoller,
    type SectionRoller,
    type DataViewRoller,
    type TagRoller,
    type LineRoller,
    type ArrayRoller
};

export interface RollerOptions {
    showDice?: boolean;
    shouldRender?: boolean;
    showFormula?: boolean;
    expectedValue?: ExpectedValue;
    round?: Round;
    text?: string;
    showParens?: boolean;
    formulaAfter?: boolean;
    signed?: boolean;
}

declare global {
    interface Window {
        DiceRoller: APIInstance;
    }
}
declare module "obsidian" {
    interface Workspace {
        on(
            name: "dice-roller:render-dice",
            callback: (roll: string) => void
        ): EventRef;
        on(
            name: "dice-roller:rendered-result",
            callback: (result: number) => void
        ): EventRef;
        on(
            name: "dice-roller:settings-change",
            callback: (data: DiceRollerSettings) => void
        ): EventRef;
        on(
            name: "dice-roller:new-result",
            callback: (data: StackRoller) => void
        ): EventRef;

        on(name: "dice-roller:loaded", callback: () => void): EventRef;
        on(name: "dice-roller:unloaded", callback: () => void): EventRef;
    }
}
class APIInstance {
    app: App;
    data: DiceRollerSettings;
    renderer: DiceRenderer;

    initialize(data: DiceRollerSettings, app: App, renderer: DiceRenderer) {
        this.data = data;
        this.app = app;
        this.renderer = renderer;
    }

    #getTypeFromLexemes(lexemes: LexicalToken[]) {
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

    getRollerSync(
        raw: string,
        source: string,
        options: RollerOptions = this.getRollerOptions(this.data)
    ): BasicRoller {
        const {
            content,
            showDice,
            showParens,
            showFormula,
            expectedValue,
            shouldRender,
            text,
            round,
            signed
        } = this.getParametersForRoller(raw, options);

        const lexemes = Lexer.parse(content);

        const type = this.#getTypeFromLexemes(lexemes);

        switch (type) {
            case "dice": {
                const roller = new StackRoller(
                    this.data,
                    content,
                    lexemes,
                    this.renderer,
                    this.app,
                    showDice,
                    text,
                    expectedValue,
                    showParens,
                    round,
                    signed
                );
                roller.shouldRender = shouldRender;
                roller.showFormula = showFormula;
                roller.showRenderNotice = this.data.showRenderNotice;

                return roller;
            }
            case "table": {
                const roller = new TableRoller(
                    this.data,
                    content,
                    lexemes[0],
                    source,
                    this.app,
                    showDice
                );
                roller.init;
                return roller;
            }
            case "section": {
                return new SectionRoller(
                    this.data,
                    content,
                    lexemes[0],
                    source,
                    this.app,
                    showDice
                );
            }
            case "dataview": {
                if (!DataviewManager.canUseDataview) {
                    throw new Error(
                        "Tags are only supported with the Dataview plugin installed."
                    );
                }
                return new DataViewRoller(
                    this.data,
                    content,
                    lexemes[0],
                    source,
                    this.app,
                    showDice
                );
            }
            case "tag": {
                if (!DataviewManager.canUseDataview) {
                    throw new Error(
                        "Tags are only supported with the Dataview plugin installed."
                    );
                }
                return new TagRoller(
                    this.data,
                    content,
                    lexemes[0],
                    source,
                    this.app,
                    showDice
                );
            }
            case "line": {
                return new LineRoller(
                    this.data,
                    content,
                    lexemes[0],
                    source,
                    this.app,
                    showDice
                );
            }
        }
    }

    async getRoller(
        raw: string,
        source: string = "",
        options: RollerOptions = this.getRollerOptions(this.data)
    ): Promise<BasicRoller> {
        const {
            content,
            showDice,
            showParens,
            showFormula,
            expectedValue,
            round,
            shouldRender,
            text,
            signed
        } = this.getParametersForRoller(raw, options);

        const lexemes = Lexer.parse(content);

        const type = this.#getTypeFromLexemes(lexemes);
        switch (type) {
            case "dice": {
                const roller = new StackRoller(
                    this.data,
                    content,
                    lexemes,
                    this.renderer,
                    this.app,
                    showDice,
                    text,
                    expectedValue,
                    showParens,
                    round,
                    signed
                );
                roller.showFormula = showFormula;
                roller.shouldRender = shouldRender;
                roller.showRenderNotice = this.data.showRenderNotice;

                return roller;
            }
            case "table": {
                const roller = new TableRoller(
                    this.data,
                    content,
                    lexemes[0],
                    source,
                    this.app,
                    showDice
                );
                await roller.init;
                return roller;
            }
            case "section": {
                return new SectionRoller(
                    this.data,
                    content,
                    lexemes[0],
                    source,
                    this.app,
                    showDice
                );
            }
            case "dataview": {
                if (!DataviewManager.canUseDataview) {
                    throw new Error(
                        "Tags are only supported with the Dataview plugin installed."
                    );
                }
                return new DataViewRoller(
                    this.data,
                    content,
                    lexemes[0],
                    source,
                    this.app,
                    showDice
                );
            }
            case "tag": {
                if (!DataviewManager.canUseDataview) {
                    throw new Error(
                        "Tags are only supported with the Dataview plugin installed."
                    );
                }
                return new TagRoller(
                    this.data,
                    content,
                    lexemes[0],
                    source,
                    this.app,
                    showDice
                );
            }
            case "line": {
                return new LineRoller(
                    this.data,
                    content,
                    lexemes[0],
                    source,
                    this.app,
                    showDice
                );
            }
        }
    }

    getRollerString(roll: string, source?: string): string {
        if (!source) return roll;
        const options =
            this.sources.get(source) ?? this.getRollerOptions(this.data);
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
    async getArrayRoller(options: any[], rolls = 1) {
        const roller = new ArrayRoller(this.data, options, rolls);

        await roller.roll();
        return roller;
    }
    public async parseDice(content: string, source: string = "") {
        const roller = await this.getRoller(content, source);
        return { result: await roller.roll(), roller };
    }
    getRollerOptions(data: DiceRollerSettings): RollerOptions {
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

export const API = new APIInstance();
