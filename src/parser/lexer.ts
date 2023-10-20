/* import lexer from "lex"; */

import * as moo from "moo";
import DiceRollerPlugin from "src/main";
import { Conditional } from "src/types";
import { Parser } from "./parser";

export const TAG_REGEX =
    /(?:\d+[Dd])?#(?:[\p{Letter}\p{Emoji_Presentation}\w/-]+)(?:\|(?:[+-]))?(?:\|(?:[^+-]+))?/u;
export const DATAVIEW_REGEX =
    /(?:\d+[Dd]?)?dv\((?:.+)\)(?:\|(?:[+-]))?(?:\|(?:[^+-]+))?/u;
export const TABLE_REGEX =
    /(?:.*)?(?:\[.*\]\(|\[\[)(?:.+?)#?\^(?:.+?)(?:\)|\]\])\|?(?:.+)?/u;
export const SECTION_REGEX =
    /(?:\d+[Dd])?(?:\[.*\]\(|\[\[)(?:.+)(?:\)|\]\])\|?(?:.+)?/u;
export const LINE_REGEX =
    /(?:\d+[Dd])?(?:\[.*\]\(|\[\[)(?:.+)(?:\)|\]\])\|line/u;
export const MATH_REGEX = /[\(\^\+\-\*\/\)]/u;
export const OMITTED_REGEX =
    /(?:\d+|\b)[Dd](?:%|F|-?\d+|\[\d+(?:[ \t]*,[ \t]*\d+)+\]|\b)/u;

export const CONDITIONAL_REGEX =
    /(?:=|=!|<|>|<=|>=|=<|=>|-=|=-)(?:\d+(?:[Dd](?:%|F|-?\d+|\[\d+(?:[ \t]*,[ \t]*\d+)+\]|\b))?)/u;

export interface LexicalToken extends Partial<moo.Token> {
    conditions?: Conditional[];
    parenedDice?: boolean;
    type: string;
    value: string;
}

export default class Lexer {
    lexer = moo.compile({
        WS: [{ match: /[ \t]+/u }, { match: /[{}]+/u }],
        table: TABLE_REGEX,
        line: LINE_REGEX,
        section: SECTION_REGEX,
        tag: TAG_REGEX,
        dataview: DATAVIEW_REGEX,

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
        u: /u/u,
        stunt: /1[Dd]S/u,
        "%": /\d+[Dd]\d+%/u,
        dice: [
            {
                match: OMITTED_REGEX,
                value: (match) => {
                    const {
                        roll = this.defaultRoll,
                        faces = this.defaultFace
                    } = match.match(
                        /(?<roll>\d+)?[Dd](?<faces>%|F|-?\d+|\[\d+(?:[ \t]*,[ \t]*\d+)+\])?/
                    ).groups;
                    return `${roll}d${faces}`;
                }
            },
            { match: /\d+/u },
            {
                match: /\b[A-Za-z][A-Za-z0-9_]+\b/u,
                value: (match) => {
                    if (this.inline.has(match)) {
                        return `${this.inline.get(match)}`;
                    }
                    return match;
                }
            }
        ],
        sort: [
            {
                match: /s(?:a|d)*/u,
                value: (str) => (str == "s" || str == "sa" ? "sa" : "sd")
            }
        ],
        math: MATH_REGEX
    });
    parser: Parser;
    inline: Map<string, number> = new Map();
    clampInfinite(match: string) {
        if (/i$/.test(match)) return "100";
        return match.replace(/^\D+/g, "");
    }
    public setInlineFields(fields: Map<string, number>) {
        this.inline = fields;
    }
    public setDefaultRoll(roll: number) {
        this.defaultRoll = roll;
    }
    public setDefaultFace(face: number) {
        this.defaultFace = face;
    }
    constructor(public defaultRoll: number, public defaultFace: number) {
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
        tokens = tokens.filter((token) => {
            return token.type != "WS";
        });
        let clone: LexicalToken[] = [];
        /** If the first token is a negative sign and the second is a dice roller, just make the dice roller negative. */
        if (tokens.length >= 2) {
            if (
                (tokens[0].type === "-" ||
                    (tokens[0].type === "math" && tokens[0].value === "-")) &&
                tokens[1].type === "dice"
            ) {
                tokens[1].value = `-${tokens[1].value}`;
                tokens.shift();
            }
        }
        for (const token of tokens) {
            if (token.type == "condition" && clone.length > 0) {
                const previous = clone[clone.length - 1];
                if (!previous.conditions) previous.conditions = [];
                const [_, operator, comparer] =
                    token.value.match(
                        /(?<operator>=|=!|<|>|<=|>=|=<|=>|-=|=-)(?<comparer>\d+(?:[Dd](?:%|F|-?\d+|\[\d+(?:[ \t]*,[ \t]*\d+)+\]|\b))?)/
                    ) ?? [];
                const lexemes = this.parse(comparer);
                previous.conditions.push({
                    operator,
                    comparer: comparer,
                    lexemes,
                    value: token.value
                });
            } else {
                clone.push(token as LexicalToken);
            }
        }
        return clone;
    }
}
