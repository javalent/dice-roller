import {
    Plugin,
    MarkdownPostProcessorContext,
    Notice,
    addIcon,
    MarkdownView,
    TFile,
    WorkspaceLeaf
} from "obsidian";
//@ts-ignore
import lexer from "lex";

import { faDice } from "@fortawesome/free-solid-svg-icons";
import { faCopy } from "@fortawesome/free-regular-svg-icons";
import { icon } from "@fortawesome/fontawesome-svg-core";

import "./assets/main.css";
import { Parser } from "./parser/parser";
import { Conditional, Lexeme } from "src/types";

import { around } from "monkey-around";

import {
    CONDITIONAL_REGEX,
    COPY_DEFINITION,
    DICE_REGEX,
    ICON_DEFINITION,
    MATH_REGEX,
    OMITTED_REGEX,
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

import { BasicRoller } from "./roller/roller";
import DiceView, { VIEW_TYPE } from "./view/view";

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
    persistResults: boolean;
    results: {
        [path: string]: {
            [line: string]: {
                [index: string]: Record<string, any>;
            };
        };
    };
    defaultRoll: number;
    defaultFace: number;
    renderer: boolean;
}

const DEFAULT_SETTINGS: DiceRollerSettings = {
    returnAllTags: true,
    rollLinksForTags: false,
    copyContentButton: true,
    displayResultsInline: false,
    formulas: {},
    persistResults: false,
    results: {},
    defaultRoll: 1,
    defaultFace: 100,
    renderer: false
};

export default class DiceRollerPlugin extends Plugin {
    lexer: lexer;
    parser: Parser;
    data: DiceRollerSettings;
    persistingFiles: Set<string> = new Set();
    get view() {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
        const leaf = leaves.length ? leaves[0] : null;
        if (leaf && leaf.view && leaf.view instanceof DiceView)
            return leaf.view;
    }
    async addDiceView() {
        if (this.app.workspace.getLeavesOfType(VIEW_TYPE).length) {
            return;
        }
        await this.app.workspace.getRightLeaf(false).setViewState({
            type: VIEW_TYPE
        });
        this.app.workspace.revealLeaf(this.view.leaf);
    }

    async onload() {
        console.log("DiceRoller plugin loaded");

        this.data = Object.assign(DEFAULT_SETTINGS, await this.loadData());

        this.addSettingTab(new SettingTab(this.app, this));

        this.registerView(
            VIEW_TYPE,
            (leaf: WorkspaceLeaf) => new DiceView(this, leaf)
        );
        this.app.workspace.onLayoutReady(() => this.addDiceView());

        this.addCommand({
            id: "open-view",
            name: "Open Dice View",
            checkCallback: (checking) => {
                if (!this.view) {
                    if (!checking) {
                        this.addDiceView();
                    }
                    return true;
                }
            }
        });

        const ICON_SVG = icon(faDice).html[0];

        addIcon(ICON_DEFINITION, ICON_SVG);

        const COPY_SVG = icon(faCopy).html[0];

        addIcon(COPY_DEFINITION, COPY_SVG);

        this.registerMarkdownPostProcessor(
            async (el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
                let nodeList = el.querySelectorAll("code");
                if (!nodeList.length) return;

                const path = ctx.sourcePath;
                const info = ctx.getSectionInfo(el);
                const lineStart = ctx.getSectionInfo(el)?.lineStart;
                const file = this.app.vault.getAbstractFileByPath(
                    ctx.sourcePath
                );
                if (!file || !(file instanceof TFile) || !info) return;

                const toPersist: Record<number, BasicRoller> = {};

                for (let index = 0; index < nodeList.length; index++) {
                    const node = nodeList.item(index);

                    if (/^dice\-mod:\s*([\s\S]+)\s*?/.test(node.innerText)) {
                        try {
                            let [full, content] = node.innerText.match(
                                /^dice\-mod:\s*([\s\S]+)\s*?/
                            );
                            if (!DICE_REGEX.test(content)) {
                                new Notice(
                                    "Replacing note content may only be done with Dice Rolls."
                                );
                                continue;
                            }
                            //build result map;
                            const roller = this.getRoller(
                                content,
                                ctx.sourcePath
                            );

                            await roller.roll();

                            const fileContent = (
                                await this.app.vault.cachedRead(file)
                            ).split("\n");
                            let splitContent = fileContent.slice(
                                info.lineStart,
                                info.lineEnd + 1
                            );

                            splitContent = splitContent
                                .join("\n")
                                .replace(
                                    `\`${full}\``,
                                    `${roller.inlineText} **${roller.result}**`
                                )
                                .split("\n");

                            fileContent.splice(
                                info.lineStart,
                                info.lineEnd - info.lineStart + 1,
                                ...splitContent
                            );

                            await this.app.vault.modify(
                                file,
                                fileContent.join("\n")
                            );
                        } catch (e) {
                            console.error(e);
                        }
                    }
                    if (
                        !/^dice(?:\+|\-)?:\s*([\s\S]+)\s*?/.test(node.innerText)
                    )
                        continue;
                    try {
                        let [, content] = node.innerText.match(
                            /^dice(?:\+|\-)?:\s*([\s\S]+)\s*?/
                        );

                        //build result map;
                        const roller = this.getRoller(content, ctx.sourcePath);

                        const load = async () => {
                            await roller.roll();

                            if (
                                (this.data.persistResults &&
                                    !/dice\-/.test(node.innerText)) ||
                                /dice\+/.test(node.innerText)
                            ) {
                                this.persistingFiles.add(ctx.sourcePath);
                                toPersist[index] = roller;

                                const result =
                                    this.data.results?.[path]?.[lineStart]?.[
                                        index
                                    ] ?? null;
                                if (result) {
                                    await roller.applyResult(result);
                                }
                            }

                            node.replaceWith(roller.containerEl);
                        };

                        if (roller.loaded) {
                            await load();
                        } else {
                            roller.on("loaded", async () => {
                                await load();
                            });
                        }
                    } catch (e) {
                        console.error(e);
                        new Notice(
                            `There was an error parsing the dice string: ${node.innerText}.\n\n${e}`,
                            5000
                        );
                        continue;
                    }
                }

                if (path in this.data.results) {
                    this.data.results[path][lineStart] = {};
                }

                if (Object.entries(toPersist).length) {
                    const view =
                        this.app.workspace.getActiveViewOfType(MarkdownView);
                    if (view) {
                        const self = this;
                        let unregisterOnUnloadFile = around(view, {
                            onUnloadFile: function (next) {
                                return async function (unloaded: TFile) {
                                    if ((unloaded = file)) {
                                        if (self.persistingFiles.has(path)) {
                                            self.persistingFiles.delete(path);
                                            self.data.results[path] = {};
                                        }

                                        for (let index in toPersist) {
                                            const roller = toPersist[index];
                                            const newLineStart =
                                                ctx.getSectionInfo(
                                                    el
                                                )?.lineStart;

                                            if (newLineStart == null) continue;

                                            const result = {
                                                [newLineStart]: {
                                                    ...(self.data.results[
                                                        path
                                                    ]?.[newLineStart] ?? {}),
                                                    [index]: roller.toResult()
                                                }
                                            };

                                            self.data.results[path] = {
                                                ...(self.data.results[path] ??
                                                    {}),
                                                ...result
                                            };

                                            await self.saveSettings();
                                        }
                                    }
                                    unregisterOnUnloadFile();
                                    return await next.call(this, unloaded);
                                };
                            }
                        });
                        view.register(unregisterOnUnloadFile);
                        view.register(async () => {
                            if (this.persistingFiles.has(path)) {
                                this.persistingFiles.delete(path);
                                this.data.results[path] = {};
                            }
                            for (let index in toPersist) {
                                const roller = toPersist[index];
                                const newLineStart =
                                    ctx.getSectionInfo(el)?.lineStart;

                                if (newLineStart == null) continue;

                                const result = {
                                    [newLineStart]: {
                                        ...(this.data.results[path]?.[
                                            newLineStart
                                        ] ?? {}),
                                        [index]: roller.toResult()
                                    }
                                };

                                this.data.results[path] = {
                                    ...(this.data.results[path] ?? {}),
                                    ...result
                                };

                                await this.saveSettings();
                            }
                        });
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
    public async parseDice(content: string, source: string) {
        const roller = this.getRoller(content, source);
        return { result: await roller.roll(), roller };
    }
    clearEmpties(o: Record<any, any>) {
        for (var k in o) {
            if (!o[k] || typeof o[k] !== "object") {
                continue;
            }

            this.clearEmpties(o[k]);
            if (Object.keys(o[k]).length === 0) {
                delete o[k];
            }
        }
    }

    async saveSettings() {
        this.clearEmpties(this.data.results);

        await this.saveData(this.data);
    }

    getRoller(content: string, source: string): BasicRoller {
        if (content in this.data.formulas) {
            content = this.data.formulas[content];
        }
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

        this.lexer.addRule(DICE_REGEX, function (lexeme: string): Lexeme {
            const { dice, conditional } = lexeme.match(DICE_REGEX).groups;
            let conditionals: Conditional[] = [];
            if (conditional) {
                let matches = conditional.matchAll(CONDITIONAL_REGEX);
                if (matches) {
                    for (let match of matches) {
                        if (!match) continue;
                        const { comparer, operator } = match.groups;
                        conditionals.push({
                            comparer: Number(comparer),
                            operator
                        });
                    }
                }
            }

            return {
                type: "dice",
                data: dice,
                original: lexeme,
                conditionals
            }; // symbols
        });

        this.lexer.addRule(OMITTED_REGEX, (lexeme: string): Lexeme => {
            const {
                roll = this.data.defaultRoll,
                faces = this.data.defaultFace,
                conditional
            } = lexeme.match(OMITTED_REGEX).groups;

            let conditionals: Conditional[] = [];
            if (conditional) {
                let matches = conditional.matchAll(CONDITIONAL_REGEX);
                if (matches) {
                    for (let match of matches) {
                        if (!match) continue;
                        const { comparer, operator } = match.groups;
                        conditionals.push({
                            comparer: Number(comparer),
                            operator
                        });
                    }
                }
            }

            return {
                type: "dice",
                data: `${roll}d${faces}`,
                original: lexeme,
                conditionals
            }; // symbols
        });

        this.lexer.addRule(MATH_REGEX, function (lexeme: string): Lexeme {
            return {
                type: "math",
                data: lexeme,
                original: lexeme,
                conditionals: null
            };
        });
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
        this.app.workspace
            .getLeavesOfType(VIEW_TYPE)
            .forEach((leaf) => leaf.detach());

        if ("__THREE__" in window) {
            delete window.__THREE__;
        }
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
declare global {
    interface Window {
        __THREE__: string;
    }
}
