import {
    type MarkdownPostProcessorContext,
    Plugin,
    Notice,
    MarkdownView,
    TFile,
    WorkspaceLeaf,
    editorLivePreviewField
} from "obsidian";

import { around } from "monkey-around";

import { StackRoller } from "./roller";

import SettingTab from "./settings/settings";

import { ArrayRoller, BasicRoller } from "./roller/roller";
import DiceView, { VIEW_TYPE } from "./view/view";
import DiceRenderer, { type RendererData } from "./renderer/renderer";
import { Lexer } from "./lexer/lexer";
import { type RollerOptions } from "./types";
import { inlinePlugin } from "./live-preview";
import { API } from "./api/api";
import { isTemplateFolder } from "./utils/util";
import type { DiceRollerSettings } from "./settings/settings.types";
import { DEFAULT_SETTINGS } from "./settings/settings.const";
import { DataviewManager } from "./api/api.dataview";

export default class DiceRollerPlugin extends Plugin {
    api = API;

    data: DiceRollerSettings;

    fileMap: Map<TFile, BasicRoller[]> = new Map();

    inline: Map<string, number> = new Map();

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
        this.api.initialize(this);
        this.addChild(DataviewManager.initialize(this.app));

        Lexer.setDefaultFace(this.data.defaultFace);
        Lexer.setDefaultRoll(this.data.defaultRoll);

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
                        /* roller.on("new-result", () => {
                            if (this.data.addToView)
                                this.view?.addResult(roller);
                        }); */
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
                        /* roller.on("new-result", () => {
                            if (this.data.addToView)
                                this.view?.addResult(roller);
                        }); */
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
        const roller = new ArrayRoller(this.data, options, rolls);

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

    async renderRoll(roller: StackRoller) {
        await roller.roll(true);
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

    async getRoller(
        raw: string,
        source: string = "",
        options?: RollerOptions
    ): Promise<BasicRoller> {
        return this.api.getRoller(raw, source, options);
    }

    getRollerSync(
        raw: string,
        source: string,
        options?: RollerOptions
    ): BasicRoller {
        return this.api.getRollerSync(raw, source, options);
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
        this.app.workspace.trigger("dice-roller:unloaded");
    }
}
