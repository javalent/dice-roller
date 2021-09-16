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
import { TableRoller, FileRoller, SectionRoller, TagRoller, LinkRoller } from "./roller";
import SettingTab from "./settings/settings";
import { StackRoller } from "./roller/dice";
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
                        window.roller = roller;

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
    async reroll(
        evt: MouseEvent,
        container: HTMLElement,
        resultEl: HTMLElement,
        content: string,
        link: string,
        tableMap: TableRoller,
        fileMap: FileRoller,
        type: "dice" | "table" | "render" | "file"
    ) {
        resultEl.empty();
        /* if (type === "dice") { */
        /* let { result, text } = await this.parseDice(content);
            container.setAttrs({
                "aria-label": `${content}\n${text}`
            });
            resultEl.setText(
                result.toLocaleString(navigator.language, {
                    maximumFractionDigits: 2
                })
            ); */
        /* } else if (type === "render") {
            resultEl.empty();
            resultEl.createSpan({ text: `${content} => ` });
            resultEl.addClass("internal-embed");
            for (let [file, elements] of Array.from(renderMap)) {
                const holder = resultEl.createDiv({
                    cls: "dice-section-result",
                    attr: {
                        "aria-label": file
                    }
                });
                if (renderMap.size > 1) {
                    holder.createEl("h5", {
                        cls: "dice-file-name",
                        text: file
                    });
                }

                for (let el of elements) {
                    el.roll();
                    el.element(holder.createDiv());
                }
            }
        } else if (type === "file") {
            fileMap.roll();
            resultEl.createSpan({ text: content });
            container.setAttrs({
                "aria-label": `${content}\n${fileMap.display}`
            });

            const link = await fileMap.element();
            link.onclick = async (evt) => {
                evt.stopPropagation();
                this.app.workspace.openLinkText(
                    fileMap.result.replace("^", "#^").split(/\|/).shift(),
                    this.app.workspace.getActiveFile()?.path,
                    true
                );
            };

            link.onmouseenter = async (evt) => {
                this.app.workspace.trigger(
                    "link-hover",
                    this, //not sure
                    link, //targetEl
                    fileMap.result, //linkText
                    this.app.workspace.getActiveFile()?.path //source
                );
            };

            resultEl.empty();
            resultEl.appendChild(link);
        } */
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
    /*
                } else if (d.type === "tag") {
                    type = "render";
                    if (!this.app.plugins.plugins.dataview) {
                        new Notice(
                            "Tags are only supported with the Dataview plugin installed."
                        );
                        return;
                    }
                    const [, roll = 1, tag, collapseTrigger, filter] =
                        d.data.match(TAG_REGEX);

                    const collapse =
                        collapseTrigger === "-"
                            ? true
                            : collapseTrigger === "+"
                            ? false
                            : !this.data.returnAllTags;

                    let types: string[];
                    if (filter && filter.length) {
                        types = filter.split(",");
                    }
                    const files =
                        this.app.plugins.plugins.dataview.index.tags.invMap.get(
                            tag
                        );
                    if (!files || !files.size) {
                        reject(
                            "No files found with that tag. Is the tag correct?\n\n" +
                                tag
                        );
                    }

                    if (
                        filter === "link" ||
                        (this.data.rollLinksForTags && !types?.length)
                    ) {
                        fileMap = new FileRoller(
                            1,
                            [...files],
                            this.app.metadataCache
                        );
                        fileMap.source = source;
                        type = "file";
                    } else {
                        const couldNotRead = [],
                            noCache = [];
                        for (let link of files) {
                            let file =
                                await this.app.metadataCache.getFirstLinkpathDest(
                                    link,
                                    ""
                                );
                            if (!file || !(file instanceof TFile))
                                couldNotRead.push(link);
                            const cache =
                                await this.app.metadataCache.getFileCache(file);
                            if (
                                !cache ||
                                !cache.sections ||
                                !cache.sections.length
                            )
                                noCache.push(link);

                            const content = await this.app.vault.read(file);
                            const data = cache.sections
                                .filter(({ type }) =>
                                    types
                                        ? types.includes(type)
                                        : !["yaml", "thematicBreak"].includes(
                                              type
                                          )
                                )
                                .map((cache) => {
                                    return {
                                        ...cache,
                                        file: file.basename
                                    };
                                });

                            if (collapse) {
                                let roller;
                                const rollers = renderMap.get("all");
                                if (rollers && rollers.length) {
                                    roller = rollers.shift();
                                    roller.options = [
                                        ...roller.options,
                                        ...data
                                    ];
                                    roller.content.set(file.basename, content);
                                } else {
                                    roller = new SectionRoller(
                                        Number(roll),
                                        data,
                                        new Map([[file.basename, content]]),
                                        "all",
                                        this.data.copyContentButton
                                    );
                                }
                                renderMap.set("all", [
                                    ...(renderMap.get("all") ?? []),
                                    roller
                                ]);
                            } else {
                                const roller = new SectionRoller(
                                    Number(roll),
                                    data,
                                    new Map([[file.basename, content]]),
                                    file.basename,
                                    this.data.copyContentButton
                                );
                                renderMap.set(file.basename, [
                                    ...(renderMap.get(file.basename) ?? []),
                                    roller
                                ]);
                            }
                        }
                    }
                    break;
                } else {
                    switch (d.type) {
                        case "+":
                        case "-":
                        case "*":
                        case "/":
                        case "^":
                        case "math":
                            const b = stack.pop(),
                                a = stack.pop(),
                                result = this.operators[d.data](
                                    a.result,
                                    b.result
                                );

                            stack.push(new DiceRoller(`${result}`));
                            break;
                        case "kh": {
                            let diceInstance = diceMap[diceMap.length - 1];
                            let data = d.data ? Number(d.data) : 1;

                            diceInstance.keepHigh(data);
                            diceInstance.modifiers.add(d.original);
                            break;
                        }
                        case "dl": {
                            let diceInstance = diceMap[diceMap.length - 1];
                            let data = d.data ? Number(d.data) : 1;

                            data = diceInstance.results.size - data;

                            diceInstance.keepHigh(data);
                            diceInstance.modifiers.add(d.original);
                            break;
                        }
                        case "kl": {
                            let diceInstance = diceMap[diceMap.length - 1];
                            let data = d.data ? Number(d.data) : 1;

                            diceInstance.keepLow(data);
                            diceInstance.modifiers.add(d.original);
                            break;
                        }
                        case "dh": {
                            let diceInstance = diceMap[diceMap.length - 1];
                            let data = d.data ? Number(d.data) : 1;

                            data = diceInstance.results.size - data;

                            diceInstance.keepLow(data);
                            diceInstance.modifiers.add(d.original);
                            break;
                        }
                        case "!": {
                            let diceInstance = diceMap[diceMap.length - 1];
                            let data = Number(d.data) || 1;

                            diceInstance.explode(data, d.conditionals);
                            diceInstance.modifiers.add(d.original);

                            break;
                        }
                        case "!!": {
                            let diceInstance = diceMap[diceMap.length - 1];
                            let data = Number(d.data) || 1;

                            diceInstance.explodeAndCombine(
                                data,
                                d.conditionals
                            );
                            diceInstance.modifiers.add(d.original);

                            break;
                        }
                        case "r": {
                            let diceInstance = diceMap[diceMap.length - 1];
                            let data = Number(d.data) || 1;

                            diceInstance.reroll(data, d.conditionals);
                            diceInstance.modifiers.add(d.original);
                            break;
                        }
                        case "dice":
                            ///const res = this.roll(d.data);
                            diceMap.push(new DiceRoller(d.data));
                            stack.push(diceMap[diceMap.length - 1]);
                            break;
                        case "stunt":
                            let stunt = new StuntRoller(d.original);
                            diceMap.push(stunt);

                            if (stunt.doubles) {
                                stunted = ` - ${
                                    stunt.results.get(0).value
                                } Stunt Points`;
                            }

                            stack.push(diceMap[diceMap.length - 1]);
                    }
                }
            }
            diceMap.forEach((diceInstance) => {
                text = text.replace(
                    `${diceInstance.dice}${Array.from(
                        diceInstance.modifiers
                    ).join("")}`,
                    diceInstance.display
                );
            });
            if (tableMap) {
                text = text.replace(
                    tableMap.text,
                    `${tableMap.link} > ${tableMap.block}`
                );
            }
            if (renderMap && renderMap.size) {
                text = `Results from ${renderMap.size} file${
                    renderMap.size != 1 ? "s" : ""
                }`;
            }

            if (fileMap) {
                text = fileMap.result;
            }

            resolve({
                result: stack.length ? `${stack[0].text}${stunted}` : null,
                text: text,
                link: `${tableMap?.link}#^${tableMap?.block}` ?? null,
                type,
                tableMap,
                renderMap,
                fileMap
            });
        });
    } */
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
