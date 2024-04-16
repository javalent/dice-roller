import {
    type MarkdownPostProcessorContext,
    Plugin,
    Notice,
    MarkdownView,
    TFile,
    WorkspaceLeaf,
    editorLivePreviewField
} from "obsidian";

import { getAPI } from "obsidian-dataview";

import { around } from "monkey-around";
import { decode } from "he";

import {
    StackRoller,
    TableRoller,
    SectionRoller,
    TagRoller,
    LineRoller,
    DataViewRoller
} from "./roller";

import SettingTab from "./settings/settings";

import { ArrayRoller, BasicRoller } from "./roller/roller";
import DiceView, { VIEW_TYPE } from "./view/view";
import DiceRenderer, { type RendererData } from "./renderer/renderer";
import Lexer, { type LexicalToken } from "./parser/lexer";
import { Round, ExpectedValue, type RollerOptions } from "./types";
import { inlinePlugin } from "./live-preview";
import API from "./api/api";
import { isTemplateFolder } from "./utils/util";
import type { DiceRollerSettings } from "./settings/settings.types";
import { DEFAULT_SETTINGS } from "./settings/settings.const";

export default class DiceRollerPlugin extends Plugin {
    api = new API(this);

    data: DiceRollerSettings;

    fileMap: Map<TFile, BasicRoller[]> = new Map();

    inline: Map<string, number> = new Map();

    parser: Lexer;
    persistingFiles: Set<string> = new Set();
    renderer: DiceRenderer;

    getRendererData(): RendererData {
        return {
            diceColor: this.data.diceColor,
            textColor: this.data.textColor,
            colorfulDice: this.data.colorfulDice,
            scaler: this.data.scaler,
            renderTime: this.data.renderTime,
            textFont: this.data.textFont
        };
    }
    async onload() {
        console.log("DiceRoller plugin loaded");
        this.data = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

        this.renderer = new DiceRenderer(this.getRendererData());
        this.parser = new Lexer(this.data.defaultRoll, this.data.defaultFace);

        this.addSettingTab(new SettingTab(this.app, this));

        this.registerView(
            VIEW_TYPE,
            (leaf: WorkspaceLeaf) => new DiceView(this, leaf)
        );
        /* this.registerView(
            GENESYS_VIEW_TYPE,
            (leaf: WorkspaceLeaf) => new GenesysView(this, leaf)
        ); */

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
            callback: () => {
                if (!this.view) {
                    this.addDiceView();
                } else {
                    this.app.workspace.revealLeaf(this.view.leaf);
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
                    (view.getMode() === "preview" ||
                        //@ts-ignore
                        view.editor.cm.state.field(editorLivePreviewField)) &&
                    this.fileMap.has(view.file)
                ) {
                    if (!checking) {
                        const dice = this.fileMap.get(view.file);

                        dice.forEach((roller) => {
                            if (roller instanceof BasicRoller) {
                                roller.roll();
                            }
                        });
                    }
                    return true;
                }
            }
        });

        this.registerMarkdownPostProcessor(this.postprocessor.bind(this));
        this.registerEditorExtension([inlinePlugin(this)]);

        this.app.workspace.onLayoutReady(async () => {
            this.addDiceView(true);
            await this.registerDataviewInlineFields();
            /* this.addChild(this.renderer); */
        });

        this.app.workspace.trigger("dice-roller:loaded");
    }

    addToFileMap(file: TFile, roller: BasicRoller) {
        if (!this.fileMap.has(file)) {
            this.fileMap.set(file, []);
        }
        this.fileMap.set(file, [...this.fileMap.get(file), roller]);
    }

    async postprocessor(el: HTMLElement, ctx: MarkdownPostProcessorContext) {
        let nodeList = el.querySelectorAll("code");

        if (!nodeList.length) return;

        const path = ctx.sourcePath;
        const info = ctx.getSectionInfo(el);
        const lineStart = ctx.getSectionInfo(el)?.lineStart;
        const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);

        if ((!file || !(file instanceof TFile)) && path != "STATBLOCK_RENDERER")
            return;

        const toPersist: Record<number, BasicRoller> = {};

        let fileContent: string[];
        let replacementFound: boolean = false;
        const modPromises: Promise<void>[] = [];
        for (let index = 0; index < nodeList.length; index++) {
            const node = nodeList.item(index);

            if (
                file &&
                file instanceof TFile &&
                /^dice\-mod:\s*([\s\S]+)\s*?/.test(node.innerText) &&
                info
            ) {
                if (isTemplateFolder(this.data.diceModTemplateFolders, file))
                    continue;
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
                    if (roller instanceof StackRoller) {
                        if (roller.shouldRender) roller.hasRunOnce = true;
                        roller.on("new-result", () => {
                            if (this.data.addToView)
                                this.view?.addResult(roller);
                        });
                    }

                    modPromises.push(
                        new Promise((resolve, reject) => {
                            roller.on("new-result", async () => {
                                let splitContent = fileContent.slice(
                                    info.lineStart,
                                    info.lineEnd + 1
                                );
                                const replacer = await roller.getReplacer();
                                if (!replacer) {
                                    new Notice(
                                        "Dice Roller: There was an issue modifying the file."
                                    );
                                    return;
                                }
                                const rep = showFormula
                                    ? `${roller.inlineText} ${replacer}`
                                    : `${replacer}`;

                                if (this.data.escapeDiceMod) {
                                    splitContent = splitContent
                                        .join("\n")
                                        .replace(
                                            `\`${full}\``,
                                            rep.replace(/([\*\[\]])/g, "\\$1")
                                        )
                                        .split("\n");
                                } else {
                                    splitContent = splitContent
                                        .join("\n")
                                        .replace(`\`${full}\``, rep)
                                        .split("\n");
                                }

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
            if (!/^dice(?:\+|\-|\-mod)?:\s*([\s\S]+)\s*?/.test(node.innerText))
                continue;
            try {
                let [, content] = node.innerText.match(
                    /^dice(?:\+|\-|\-mod)?:\s*([\s\S]+)\s*?/
                );

                //build result map;
                const roller = await this.getRoller(content, ctx.sourcePath);
                const savedResult =
                    this.data.results?.[path]?.[lineStart]?.[index] ?? null;
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
                        roller.on("new-result", () => {
                            if (this.data.addToView)
                                this.view?.addResult(roller);
                        });
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
                if (!file || !(file instanceof TFile)) continue;
                this.addToFileMap(file, roller);

                const view =
                    this.app.workspace.getActiveViewOfType(MarkdownView);
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
        if (!file || !(file instanceof TFile)) return;
        if (replacementFound && modPromises.length) {
            await Promise.all(modPromises);
            sleep(500);
            await this.app.vault.modify(file, fileContent.join("\n"));
        }

        if (path in this.data.results) {
            this.data.results[path][lineStart] = {};
        }

        //this needs to be asynchronous
        if (Object.entries(toPersist).length) {
            const view = this.app.workspace.getActiveViewOfType(MarkdownView);
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
                                        ctx.getSectionInfo(el)?.lineStart;

                                    if (newLineStart == null) continue;

                                    const result = {
                                        [newLineStart]: {
                                            ...(self.data.results[path]?.[
                                                newLineStart
                                            ] ?? {}),
                                            [index]: roller.toResult()
                                        }
                                    };

                                    self.data.results[path] = {
                                        ...(self.data.results[path] ?? {}),
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
                        const newLineStart = ctx.getSectionInfo(el)?.lineStart;

                        if (newLineStart == null) continue;

                        const result = {
                            [newLineStart]: {
                                ...(this.data.results[path]?.[newLineStart] ??
                                    {}),
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

        this.parser.setInlineFields(this.inline);
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
                        this.parser.setInlineFields(this.inline);
                    }
                }
            )
        );
    }
    async renderRoll(roller: StackRoller) {
        await roller.roll(true);
    }
    public async parseDice(content: string, source: string) {
        const roller = await this.getRoller(content, source);
        return { result: await roller.roll(), roller };
    }
    public parseDiceSync(content: string, source: string) {
        const roller = this.getRollerSync(content, source);
        if (!(roller instanceof StackRoller)) return;
        return { result: roller.result, roller };
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

    async getRoller(
        raw: string,
        source: string = "",
        options: RollerOptions = API.RollerOptions(this)
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

        const lexemes = this.parse(content);

        const type = this.getTypeFromLexemes(lexemes);
        switch (type) {
            case "dice": {
                const roller = new StackRoller(
                    this,
                    content,
                    lexemes,
                    this.renderer,
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
            case "dataview": {
                if (!this.canUseDataview) {
                    throw new Error(
                        "Tags are only supported with the Dataview plugin installed."
                    );
                }
                return new DataViewRoller(
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
        raw: string,
        source: string,
        options: RollerOptions = API.RollerOptions(this)
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

        const lexemes = this.parse(content);

        const type = this.getTypeFromLexemes(lexemes);

        switch (type) {
            case "dice": {
                const roller = new StackRoller(
                    this,
                    content,
                    lexemes,
                    this.renderer,
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
            case "dataview": {
                if (!this.canUseDataview) {
                    throw new Error(
                        "Tags are only supported with the Dataview plugin installed."
                    );
                }
                return new DataViewRoller(
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
