import {
    Plugin,
    MarkdownPostProcessorContext,
    Notice,
    addIcon,
    MarkdownView,
    TFile,
    WorkspaceLeaf
} from "obsidian";

import { getAPI, Link } from "obsidian-dataview";

import type { Plugins } from "../../obsidian-overload/index";

import { faDice } from "@fortawesome/free-solid-svg-icons";
import { faCopy } from "@fortawesome/free-regular-svg-icons";
import { icon } from "@fortawesome/fontawesome-svg-core";

import { around } from "monkey-around";
import { decode } from "he";

import { COPY_DEFINITION, ICON_DEFINITION } from "./utils/constants";
import {
    StackRoller,
    TableRoller,
    SectionRoller,
    TagRoller,
    LinkRoller,
    LineRoller
} from "./roller";

import SettingTab from "./settings/settings";

import { ArrayRoller, BasicRoller } from "./roller/roller";
import DiceView, { VIEW_TYPE } from "./view/view";
import DiceRenderer from "./view/renderer";
import Lexer, { LexicalToken } from "./parser/lexer";
import { Round, ExpectedValue } from "./types";
import { ListField } from "obsidian-dataview/lib/expression/field";
/* import GenesysView, { GENESYS_VIEW_TYPE } from "./view/genesys"; */

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

/** Functional return type for error handling. */
export declare class Success<T, E> {
    value: T;
    successful: true;
    constructor(value: T);
    map<U>(f: (a: T) => U): Result<U, E>;
    flatMap<U>(f: (a: T) => Result<U, E>): Result<U, E>;
    orElse(_value: T): T;
    orElseThrow(_message?: (e: E) => string): T;
}
/** Functional return type for error handling. */
export declare class Failure<T, E> {
    error: E;
    successful: false;
    constructor(error: E);
    map<U>(_f: (a: T) => U): Result<U, E>;
    flatMap<U>(_f: (a: T) => Result<U, E>): Result<U, E>;
    orElse(value: T): T;
    orElseThrow(message?: (e: E) => string): T;
}
export declare type Result<T, E> = Success<T, E> | Failure<T, E>;
/** Monadic 'Result' type which encapsulates whether a procedure succeeded or failed, as well as it's return value. */
export declare namespace Result {
    function success<T, E>(value: T): Result<T, E>;
    function failure<T, E>(error: E): Result<T, E>;
    function flatMap2<T1, T2, O, E>(
        first: Result<T1, E>,
        second: Result<T2, E>,
        f: (a: T1, b: T2) => Result<O, E>
    ): Result<O, E>;
    function map2<T1, T2, O, E>(
        first: Result<T1, E>,
        second: Result<T2, E>,
        f: (a: T1, b: T2) => O
    ): Result<O, E>;
}

declare module "obsidian-dataview" {
    interface DataviewAPI {
        query(source: string): Promise<Result<{ values: Link[] }, string>>;
    }
}

//expose dataview plugin for tags
declare module "obsidian" {
    interface App {
        plugins: {
            getPlugin<T extends keyof Plugins>(plugin: T): Plugins[T];
        };
    }
    interface Workspace {
        on(name: "dice-roller:update-colors", callback: () => void): EventRef;
        on(
            name: "dice-roller:render-dice",
            callback: (roll: string) => void
        ): EventRef;
        on(
            name: "dice-roller:rendered-result",
            callback: (result: number) => void
        ): EventRef;
    }
    interface MetadataCache {
        on(name: "dataview:api-ready", callback: () => void): EventRef;
        on(
            name: "dataview:metadata-change",
            callback: (type: "update", file: TFile) => void
        ): EventRef;
    }
}

declare global {
    interface Window {
        __THREE__: string;
    }
}
interface DiceRollerSettings {
    returnAllTags: boolean;
    rollLinksForTags: boolean;
    copyContentButton: boolean;
    displayResultsInline: boolean;
    displayLookupRoll: boolean;
    displayFormulaForMod: boolean;
    formulas: Record<string, string>;
    persistResults: boolean;

    showDice: boolean;
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
    renderAllDice: boolean;
    renderTime: number;
    diceColor: string;
    textColor: string;
    showLeafOnStartup: boolean;
    customFormulas: string[];

    round: keyof typeof Round;
}

export const DEFAULT_SETTINGS: DiceRollerSettings = {
    returnAllTags: true,
    rollLinksForTags: false,
    copyContentButton: true,
    customFormulas: [],
    displayFormulaForMod: true,
    displayResultsInline: false,
    displayLookupRoll: true,
    formulas: {},
    persistResults: false,
    results: {},
    defaultRoll: 1,
    defaultFace: 100,
    renderer: false,
    renderAllDice: false,
    renderTime: 2000,
    diceColor: "#202020",
    textColor: "#ffffff",
    showLeafOnStartup: true,
    showDice: true,
    round: Round.None
};

export default class DiceRollerPlugin extends Plugin {
    data: DiceRollerSettings;

    fileMap: Map<TFile, BasicRoller[]> = new Map();

    inline: Map<string, number> = new Map();

    operators: Record<string, (a: number, b: number) => number> = {
        "+": (a: number, b: number): number => a + b,
        "-": (a: number, b: number): number => a - b,
        "*": (a: number, b: number): number => a * b,
        "/": (a: number, b: number): number => a / b,
        "^": (a: number, b: number): number => {
            return Math.pow(a, b);
        }
    };
    parser = new Lexer(this);
    persistingFiles: Set<string> = new Set();
    renderer: DiceRenderer;

    async onload() {
        console.log("DiceRoller plugin loaded");
        this.data = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

        this.renderer = new DiceRenderer(this);

        this.addSettingTab(new SettingTab(this.app, this));

        console.log(this.dataviewAPI);

        this.registerView(
            VIEW_TYPE,
            (leaf: WorkspaceLeaf) => new DiceView(this, leaf)
        );
        /* this.registerView(
            GENESYS_VIEW_TYPE,
            (leaf: WorkspaceLeaf) => new GenesysView(this, leaf)
        ); */
        this.app.workspace.onLayoutReady(() => this.addDiceView(true));

        this.registerEvent(
            this.app.workspace.on("dice-roller:update-colors", () => {
                this.renderer.factory.updateColors();
            })
        );

        this.registerEvent(
            this.app.workspace.on("dice-roller:render-dice", async (roll) => {
                const roller = await this.getRoller(roll, "external");

                if (!(roller instanceof StackRoller)) {
                    new Notice("The Dice View only supports dice rolls.");
                    return;
                }
                await roller.roll();
                if (!roller.dice.length) {
                    new Notice("Invalid formula.");
                    return;
                }
                try {
                    this.renderRoll(roller);
                } catch (e) {
                    new Notice("There was an error rendering the roll.");
                    console.error(e);
                }

                this.app.workspace.trigger(
                    "dice-roller:rendered-result",
                    roller.result
                );
            })
        );

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
        /* this.addCommand({
            id: "open-view",
            name: "Open Genesys Dice View",
            checkCallback: (checking) => {
                if (!this.genesysView) {
                    if (!checking) {
                        this.addGenesysDiceView();
                    }
                    return true;
                }
            }
        }); */

        this.addCommand({
            id: "reroll",
            name: "Re-roll Dice",
            checkCallback: (checking) => {
                const view =
                    this.app.workspace.getActiveViewOfType(MarkdownView);
                if (
                    view &&
                    view.getMode() === "preview" &&
                    this.fileMap.has(view.file)
                ) {
                    if (!checking) {
                        const dice = this.fileMap.get(view.file);

                        dice.forEach((roller) => {
                            roller.roll();
                        });
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

                if (!file || !(file instanceof TFile)) return;

                const toPersist: Record<number, BasicRoller> = {};

                let fileContent: string[];
                let replacementFound: boolean = false;
                const modPromises: Promise<void>[] = [];
                for (let index = 0; index < nodeList.length; index++) {
                    const node = nodeList.item(index);

                    if (
                        /^dice\-mod:\s*([\s\S]+)\s*?/.test(node.innerText) &&
                        info
                    ) {
                        try {
                            if (!replacementFound) {
                                fileContent = (
                                    await this.app.vault.cachedRead(file)
                                ).split("\n");
                                replacementFound = true;
                            }

                            let [full, content] = node.innerText.match(
                                /^dice\-mod:\s*([\s\S]+)\s*?/
                            );
                            let showFormula = this.data.displayFormulaForMod;
                            if (content.includes("|noform")) {
                                showFormula = false;
                            }
                            if (content.includes("|form")) {
                                showFormula = true;
                            }

                            content = content
                                .replace("|noform", "")
                                .replace("|form", "");

                            //build result map;
                            const roller = await this.getRoller(
                                content,
                                ctx.sourcePath
                            );

                            modPromises.push(
                                new Promise((resolve, reject) => {
                                    roller.on("new-result", async () => {
                                        let splitContent = fileContent.slice(
                                            info.lineStart,
                                            info.lineEnd + 1
                                        );
                                        const replacer = roller.replacer;
                                        if (!replacer) {
                                            new Notice(
                                                "Dice Roller: There was an issue modifying the file."
                                            );
                                            return;
                                        }
                                        const rep = showFormula
                                            ? `${roller.inlineText} **${replacer}**`
                                            : `${replacer}`;

                                        splitContent = splitContent
                                            .join("\n")
                                            .replace(`\`${full}\``, rep)
                                            .split("\n");

                                        fileContent.splice(
                                            info.lineStart,
                                            info.lineEnd - info.lineStart + 1,
                                            ...splitContent
                                        );
                                        resolve();
                                    });
                                })
                            );

                            await roller.roll();

                            continue;
                        } catch (e) {
                            console.error(e);
                        }
                    }
                    if (
                        !/^dice(?:\+|\-|\-mod)?:\s*([\s\S]+)\s*?/.test(
                            node.innerText
                        )
                    )
                        continue;
                    try {
                        let [, content] = node.innerText.match(
                            /^dice(?:\+|\-|\-mod)?:\s*([\s\S]+)\s*?/
                        );

                        //build result map;
                        const roller = await this.getRoller(
                            content,
                            ctx.sourcePath
                        );
                        const savedResult =
                            this.data.results?.[path]?.[lineStart]?.[index] ??
                            null;
                        if (
                            (this.data.persistResults &&
                                !/dice\-/.test(node.innerText)) ||
                            /dice\+/.test(node.innerText)
                        ) {
                            this.persistingFiles.add(ctx.sourcePath);
                            toPersist[index] = roller;
                            roller.save = true;
                        }

                        let shouldRender = this.data.renderAllDice;
                        if (content.includes("|render")) {
                            shouldRender = true;
                        }
                        if (content.includes("|norender")) {
                            shouldRender = false;
                        }
                        const load = async () => {
                            await roller.roll();

                            if (roller.save && savedResult) {
                                await roller.applyResult(savedResult);
                            }
                            if (roller instanceof StackRoller) {
                                roller.shouldRender = shouldRender;
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

                        if (!this.fileMap.has(file)) {
                            this.fileMap.set(file, []);
                        }
                        this.fileMap.set(file, [
                            ...this.fileMap.get(file),
                            roller
                        ]);

                        const view =
                            this.app.workspace.getActiveViewOfType(
                                MarkdownView
                            );
                        if (
                            view &&
                            this.fileMap.has(file) &&
                            this.fileMap.get(file).length === 1
                        ) {
                            const self = this;

                            let unregisterOnUnloadFile = around(view, {
                                onUnloadFile: function (next) {
                                    return async function (unloaded: TFile) {
                                        if (unloaded == file) {
                                            self.fileMap.delete(file);
                                            unregisterOnUnloadFile();
                                        }

                                        return await next.call(this, unloaded);
                                    };
                                }
                            });
                            view.register(unregisterOnUnloadFile);
                            view.register(() => this.fileMap.delete(file));
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

                if (replacementFound && modPromises.length) {
                    await Promise.all(modPromises);
                    await this.app.vault.modify(file, fileContent.join("\n"));
                }

                if (path in this.data.results) {
                    this.data.results[path][lineStart] = {};
                }

                //this needs to be asynchronous
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

        this.app.workspace.onLayoutReady(async () => {
            await this.registerDataviewInlineFields();
        });
    }

    get canUseDataview() {
        return this.app.plugins.getPlugin("dataview") != null;
    }
    get dataview() {
        return this.app.plugins.getPlugin("dataview");
    }
    get dataviewAPI() {
        return getAPI();
    }
    async dataviewReady() {
        return new Promise((resolve) => {
            if (!this.canUseDataview) resolve(false);
            if (this.dataview.api) {
                resolve(true);
            }
            this.registerEvent(
                this.app.metadataCache.on("dataview:api-ready", () => {
                    resolve(true);
                })
            );
        });
    }

    get view() {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
        const leaf = leaves.length ? leaves[0] : null;
        if (leaf && leaf.view && leaf.view instanceof DiceView)
            return leaf.view;
    }
    /* get genesysView() {
        const leaves = this.app.workspace.getLeavesOfType(GENESYS_VIEW_TYPE);
        const leaf = leaves.length ? leaves[0] : null;
        if (leaf && leaf.view && leaf.view instanceof GenesysView)
            return leaf.view;
    } */

    async getArrayRoller(options: any[], rolls = 1) {
        const roller = new ArrayRoller(this, options, rolls);

        await roller.roll();
        return roller;
    }

    async addDiceView(startup = false) {
        if (startup && !this.data.showLeafOnStartup) return;
        if (this.app.workspace.getLeavesOfType(VIEW_TYPE).length) {
            return;
        }
        await this.app.workspace.getRightLeaf(false).setViewState({
            type: VIEW_TYPE
        });
        /* this.app.workspace.revealLeaf(this.view.leaf); */
    }
    /* async addGenesysDiceView(startup = false) {
        if (startup && !this.data.showLeafOnStartup) return;
        if (this.app.workspace.getLeavesOfType(GENESYS_VIEW_TYPE).length) {
            return;
        }
        await this.app.workspace.getRightLeaf(false).setViewState({
            type: GENESYS_VIEW_TYPE
        });
    } */

    async registerDataviewInlineFields() {
        if (!this.canUseDataview) return;

        await this.dataviewReady();

        const pages = this.dataview.index.pages;

        pages.forEach(({ fields }) => {
            for (const [key, value] of fields) {
                if (
                    typeof value !== "number" ||
                    Number.isNaN(value) ||
                    value == undefined
                )
                    continue;
                this.inline.set(key, value);
            }
        });

        this.registerEvent(
            this.app.metadataCache.on(
                "dataview:metadata-change",
                (type, file) => {
                    if (type === "update") {
                        const page = this.dataview.api.page(file.path);

                        if (!page) return;

                        for (let key in page) {
                            let value = page[key];
                            if (
                                typeof value !== "number" ||
                                Number.isNaN(value) ||
                                value == undefined
                            )
                                continue;
                            this.inline.set(key, value);
                        }
                    }
                }
            )
        );
    }

    async renderRoll(roller: StackRoller) {
        if (!(roller instanceof StackRoller) || !roller?.dice?.length) {
            new Notice(`This dice roll can't be rendered: ${roller.original}`);
            return;
        }
        this.addChild(this.renderer);
        this.renderer.setDice(roller);

        await this.renderer.start();

        roller.recalculate();
    }
    public async parseDice(content: string, source: string) {
        const roller = await this.getRoller(content, source);
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
    get dataview_regex(): RegExp {
        const fields = Array.from(this.inline.keys());

        if (!fields.length) return null;

        return new RegExp(`(${fields.join("|")})`, "g");
    }
    async getRoller(
        content: string,
        source: string = "",
        icon = this.data.showDice
    ): Promise<BasicRoller> {
        content = content.replace(/\\\|/g, "|");

        let showDice = content.includes("|nodice") ? false : icon;
        let showFormula = this.data.displayResultsInline;
        let expectedValue: ExpectedValue = ExpectedValue.Roll;
        let fixedText: string = "";
        const regextext = /\|text\((.*)\)/;

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
            let [, text] = content.match(regextext) ?? [null, ""];
            fixedText = text;
        }
        content = decode(
            //remove flags...
            content
                .replace("|nodice", "")
                .replace("|render", "")
                .replace("|norender", "")
                .replace("|noform", "")
                .replace("|form", "")
                .replace("|avg", "")
                .replace("|none", "")
                .replace(regextext, "")
        );

        if (content in this.data.formulas) {
            content = this.data.formulas[content];
        }

        const lexemes = this.parse(content);

        const type = this.getTypeFromLexemes(lexemes);

        switch (type) {
            case "dice": {
                const roller = new StackRoller(
                    this,
                    content,
                    lexemes,
                    showDice,
                    fixedText,
                    expectedValue
                );
                roller.showFormula = showFormula;
                return roller;
            }
            case "table": {
                const roller = new TableRoller(
                    this,
                    content,
                    lexemes[0],
                    source,
                    showDice
                );
                await roller.init;
                return roller;
            }
            case "section": {
                return new SectionRoller(
                    this,
                    content,
                    lexemes[0],
                    source,
                    showDice
                );
            }
            case "tag": {
                if (!this.canUseDataview) {
                    throw new Error(
                        "Tags are only supported with the Dataview plugin installed."
                    );
                }
                return new TagRoller(
                    this,
                    content,
                    lexemes[0],
                    source,
                    showDice
                );
            }
            case "link": {
                return new LinkRoller(
                    this,
                    content,
                    lexemes[0],
                    source,
                    showDice
                );
            }
            case "line": {
                return new LineRoller(
                    this,
                    content,
                    lexemes[0],
                    source,
                    showDice
                );
            }
        }
    }

    getRollerSync(
        content: string,
        source: string,
        icon = this.data.showDice
    ): BasicRoller {
        content = content.replace(/\\\|/g, "|");

        let showDice = content.includes("|nodice") ? false : icon;
        let shouldRender = this.data.renderAllDice;
        let showFormula = false; //this.data.displayResultsInline;
        let expectedValue: ExpectedValue = ExpectedValue.Roll;
        let fixedText: string = "";
        const regextext = /\|text\((.*)\)/;

        /* if (content.includes("|render")) {
            shouldRender = true;
        }
        if (content.includes("|norender")) {
            shouldRender = false;
        } */
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
            let [, text] = content.match(regextext) ?? [null, ""];
            fixedText = text;
        }
        content = decode(
            //remove flags...
            content
                .replace("|nodice", "")
                .replace("|render", "")
                .replace("|norender", "")
                .replace("|noform", "")
                .replace("|form", "")
                .replace("|avg", "")
                .replace("|none", "")
                .replace(regextext, "")
        );

        if (content in this.data.formulas) {
            content = this.data.formulas[content];
        }

        const lexemes = this.parse(content);

        const type = this.getTypeFromLexemes(lexemes);

        switch (type) {
            case "dice": {
                const roller = new StackRoller(
                    this,
                    content,
                    lexemes,
                    showDice,
                    fixedText,
                    expectedValue
                );
                roller.shouldRender = shouldRender;
                roller.showFormula = showFormula;
                return roller;
            }
            case "table": {
                const roller = new TableRoller(
                    this,
                    content,
                    lexemes[0],
                    source,
                    showDice
                );
                roller.init;
                return roller;
            }
            case "section": {
                return new SectionRoller(
                    this,
                    content,
                    lexemes[0],
                    source,
                    showDice
                );
            }
            case "tag": {
                if (!this.canUseDataview) {
                    throw new Error(
                        "Tags are only supported with the Dataview plugin installed."
                    );
                }
                return new TagRoller(
                    this,
                    content,
                    lexemes[0],
                    source,
                    showDice
                );
            }
            case "link": {
                return new LinkRoller(
                    this,
                    content,
                    lexemes[0],
                    source,
                    showDice
                );
            }
            case "line": {
                return new LineRoller(
                    this,
                    content,
                    lexemes[0],
                    source,
                    showDice
                );
            }
        }
    }

    getTypeFromLexemes(lexemes: LexicalToken[]) {
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

    onunload() {
        console.log("DiceRoller unloaded");
        this.app.workspace
            .getLeavesOfType(VIEW_TYPE)
            .forEach((leaf) => leaf.detach());

        if ("__THREE__" in window) {
            delete window.__THREE__;
        }
        this.renderer.unload();
        this.app.workspace.trigger("dice-roller:unload");
    }
    parse(input: string): LexicalToken[] {
        return this.parser.parse(input);
    }
}
