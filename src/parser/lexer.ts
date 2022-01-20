/* import lexer from "lex"; */

import * as moo from "moo";
import DiceRollerPlugin from "src/main";
import { Conditional, Lexeme } from "src/types";
import { Parser } from "./parser";

export const TAG_REGEX =
    /(?:\d+[Dd])?#(?:[\p{Letter}\p{Emoji_Presentation}\w/-]+)(?:\|(?:[+-]))?(?:\|(?:[^+-]+))?/u;
export const LINK_REGEX =
    /(?:\d+[Dd])?#(?:[\p{Letter}\p{Emoji_Presentation}\w/-]+)(?:\|(?:[+-]))?\|link/u;

const INTERNAL_LINK = /(?:\[.*\]\(|\[\[)(?:.+)(?:\)|\]\])/;

export const TABLE_REGEX =
    /(?:\d+[Dd])?(?:\[.*\]\(|\[\[)(?:.+?)#?\^(?:.+?)(?:\)|\]\])\|?(?:.+)?/u;
export const SECTION_REGEX =
    /(?:\d+[Dd])?(?:\[.*\]\(|\[\[)(?:.+)(?:\)|\]\])\|?(?:.+)?/u;
export const LINE_REGEX =
    /(?:\d+[Dd])?(?:\[.*\]\(|\[\[)(?:.+)(?:\)|\]\])\|line/u;
export const MATH_REGEX = /[\(\^\+\-\*\/\)]/u;
export const OMITTED_REGEX =
    /(?:\d+)?[Dd](?:\[?(?:-?\d+\s?,)?\s?(?:-?\d+|%|F)\]?)?/u;

export const CONDITIONAL_REGEX = /(?:=|=!|<|>|<=|>=|=<|=>|-=|=-)\d+/u;

export interface LexicalToken extends moo.Token {
    conditions?: Conditional[];
    parenedDice?: boolean;
}

export default class Lexer {
    lexer = moo.compile({
        WS: [{ match: /[ \t]+/u }, { match: /[{}]+/u }],
        table: TABLE_REGEX,
        line: LINE_REGEX,
        section: SECTION_REGEX,
        link: LINK_REGEX,
        tag: TAG_REGEX,

        condition: CONDITIONAL_REGEX,
        kl: { match: /kl\d*/u, value: this.clampInfinite },
        kh: [
            { match: /kh\d*/u, value: this.clampInfinite },
            { match: /k\d*/u, value: this.clampInfinite }
        ],
        dh: { match: /dh\d*/u, value: this.clampInfinite },
        dl: [{ match: /dl\d*/u, value: this.clampInfinite }],
        "!!": {
            match: /!!(?:i|\d+)?/u,
            value: this.clampInfinite
        },
        "!": {
            match: /!(?:i|\d+)?/u,
            value: this.clampInfinite
        },
        r: {
            match: /r(?:i|\d+)?/u,
            value: this.clampInfinite
        },
        stunt: /1[Dd]S/u,
        "%": /\d+[Dd]\d+%/u,
        dice: [
            {
                match: OMITTED_REGEX,
                value: (match) => {
                    const {
                        roll = this.plugin.data.defaultRoll,
                        faces = this.plugin.data.defaultFace
                    } = match.match(
                        /(?<roll>\d+)?[Dd](?<faces>\[?(?:-?\d+\s?,)?\s?(?:-?\d+|%|F)\]?)?/
                    ).groups;
                    return `${roll}d${faces}`;
                }
            },
            { match: /\d+/u },
            {
                match: /[A-Za-z][A-Za-z0-9_]+/u,
                value: (match) => {
                    if (this.plugin.inline.has(match)) {
                        return `${this.plugin.inline.get(match)}`;
                    }
                    return match;
                }
            }
        ],
        math: MATH_REGEX
    });
    parser: Parser;
    clampInfinite(match: string) {
        if (/i$/.test(match)) return "100";
        return match.replace(/^\D+/g, "");
    }
    constructor(public plugin: DiceRollerPlugin) {
        const exponent = {
            precedence: 3,
            associativity: "right"
        };

        const factor = {
            precedence: 2,
            associativity: "left"
        };

        const term = {
            precedence: 1,
            associativity: "left"
        };

        this.parser = new Parser({
            "+": term,
            "-": term,
            "*": factor,
            "/": factor,
            "^": exponent
        });
    }
    parse(input: string) {
        const tokens = Array.from(this.lexer.reset(input));
        this.lexer.reset();
        return this.parser.parse(this.transform(tokens));
    }
    transform(tokens: moo.Token[]): LexicalToken[] {
        tokens = tokens.filter((token) => token.type != "WS");
        let clone: LexicalToken[] = [];
        for (const token of tokens) {
            if (token.type == "condition" && clone.length > 0) {
                const previous = clone[clone.length - 1];
                if (!previous.conditions) previous.conditions = [];
                const [_, operator, comparer] =
                    token.value.match(
                        /(?<operator>=|=!|<|>|<=|>=|=<|=>|\-=|=\-)(?<comparer>\d+)/
                    ) ?? [];
                previous.conditions.push({
                    operator,
                    comparer: Number(comparer),
                    value: token.value
                });
            } else {
                clone.push(token);
            }
        }
        return clone;
    }
    getTypeFromLexemes(lexemes: Lexeme[]) {
        if (lexemes.some(({ type }) => type === "table")) {
            return "table";
        }
        if (lexemes.some(({ type }) => type === "section")) {
            return "section";
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
}
