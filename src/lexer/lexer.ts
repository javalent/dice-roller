/* import lexer from "lex"; */

import * as moo from "moo";
import { Err, Ok, type Result } from "@sniptt/monads";
import { DataviewManager } from "src/api/api.dataview";
import type { Conditional } from "src/rollers/dice/dice";

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
    /(?:\d+|\b)[Dd](?:%|F|-?\d+|\[\d+(?:[ \t]*[,-][ \t]*\d+)+\]|\b)/u;

export const CONDITIONAL_REGEX =
    /(?:=|=!|<|>|<=|>=|=<|=>|-=|=-)(?:\d+(?:[Dd](?:%|F|-?\d+|\[\d+(?:[ \t]*[,-][ \t]*\d+)+\]|\b))?)/u;

type ParseContext = {
    associativity: "left" | "right";
    precedence: number;
};

class Parser {
    table: Record<string, ParseContext>;
    constructor(table: Record<string, ParseContext>) {
        this.table = table;
    }
    parse(input: LexicalToken[]) {
        const length = input.length,
            table = this.table,
            output = [],
            stack = [];
        let index = 0;

        while (index < length) {
            let token = input[index++];

            switch (token.value) {
                case "(":
                    stack.unshift(token);
                    break;
                case ")":
                    if (
                        input[index] &&
                        input[index].type == "dice" &&
                        /^d/.test(input[index].value)
                    ) {
                        input[index].parenedDice = true;
                    }
                    while (stack.length) {
                        token = stack.shift();
                        if (token.value === "(") break;
                        else {
                            output.push(token);
                        }
                    }

                    if (token.value !== "(")
                        throw new Error("Mismatched parentheses.");
                    break;
                default:
                    if (table.hasOwnProperty(token.value)) {
                        while (stack.length) {
                            const punctuator = stack[0];

                            if (punctuator.value === "(") break;

                            const operator = table[token.value],
                                precedence = operator.precedence,
                                antecedence =
                                    table[punctuator.value].precedence;

                            if (
                                precedence > antecedence ||
                                (precedence === antecedence &&
                                    operator.associativity === "right")
                            )
                                break;
                            else output.push(stack.shift());
                        }

                        stack.unshift(token);
                    } else {
                        output.push(token);
                    }
            }
        }

        while (stack.length) {
            const token = stack.shift();
            if (token.value !== "(") output.push(token);
            else throw new Error("Mismatched parentheses.");
        }

        return output;
    }
}
export interface LexicalToken extends Partial<moo.Token> {
    conditions?: Conditional[];
    parenedDice?: boolean;
    type: string;
    value: string;
}

class LexerClass {
    constructor() {
        this.parser = new Parser({
            "+": {
                precedence: 1,
                associativity: "left"
            },
            "-": {
                precedence: 1,
                associativity: "left"
            },
            "*": {
                precedence: 2,
                associativity: "left"
            },
            "/": {
                precedence: 2,
                associativity: "left"
            },
            "^": {
                precedence: 3,
                associativity: "right"
            }
        });
    }
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
        narrative: {
            match: /^(?:\d*(?:[GgYyBbRrPpSsWw]|[AaPpDdCcBbSsFf]|pro|boo|blk|k|sb|diff))(?: ?\d*(?:[GgYyBbRrPpSsWw]|[AaPpDdCcBbSsFf]|pro|boo|blk|k|sb|diff))+$/u,
            value: (match) => {
                const isAbbr = /[AaCcDd]/.test(match);
                return match
                    .toLowerCase()
                    .replace(/pro/g, "y")
                    .replace(/diff/g, "p")
                    .replace(/(blk|k|sb)/g, "s")
                    .replace(/boo/g, "b")
                    .replace(/p/g, isAbbr ? "y" : "p")
                    .replace(/a/g, "g")
                    .replace(/d/g, "p")
                    .replace(/c/g, "r")
                    .replace(/f/g, "w")
                    .replace(/ /g, "")
                    .replace(/(\d+)(\w)/g, (_, num: string, char: string) =>
                        char.repeat(Number(num))
                    )
            }
        },
        stunt: /1[Dd]S/u,
        "%": /\d+[Dd]\d+%/u,
        fudge: {
            match: /(?:\d*[Dd])?[Dd]?F/u,
            value: (match) => {
                const { roll = this.defaultRoll } = match.match(
                    /(?:(?<roll>\d*)[Dd])?F/
                ).groups;
                return `${roll}dF`;
            }
        },
        dice: [
            {
                match: OMITTED_REGEX,
                value: (match) => {
                    const {
                        roll = this.defaultRoll,
                        faces = this.defaultFace
                    } = match.match(
                        /(?<roll>\d+)?[Dd](?<faces>%|-?\d+|\[\d+(?:[ \t]*[,-][ \t]*\d+)+\])?/
                    ).groups;
                    return `${roll}d${faces}`;
                }
            },
            { match: /\d+/u },
            {
                match: /\b[A-Za-z][A-Za-z0-9_]+\b/u,
                value: (match) => {
                    return (
                        DataviewManager.getFieldValueFromActiveFile(match) ??
                        match
                    );
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
    defaultFace: number;
    defaultRoll: number;
    clampInfinite(match: string) {
        if (/i$/.test(match)) return "100";
        return match.replace(/^\D+/g, "");
    }
    public setInlineFields(fields: Map<string, number>) {
        this.inline = fields;
    }
    public setDefaults(roll: number, face: number) {
        this.defaultRoll = roll;
        this.defaultFace = face;
    }
    public setDefaultRoll(roll: number) {
        this.defaultRoll = roll;
    }
    public setDefaultFace(face: number) {
        this.defaultFace = face;
    }
    parse(input: string): Result<LexicalToken[], string> {
        try {
            const tokens = Array.from(this.lexer.reset(input));
            this.lexer.reset();
            return Ok(this.parser.parse(this.transform(tokens)));
        } catch (e: any) {
            console.error(e);
            return Err("Could not parse");
        }
    }
    transform(tokens: moo.Token[]): LexicalToken[] {
        tokens = tokens.filter((token) => {
            return token.type != "WS";
        });

        let isPlus = (t: moo.Token) =>
            t.type === "+" || (t.type === "math" && t.value === "+");
        let isMinus = (t: moo.Token) =>
            t.type === "-" || (t.type === "math" && t.value === "-");
        let isPlusOrMinus = (t: moo.Token) => isPlus(t) || isMinus(t);
        let peek = (arr: moo.Token[]) => arr[arr.length - 1];
        let replaceTop = (arr: moo.Token[], newTop: moo.Token) =>
            arr.splice(arr.length - 1, 1, newTop);

        tokens = tokens.reduce((acc, e) => {
            if (acc.length == 0) {
                acc.push(e);
            } else {
                let top = peek(acc);

                if (isPlusOrMinus(top) && isPlusOrMinus(e)) {
                    if (isMinus(top) != isMinus(e)) {
                        // one minus => minus
                        if (!isMinus(top)) replaceTop(acc, e);
                    } else if (isMinus(top)) {
                        top.type = top.type === "math" ? top.type : "+";
                        top.value = "+";
                    }
                } else {
                    acc.push(e);
                }
            }
            return acc;
        }, [] as moo.Token[]);
        let clone: LexicalToken[] = [];
        for (const token of tokens) {
            if (token.type == "condition" && clone.length > 0) {
                const previous = clone[clone.length - 1];
                if (!previous.conditions) previous.conditions = [];
                const [_, operator, comparer] =
                    token.value.match(
                        /(?<operator>=|=!|<|>|<=|>=|=<|=>|-=|=-)(?<comparer>\d+(?:[Dd](?:%|F|-?\d+|\[\d+(?:[ \t]*[,-][ \t]*\d+)+\]|\b))?)/
                    ) ?? [];
                const lexemes = this.parse(comparer);
                if (lexemes.isOk()) {
                    previous.conditions.push({
                        operator,
                        comparer: comparer,
                        lexemes: lexemes.unwrap(),
                        value: token.value
                    });
                }
            } else {
                clone.push(token as LexicalToken);
            }
        }
        return clone;
    }
}

export const Lexer = new LexerClass();
