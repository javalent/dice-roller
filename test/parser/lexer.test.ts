import { vi, test, expect } from "vitest";
import { Lexer } from "../../src/lexer/lexer";
import { toLexicalToken } from "../util";

/**
 * possible formats:
 * d == 1d100 or whats set as defaults in settings
 * XdX
 *
 * Xd% == Xd100
 * XdXXXXX% custom percent faces per digit
 *
 * XdXdh{n} drop highest n rolls; default n == 1
 * XdXdl{n} drop lowest n rolls; default n == 1
 * XdXk{n} / XdXkh{n} keep highest n rolls; default n == 1
 * XdXkl{n} keep lowest n rolls; default n == 1
 *
 * XdX!!{n|i} explode and combine explodedresults       => i is special and equals n == 100 (infinite)
 * XdX!{n|i} explode and list exploded results in array => i is special and equals n == 100 (infinite)
 *
 * XdXu all rolls must be unique, rerolled dice are render  with prepended u
 *
 * Xd[Y, Z] rolls a numberbetween Y and Z
 *
 * XdXr{n|i} reroll minimum dice, e.g. every 1 will be rerolled n times max or i (100 times)
 *
 * XdXsa / XdXsd sort results ascending/descending
 * ---
 * XdF roll fudge/fate dice (cannot be used in calculations)
 * 1dS roll a Fantasy AGE stunt dice
 * ---
 * [[Note]] random block of note
 * Xd[[]] X random block from Note
 * [[Note]]|line random line from Note
 * [[Note]]|heading-Y random heading of size Y
 * [[Note^block-id]] listitem or row of table
 * 1d4+1[[Note^block-id]]` 1d4+1 listitems or rows of table
 * [[Note^block-id]]|Header 2 select Header 2 column for results in tables
 *
 * TODO: add tests
 * - https://plugins.javalent.com/dice/rollers/section#Block+types tests
 * - adding '|xy' to the end of a table roller will return a random table cell (not row)
 */

vi.mock("src/api/api.dataview", () => ({
    getFieldFromActiveFile: vi.fn()
}));

Lexer.setDefaultFace(100);
Lexer.setDefaultRoll(1);

test('Lexer should parse "d"', () => {
    let actual = Lexer.parse("d").map(toLexicalToken);
    expect(actual).toEqual([
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "dice",
            value: "1d100"
        }
    ]);
});

test('Lexer should parse "5d17"', () => {
    let actual = Lexer.parse("5d17").map(toLexicalToken);
    expect(actual).toEqual([
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "dice",
            value: "5d17"
        }
    ]);
});

test('Lexer should parse "5d%"', () => {
    let actual = Lexer.parse("5d%").map(toLexicalToken);
    expect(actual).toEqual([
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "dice",
            value: "5d%"
        }
    ]);
});

test('Lexer should parse "2d66%"', () => {
    let actual = Lexer.parse("2d66%").map(toLexicalToken);
    expect(actual).toEqual([
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "%",
            value: "2d66%"
        }
    ]);
});

test('Lexer should parse "1d6dh', () => {
    let actual = Lexer.parse("1d6dh").map(toLexicalToken);
    expect(actual).toEqual([
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "dice",
            value: "1d6"
        },
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "dh",
            value: ""
        }
    ]);
});

test('Lexer should parse "1d6dh3', () => {
    let actual = Lexer.parse("1d6dh3").map(toLexicalToken);
    expect(actual).toEqual([
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "dice",
            value: "1d6"
        },
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "dh",
            value: "3"
        }
    ]);
});

test('Lexer should parse "1d6dl', () => {
    let actual = Lexer.parse("1d6dl").map(toLexicalToken);
    expect(actual).toEqual([
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "dice",
            value: "1d6"
        },
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "dl",
            value: ""
        }
    ]);
});

test('Lexer should parse "1d6dl3', () => {
    let actual = Lexer.parse("1d6dl3").map(toLexicalToken);
    expect(actual).toEqual([
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "dice",
            value: "1d6"
        },
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "dl",
            value: "3"
        }
    ]);
});

test('Lexer should parse "1d6kl', () => {
    let actual = Lexer.parse("1d6kl").map(toLexicalToken);
    expect(actual).toEqual([
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "dice",
            value: "1d6"
        },
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "kl",
            value: ""
        }
    ]);
});

test('Lexer should parse "1d6kl3', () => {
    let actual = Lexer.parse("1d6kl3").map(toLexicalToken);
    expect(actual).toEqual([
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "dice",
            value: "1d6"
        },
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "kl",
            value: "3"
        }
    ]);
});

test('Lexer should parse "1d6k', () => {
    let actual = Lexer.parse("1d6k").map(toLexicalToken);
    expect(actual).toEqual([
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "dice",
            value: "1d6"
        },
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "kh",
            value: ""
        }
    ]);
});

test('Lexer should parse "1d6k3', () => {
    let actual = Lexer.parse("1d6k3").map(toLexicalToken);
    expect(actual).toEqual([
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "dice",
            value: "1d6"
        },
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "kh",
            value: "3"
        }
    ]);
});

test('Lexer should parse "1d6kh', () => {
    let actual = Lexer.parse("1d6kh").map(toLexicalToken);
    expect(actual).toEqual([
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "dice",
            value: "1d6"
        },
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "kh",
            value: ""
        }
    ]);
});

test('Lexer should parse "1d6kh3', () => {
    let actual = Lexer.parse("1d6kh3").map(toLexicalToken);
    expect(actual).toEqual([
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "dice",
            value: "1d6"
        },
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "kh",
            value: "3"
        }
    ]);
});

test('Lexer should parse "5d6!!', () => {
    let actual = Lexer.parse("5d6!!").map(toLexicalToken);
    expect(actual).toEqual([
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "dice",
            value: "5d6"
        },
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "!!",
            value: ""
        }
    ]);
});

test('Lexer should parse "5d6!!3', () => {
    let actual = Lexer.parse("5d6!!3").map(toLexicalToken);
    expect(actual).toEqual([
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "dice",
            value: "5d6"
        },
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "!!",
            value: "3"
        }
    ]);
});

test('Lexer should parse "5d6!!i', () => {
    let actual = Lexer.parse("5d6!!i").map(toLexicalToken);
    expect(actual).toEqual([
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "dice",
            value: "5d6"
        },
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "!!",
            value: "100"
        }
    ]);
});

test('Lexer should parse "5d6!', () => {
    let actual = Lexer.parse("5d6!").map(toLexicalToken);
    expect(actual).toEqual([
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "dice",
            value: "5d6"
        },
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "!",
            value: ""
        }
    ]);
});

test('Lexer should parse "5d6!3', () => {
    let actual = Lexer.parse("5d6!3").map(toLexicalToken);
    expect(actual).toEqual([
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "dice",
            value: "5d6"
        },
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "!",
            value: "3"
        }
    ]);
});

test('Lexer should parse "5d6!i', () => {
    let actual = Lexer.parse("5d6!i").map(toLexicalToken);
    expect(actual).toEqual([
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "dice",
            value: "5d6"
        },
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "!",
            value: "100"
        }
    ]);
});

test('Lexer should parse "5d6u', () => {
    let actual = Lexer.parse("5d6u").map(toLexicalToken);
    expect(actual).toEqual([
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "dice",
            value: "5d6"
        },
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "u",
            value: "u"
        }
    ]);
});

test('Lexer should parse "5d[3,7]', () => {
    let actual = Lexer.parse("5d[3,7]").map(toLexicalToken);
    expect(actual).toEqual([
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "dice",
            value: "5d[3,7]"
        }
    ]);
});

test('Lexer should parse "5d[7,3]', () => {
    let actual = Lexer.parse("5d[7,3]").map(toLexicalToken);
    expect(actual).toEqual([
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "dice",
            value: "5d[7,3]"
        }
    ]);
});

test('Lexer should parse "5d7r', () => {
    let actual = Lexer.parse("5d7r").map(toLexicalToken);
    expect(actual).toEqual([
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "dice",
            value: "5d7"
        },
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "r",
            value: ""
        }
    ]);
});

test('Lexer should parse "5d7r4', () => {
    let actual = Lexer.parse("5d7r4").map(toLexicalToken);
    expect(actual).toEqual([
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "dice",
            value: "5d7"
        },
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "r",
            value: "4"
        }
    ]);
});

test('Lexer should parse "5d7ri', () => {
    let actual = Lexer.parse("5d7ri").map(toLexicalToken);
    expect(actual).toEqual([
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "dice",
            value: "5d7"
        },
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "r",
            value: "100"
        }
    ]);
});

test('Lexer should parse "5d7s', () => {
    let actual = Lexer.parse("5d7s").map(toLexicalToken);
    expect(actual).toEqual([
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "dice",
            value: "5d7"
        },
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "sort",
            value: "sa"
        }
    ]);
});

test('Lexer should parse "5d7sa', () => {
    let actual = Lexer.parse("5d7sa").map(toLexicalToken);
    expect(actual).toEqual([
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "dice",
            value: "5d7"
        },
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "sort",
            value: "sa"
        }
    ]);
});

test('Lexer should parse "5d7sd', () => {
    let actual = Lexer.parse("5d7sd").map(toLexicalToken);
    expect(actual).toEqual([
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "dice",
            value: "5d7"
        },
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "sort",
            value: "sd"
        }
    ]);
});

test('Lexer should parse "6dF', () => {
    let actual = Lexer.parse("6dF").map(toLexicalToken);
    expect(actual).toEqual([
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "dice",
            value: "6dF"
        }
    ]);
});

// SPECIAL DICE ===============================================================

test('Lexer should parse "1dS', () => {
    let actual = Lexer.parse("1dS").map(toLexicalToken);
    expect(actual).toEqual([
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "stunt",
            value: "1dS"
        }
    ]);
});

test('Lexer should parse "5dS', () => {
    expect(() => Lexer.parse("5dS")).toThrow();
});

// BLOCKS =====================================================================

test('Lexer should parse "[[Note]]', () => {
    let actual = Lexer.parse("[[Note]]").map(toLexicalToken);
    expect(actual).toEqual([
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "section",
            value: "[[Note]]"
        }
    ]);
});

test('Lexer should parse "4d[[Note]]', () => {
    let actual = Lexer.parse("4d[[Note]]").map(toLexicalToken);
    expect(actual).toEqual([
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "section",
            value: "4d[[Note]]"
        }
    ]);
});

test('Lexer should parse "[[Note]]|line', () => {
    let actual = Lexer.parse("[[Note]]|line").map(toLexicalToken);
    expect(actual).toEqual([
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "line",
            value: "[[Note]]|line"
        }
    ]);
});

test('Lexer should parse "[[Note]]|heading-2', () => {
    let actual = Lexer.parse("[[Note]]|heading-2").map(toLexicalToken);
    expect(actual).toEqual([
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "section",
            value: "[[Note]]|heading-2"
        }
    ]);
});

test('Lexer should parse "[[Note^block-id]]', () => {
    let actual = Lexer.parse("[[Note^block-id]]").map(toLexicalToken);
    expect(actual).toEqual([
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "table",
            value: "[[Note^block-id]]"
        }
    ]);
});

test('Lexer should parse "1d4+1[[Note^block-id]]', () => {
    let actual = Lexer.parse("1d4+1[[Note^block-id]]").map(toLexicalToken);
    expect(actual).toEqual([
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "table",
            value: "1d4+1[[Note^block-id]]"
        }
    ]);
});

test('Lexer should parse "[[Note^block-id]]|Header 2', () => {
    let actual = Lexer.parse("[[Note^block-id]]|Header 2").map(toLexicalToken);
    expect(actual).toEqual([
        {
            conditions: undefined,
            parenedDice: undefined,
            type: "table",
            value: "[[Note^block-id]]|Header 2"
        }
    ]);
});

// FORMULAS ===================================================================

test('Lexer should parse "1d20 + -2" like "1d20 - 2"', () => {
    let a = Lexer.parse("1d20 + -2").map(toLexicalToken);
    let b = Lexer.parse("1d20 - 2").map(toLexicalToken);
    expect(a).toEqual(b);
});

test('Lexer should parse "1d20 - -2" like "1d20 + 2"', () => {
    let a = Lexer.parse("1d20 - -2").map(toLexicalToken);
    let b = Lexer.parse("1d20 + 2").map(toLexicalToken);
    expect(a).toEqual(b);
});

test('Lexer should parse "1d20 ----2" like "1d20 + 2"', () => {
    let a = Lexer.parse("1d20 ----2").map(toLexicalToken);
    let b = Lexer.parse("1d20 + 2").map(toLexicalToken);
    expect(a).toEqual(b);
});

test('Lexer should parse "1d20 -++---+-+--++17" like "1d20 - 17"', () => {
    let a = Lexer.parse("1d20 -++---+-+--++17").map(toLexicalToken);
    let b = Lexer.parse("1d20 - 17").map(toLexicalToken);
    expect(a).toEqual(b);
});
