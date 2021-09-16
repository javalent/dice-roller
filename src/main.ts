import {
    Plugin,
    MarkdownPostProcessorContext,
    Notice,
    addIcon
} from "obsidian";
//@ts-ignore
import lexer from "lex";

import { faDice } from "@fortawesome/free-solid-svg-icons";
import { faCopy } from "@fortawesome/free-regular-svg-icons";
import { icon } from "@fortawesome/fontawesome-svg-core";

import "./assets/main.css";
import { Parser } from "./parser/parser";
import { Conditional, Lexeme } from "src/types";

import {
    COPY_DEFINITION,
    ICON_DEFINITION,
    MATH_REGEX,
    SECTION_REGEX,
    TABLE_REGEX,
    TAG_REGEX
} from "./utils/constants";
import {
    StackRoller,
    TableRoller,
    SectionRoller,
    TagRoller,
    LinkRoller
} from "./roller";
import SettingTab from "./settings/settings";

import type { BasicRoller } from "./roller/roller";

String.prototype.matchAll =
    String.prototype.matchAll ||
    function* matchAll(regexp: RegExp): IterableIterator<RegExpMatchArray> {
        const flags = regexp.global ? regexp.flags : regexp.flags + "g";
        const re = new RegExp(regexp, flags);
        let match;
        while ((match = re.exec(this))) {
            yield match;
        }
    };
//expose dataview plugin for tags
declare module "obsidian" {
    interface App {
        plugins: {
            plugins: {
                dataview: {
                    index: {
                        tags: {
                            invMap: Map<string, Set<string>>;
                            map: Map<string, Set<string>>;
                        };
                        etags: {
                            invMap: Map<string, Set<string>>;
                            map: Map<string, Set<string>>;
                        };
                    };
                };
            };
        };
    }
}

interface DiceRollerSettings {
    returnAllTags: boolean;
    rollLinksForTags: boolean;
    copyContentButton: boolean;
    displayResultsInline: boolean;
    formulas: Record<string, string>;
}

const DEFAULT_SETTINGS: DiceRollerSettings = {
    returnAllTags: true,
    rollLinksForTags: false,
    copyContentButton: true,
    displayResultsInline: false,
    formulas: {}
};

export default class DiceRollerPlugin extends Plugin {
    lexer: lexer;
    parser: Parser;
    data: DiceRollerSettings;
    async onload() {
        console.log("DiceRoller plugin loaded");

        this.data = Object.assign(DEFAULT_SETTINGS, await this.loadData());

        this.addSettingTab(new SettingTab(this.app, this));

        const ICON_SVG = icon(faDice).html[0];

        addIcon(ICON_DEFINITION, ICON_SVG);

        const COPY_SVG = icon(faCopy).html[0];

        addIcon(COPY_DEFINITION, COPY_SVG);

        this.registerMarkdownPostProcessor(
            async (el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
                let nodeList = el.querySelectorAll("code");
                if (!nodeList.length) return;

                for (const node of Array.from(nodeList)) {
                    if (!/^dice\+?:\s*([\s\S]+)\s*?/.test(node.innerText))
                        continue;
                    try {
                        let [, content] = node.innerText.match(
                            /^dice\+?:\s*([\s\S]+)\s*?/
                        );
                        if (content in this.data.formulas) {
                            content = this.data.formulas[content];
                        }

                        const roller = this.getRoller(content, ctx.sourcePath);

                        node.replaceWith(roller.containerEl);
                    } catch (e) {
                        console.error(e);
                        new Notice(
                            `There was an error parsing the dice string: ${node.innerText}.\n\n${e}`,
                            5000
                        );
                        continue;
                    }
                }
            }
        );

        this.lexer = new lexer();

        this.addLexerRules();

        var exponent = {
            precedence: 3,
            associativity: "right"
        };

        var factor = {
            precedence: 2,
            associativity: "left"
        };

        var term = {
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
    getRoller(content: string, source: string): BasicRoller {
        const lexemes = this.parse(content);

        const type = this.getTypeFromLexemes(lexemes);

        switch (type) {
            case "dice": {
                return new StackRoller(this, content, lexemes);
            }
            case "table": {
                return new TableRoller(this, content, lexemes[0], source);
            }
            case "section": {
                return new SectionRoller(this, content, lexemes[0], source);
            }
            case "tag": {
                if (!this.app.plugins.plugins.dataview) {
                    throw new Error(
                        "Tags are only supported with the Dataview plugin installed."
                    );
                }
                return new TagRoller(this, content, lexemes[0], source);
            }
            case "link": {
                return new LinkRoller(this, content, lexemes[0], source);
            }
        }
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
        return "dice";
    }

    addLexerRules() {
        this.lexer.addRule(/\s+/, function () {
            /* skip whitespace */
        });
        this.lexer.addRule(/[{}]+/, function () {
            /* skip brackets */
        });
        this.lexer.addRule(MATH_REGEX, function (lexeme: string): Lexeme {
            return {
                type: "math",
                data: lexeme,
                original: lexeme,
                conditionals: null
            };
        });

        this.lexer.addRule(TABLE_REGEX, function (lexeme: string): Lexeme {
            return {
                type: "table",
                data: lexeme,
                original: lexeme,
                conditionals: null
            };
        });
        this.lexer.addRule(SECTION_REGEX, function (lexeme: string): Lexeme {
            return {
                type: "section",
                data: lexeme,
                original: lexeme,
                conditionals: null
            };
        });

        this.lexer.addRule(TAG_REGEX, (lexeme: string): Lexeme => {
            const { groups } = lexeme.match(TAG_REGEX);
            let type = "tag";
            if (
                groups.types === "link" ||
                (this.data.rollLinksForTags && !groups.types?.length)
            ) {
                type = "link";
            }

            return {
                type,
                data: lexeme,
                original: lexeme,
                conditionals: null
            };
        });

        this.lexer.addRule(
            /(-?\d+)([Dd]\[?(?:(-?\d+)\s?,)?\s?(-?\d+|%|F)\]?)?/,
            function (lexeme: string): Lexeme {
                let [, dice] = lexeme.match(
                        /(-?\d+(?:[Dd]?\[?(?:-?\d+\s?,)?\s?(?:-?\d+|%|F)\]?)?)/
                    ),
                    conditionals: Conditional[] = [];
                if (/(?:(!?=|=!|>=?|<=?)(\d+))+/.test(lexeme)) {
                    for (const [, operator, comparer] of lexeme.matchAll(
                        /(?:(!?=|=!|>=?|<=?)(\d+))/g
                    )) {
                        conditionals.push({
                            operator: operator,
                            comparer: Number(comparer)
                        });
                    }
                }
                return {
                    type: "dice",
                    data: dice,
                    original: lexeme,
                    conditionals: conditionals
                }; // symbols
            }
        );
        this.lexer.addRule(/1[Dd]S/, function (lexeme: string): Lexeme {
            const [, dice] = lexeme.match(/1[Dd]S/) ?? [, "1"];
            return {
                type: "stunt",
                data: dice,
                original: lexeme,
                conditionals: []
            }; // symbols
        });

        this.lexer.addRule(/kh?(?!:l)(\d*)/, function (lexeme: string): Lexeme {
            /** keep high */
            return {
                type: "kh",
                data: lexeme.replace(/^\D+/g, ""),
                original: lexeme,
                conditionals: null
            };
        });
        this.lexer.addRule(/dl?(?!:h)\d*/, function (lexeme: string): Lexeme {
            /** drop low */
            return {
                type: "dl",
                data: lexeme.replace(/^\D+/g, ""),
                original: lexeme,
                conditionals: null
            };
        });

        this.lexer.addRule(/kl\d*/, function (lexeme: string): Lexeme {
            /** keep low */
            return {
                type: "kl",
                data: lexeme.replace(/^\D+/g, ""),
                original: lexeme,
                conditionals: null
            };
        });
        this.lexer.addRule(/dh\d*/, function (lexeme: string): Lexeme {
            /** drop high */
            return {
                type: "dh",
                data: lexeme.replace(/^\D+/g, ""),
                original: lexeme,
                conditionals: null
            };
        });
        this.lexer.addRule(
            /!!(i|\d+)?(?:(!?=|=!|>=?|<=?)(-?\d+))*/,
            function (lexeme: string): Lexeme {
                /** explode and combine */
                let [, data = `1`] = lexeme.match(
                        /!!(i|\d+)?(?:(!?=|=!|>=?|<=?)(-?\d+))*/
                    ),
                    conditionals: Conditional[] = [];
                if (/(?:(!?=|=!|>=?|<=?)(-?\d+))+/.test(lexeme)) {
                    for (const [, operator, comparer] of lexeme.matchAll(
                        /(?:(!?=|=!|>=?|<=?)(-?\d+))/g
                    )) {
                        conditionals.push({
                            operator: operator,
                            comparer: Number(comparer)
                        });
                    }
                }
                if (/!!i/.test(lexeme)) {
                    data = `100`;
                }

                return {
                    type: "!!",
                    data: data,
                    original: lexeme,
                    conditionals: conditionals
                };
            }
        );
        this.lexer.addRule(
            /!(i|\d+)?(?:(!?=|=!?|>=?|<=?)(-?\d+))*/,
            function (lexeme: string): Lexeme {
                /** explode */
                let [, data = `1`] = lexeme.match(
                        /!(i|\d+)?(?:(!?=|=!?|>=?|<=?)(-?\d+))*/
                    ),
                    conditionals: Conditional[] = [];
                if (/(?:(!?=|=!|>=?|<=?)(\d+))+/.test(lexeme)) {
                    for (const [, operator, comparer] of lexeme.matchAll(
                        /(?:(!?=|=!?|>=?|<=?)(-?\d+))/g
                    )) {
                        conditionals.push({
                            operator: operator,
                            comparer: Number(comparer)
                        });
                    }
                }
                if (/!i/.test(lexeme)) {
                    data = `100`;
                }

                return {
                    type: "!",
                    data: data,
                    original: lexeme,
                    conditionals: conditionals
                };
            }
        );

        this.lexer.addRule(
            /r(i|\d+)?(?:(!?=|=!|>=?|<=?)(-?\d+))*/,
            function (lexeme: string): Lexeme {
                /** reroll */
                let [, data = `1`] = lexeme.match(
                        /r(i|\d+)?(?:(!?=|=!|>=?|<=?)(-?\d+))*/
                    ),
                    conditionals: Conditional[] = [];
                if (/(?:(!?={1,2}|>=?|<=?)(-?\d+))+/.test(lexeme)) {
                    for (const [, operator, comparer] of lexeme.matchAll(
                        /(?:(!?=|=!|>=?|<=?)(-?\d+))/g
                    )) {
                        conditionals.push({
                            operator: operator,
                            comparer: Number(comparer)
                        });
                    }
                }
                if (/ri/.test(lexeme)) {
                    data = `100`;
                }
                return {
                    type: "r",
                    data: data,
                    original: lexeme,
                    conditionals: conditionals
                };
            }
        );
    }

    onunload() {
        console.log("DiceRoller unloaded");
    }

    operators: any = {
        "+": (a: number, b: number): number => a + b,
        "-": (a: number, b: number): number => a - b,
        "*": (a: number, b: number): number => a * b,
        "/": (a: number, b: number): number => a / b,
        "^": (a: number, b: number): number => {
            return Math.pow(a, b);
        }
    };

    parse(input: string): Lexeme[] {
        this.lexer.setInput(input);
        var tokens = [],
            token;
        while ((token = this.tryLex())) tokens.push(token);
        return this.parser.parse(tokens);
    }
    tryLex() {
        try {
            return this.lexer.lex();
        } catch (e) {}
    }
}
