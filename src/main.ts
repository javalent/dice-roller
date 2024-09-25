import { Plugin, Notice, WorkspaceLeaf } from "obsidian";

import { StackRoller } from "./roller";

import SettingTab from "./settings/settings";

import { BasicRoller } from "./roller/roller";
import DiceView, { VIEW_TYPE } from "./view/view";
import DiceRenderer, { type RendererData } from "./renderer/renderer";
import { Lexer } from "./lexer/lexer";
import { type RollerOptions } from "./api/api";
import { inlinePlugin } from "./processor/live-preview";
import { API } from "./api/api";
import {
    ButtonPosition,
    type DiceRollerSettings
} from "./settings/settings.types";
import { DEFAULT_SETTINGS } from "./settings/settings.const";
import { DataviewManager } from "./api/api.dataview";
import DiceProcessor from "./processor/processor";
import copy from "fast-copy";
import { compare } from "compare-versions";

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
        await this.loadSettings();

        this.renderer = new DiceRenderer(this.getRendererData());
        this.api.initialize(this.data, this.app, this.renderer);

        window["DiceRoller"] = this.api;
        this.register(() => delete window["DiceRoller"]);
        this.addChild(DataviewManager.initialize(this.app));

        Lexer.setDefaults(this.data.defaultRoll, this.data.defaultFace);

        this.addSettingTab(new SettingTab(this.app, this));

        this.registerView(
            VIEW_TYPE,
            (leaf: WorkspaceLeaf) => new DiceView(this, leaf)
        );

        this.registerEvent(
            this.app.workspace.on("dice-roller:render-dice", async (roll) => {
                const maybeRoller = await API.getRoller(roll, "external");
                if (maybeRoller.isNone()) {
                    return;
                }
                const roller = maybeRoller.unwrap();
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
                    await roller.roll(true);
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

    async addDiceView(startup = false) {
        if (startup && !this.data.showLeafOnStartup) return;
        if (this.app.workspace.getLeavesOfType(VIEW_TYPE).length) {
            return;
        }
        await this.app.workspace.getRightLeaf(false).setViewState({
            type: VIEW_TYPE
        });
    }

    async loadSettings() {
        const data = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        let dirty = false;

        if (typeof data.version !== "string") {
            delete data.version;
        }
        if (compare("11.2.0", data.version ?? "0.0.0", ">")) {
            data.position = data.showDice
                ? ButtonPosition.RIGHT
                : ButtonPosition.NONE;
            delete data["showDice"];

            dirty = true;
        }
        if (compare("11.0.0", data.version ?? "0.0.0", ">")) {
            delete data["persistResults"];
            delete data["results"];
            dirty = true;
        }
        if (compare(data.version ?? "0.0.0", this.manifest.version, "!=")) {
            data.version = this.manifest.version;
            dirty = true;
        }

        this.data = copy(data);

        if (dirty) {
            await this.saveSettings();
        }
    }
    async saveSettings() {
        await this.saveData(this.data);
    }

    /**
     * @deprecated
     */
    async getArrayRoller(options: any[], rolls = 1) {
        new Notice(
            "Using the Dice Roller plugin directly will be deprecated in a future version. Please use `window.DiceRoller` instead."
        );
        return this.api.getArrayRoller(options, rolls);
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
