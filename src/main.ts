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
import DiceProcessor from "./processor/processor";

export default class DiceRollerPlugin extends Plugin {
    api = API;

    data: DiceRollerSettings;
    renderer: DiceRenderer;
    processor: DiceProcessor;

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

        Lexer.setDefaults(this.data.defaultFace, this.data.defaultRoll);

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

        this.processor = new DiceProcessor();
        this.processor.initialize(this);

        this.registerMarkdownPostProcessor((el, ctx) =>
            this.processor.postprocessor(el, ctx)
        );
        this.registerEditorExtension([inlinePlugin(this)]);

        this.app.workspace.onLayoutReady(async () => {
            this.addDiceView(true);
        });

        this.app.workspace.trigger("dice-roller:loaded");
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
