import { LexicalToken } from "../src/lexer/lexer";

export function toLexicalToken(e: LexicalToken): LexicalToken {
    let { conditions, parenedDice, type, value } = e;
    return { conditions, parenedDice, type, value };
}
