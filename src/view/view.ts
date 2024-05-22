import {
    ButtonComponent,
    ExtraButtonComponent,
    ItemView,
    Notice,
    TextAreaComponent,
    WorkspaceLeaf
} from "obsidian";
import type DiceRollerPlugin from "src/main";
import { StackRoller } from "src/roller";
import { ExpectedValue } from "../types/api";
import { API } from "../api/api";
import { type DiceIcon, IconManager } from "./view.icons";
import { Icons } from "src/utils/icons";
import { nanoid } from "nanoid";
import DiceTray from "./ui/DiceTray.svelte";

/* import { Details } from "@javalent/utilities"; */

export const VIEW_TYPE = "DICE_ROLLER_VIEW";

export interface ViewResult {
    original: string;
    resultText: string;
    result: string | number;
    timestamp: number;
    id: string;
}

export default class DiceView extends ItemView {
    noResultsEl: HTMLSpanElement;
    rollButton: ButtonComponent;
    saveButton: ExtraButtonComponent;
    stack: StackRoller;
    gridEl: HTMLDivElement;
    formulaEl: HTMLDivElement;
    get customFormulas() {
        return this.plugin.data.customFormulas;
    }
    custom = "";
    #adv = false;
    #dis = false;
    #add = 0;

    formulaComponent: TextAreaComponent;
    resultEl: HTMLDivElement;

    #icons = IconManager;
    constructor(public plugin: DiceRollerPlugin, public leaf: WorkspaceLeaf) {
        super(leaf);
        this.contentEl.addClass("dice-roller-view");

        this.addChild(this.#icons);

        for (const icon of this.plugin.data.icons) {
            this.#icons.registerIcon(icon.id, icon.shape, icon.text);
        }

        this.registerEvent(
            this.plugin.app.workspace.on(
                "dice-roller:new-result",
                async (roller: StackRoller) => {
                    console.log(
                        "🚀 ~ file: view.ts:63 ~ roller:",
                        roller.getSource()
                    );

                    if (
                        this.plugin.data.addToView ||
                        roller.getSource() == VIEW_TYPE
                    ) {
                        await this.addResult({
                            result: roller.result,
                            original: roller.original,
                            resultText: roller.resultText,
                            timestamp: new Date().valueOf(),
                            id: nanoid(12)
                        });
                    }
                }
            )
        );
    }
    async onOpen() {
        //build ui

        this.display();
    }

    async display() {
        this.contentEl.empty();

        this.gridEl = this.contentEl.createDiv("dice-roller-grid");
        this.formulaEl = this.contentEl.createDiv("dice-roller-formula");

        const headerEl = this.contentEl.createDiv("results-header-container");
        headerEl.createEl("h4", { cls: "results-header", text: "Results" });
        new ExtraButtonComponent(headerEl.createDiv("clear-all"))
            .setIcon(Icons.DELETE)
            .setTooltip("Clear All")
            .onClick(async () => {
                this.resultEl.empty();
                this.resultEl.append(this.noResultsEl);
                this.plugin.data.viewResults = [];
                await this.plugin.saveSettings();
            });
        const resultsEl = this.contentEl.createDiv(
            "dice-roller-results-container"
        );
        this.resultEl = resultsEl.createDiv("dice-roller-results");
        this.noResultsEl = this.resultEl.createSpan({
            text: "No results yet! Roll some dice to get started :)"
        });

        for (const result of this.plugin.data.viewResults) {
            this.addResult(result, false);
        }

        this.buildButtons();
        this.buildFormula();
    }
    #formula: Map<DiceIcon, number> = new Map();
    buildButtons() {
        this.gridEl.empty();

        const buttons = this.gridEl.createDiv("dice-buttons");
        for (const icon of this.plugin.data.icons) {
            this.#icons.registerIcon(icon.id, icon.shape, icon.text);
            new ExtraButtonComponent(buttons.createDiv("dice-button"))
                .setIcon(icon.id)
                .extraSettingsEl.onClickEvent((evt) => {
                    if (evt.type === "auxclick") {
                        this.roll(icon.formula);
                        return;
                    }
                    if (!this.#formula.has(icon)) {
                        this.#formula.set(icon, 0);
                    }
                    let amount = this.#formula.get(icon) ?? 0;
                    amount += evt.getModifierState("Shift") ? -1 : 1;
                    this.#formula.set(icon, amount);
                    this.setFormula();
                });
        }

        const advDis = this.gridEl.createDiv("advantage-disadvantage");

        new ExtraButtonComponent(advDis).setIcon(Icons.MINUS).onClick(() => {
            this.#add -= 1;
            this.setFormula();
        });
        const adv = new ButtonComponent(advDis)
            .setButtonText("ADV")
            .onClick(() => {
                this.#adv = !this.#adv;
                this.#dis = false;

                if (this.#adv) {
                    adv.setCta();
                    dis.removeCta();
                } else {
                    adv.removeCta();
                }
                this.setFormula();
            });
        if (this.#adv) {
            adv.setCta();
        }
        const dis = new ButtonComponent(advDis)
            .setButtonText("DIS")
            .onClick(() => {
                this.#dis = !this.#dis;
                this.#adv = false;

                if (this.#dis) {
                    dis.setCta();
                    adv.removeCta();
                } else {
                    dis.removeCta();
                }

                this.setFormula();
            });

        if (this.#dis) {
            dis.setCta();
        }
        new ExtraButtonComponent(advDis).setIcon(Icons.PLUS).onClick(() => {
            this.#add += 1;
            this.setFormula();
        });

        new DiceTray({
            target: this.gridEl,
            props: {
                settings: this.plugin.data,
                plugin: this.plugin,
                view: this
            }
        });
    }
    setFormula() {
        if (!this.#formula.size && !this.#add) {
            this.formulaComponent.inputEl.value = "";
            return;
        }
        const formula: { formula: string; max: number; sign: "+" | "-" }[] = [];
        for (const [icon, amount] of this.#formula) {
            if (!amount) continue;
            const sign = amount < 0 ? "-" : "+";
            const diceFormula = /^(?:1)?d(\d|%|F)+$/.test(icon.formula)
                ? `${Math.abs(amount)}${icon.formula.replace(/^1/, "")}`
                : `${Math.abs(amount)} * (${icon.formula})`;
            const roller = API.getRollerSync(icon.formula, VIEW_TYPE);
            if (!(roller instanceof StackRoller)) continue;
            roller.buildDiceTree();
            roller.calculate();
            formula.push({ formula: diceFormula, max: roller.max, sign });
        }
        formula.sort((a, b) => b.max - a.max);
        const str: string[] = [];
        for (let index = 0; index < formula.length; index++) {
            const instance = formula[index];
            if (index === 0 && instance.sign === "-") {
                instance.formula = `${instance.sign}${instance.formula}`;
            } else if (index > 0) {
                str.push(instance.sign);
            }
            let mod = "";
            if (index === 0) {
                if (this.#adv) {
                    mod = "kh";
                } else if (this.#dis) {
                    mod = "kl";
                }
                instance.formula = instance.formula.replace(
                    /(d\d+)/,
                    `$1${mod}`
                );
            }
            str.push(`${instance.formula}`);
        }
        if (this.#add !== 0) {
            if (str.length > 0) {
                str.push(this.#add > 0 ? "+" : "-");
            }
            str.push(`${Math.abs(this.#add)}`);
        }
        this.formulaComponent.inputEl.value = str.join(" ");
    }
    async roll(formula = this.formulaComponent.inputEl.value) {
        if (!formula) {
            return;
        }
        this.rollButton.setDisabled(true);
        const opts = {
            ...API.getRollerOptions(this.plugin.data)
        };
        if (opts.expectedValue == ExpectedValue.None) {
            opts.expectedValue = ExpectedValue.Roll;
        }
        try {
            const roller = await API.getRoller(formula, VIEW_TYPE, opts).catch(
                (e) => {
                    throw e;
                }
            );
            if (!(roller instanceof StackRoller)) {
                throw new Error("The Dice Tray only supports dice rolls.");
            }
            roller.iconEl.detach();
            roller.containerEl.onclick = null;
            roller.buildDiceTree();
            if (!roller.dice.length) {
                throw new Error("No dice.");
            }
            await roller.roll(this.plugin.data.renderer).catch((e) => {
                throw e;
            });
        } catch (e: any) {
            new Notice("Invalid Formula: " + e.message);
        } finally {
            this.rollButton.setDisabled(false);
            this.buildButtons();
            this.#formula = new Map();
            this.#add = 0;
            this.setFormula();
        }
    }
    buildFormula() {
        this.formulaEl.empty();
        this.formulaComponent = new TextAreaComponent(this.formulaEl)
            .setPlaceholder("Dice Formula")
            .onChange((v) => (this.#formula = new Map()));

        const buttons = this.formulaEl.createDiv("action-buttons");
        this.saveButton = new ExtraButtonComponent(buttons)
            .setIcon(Icons.SAVE)
            .setTooltip("Save Formula")
            .onClick(() => this.save());
        this.saveButton.extraSettingsEl.addClass("dice-roller-roll");

        this.rollButton = new ButtonComponent(buttons)
            .setIcon(Icons.DICE)
            .setCta()
            .setTooltip("Roll")
            .onClick(() => this.roll());
        this.rollButton.buttonEl.addClass("dice-roller-roll");
    }
    save() {
        if (!this.formulaComponent.inputEl.value) return;
        this.plugin.data.customFormulas.push(
            this.formulaComponent.inputEl.value
        );
        this.buildButtons();
        this.plugin.saveSettings();
    }

    Formatter = new Intl.DateTimeFormat(
        localStorage.getItem("language") ?? "en-US",
        {
            dateStyle: "medium",
            timeStyle: "short"
        }
    );

    private async addResult(result: ViewResult, save = true) {
        if (this.noResultsEl) {
            this.noResultsEl.detach();
        }
        const resultEl = createDiv("view-result");
        const topPaneEl = resultEl.createDiv("result-actions");
        const reroll = new ExtraButtonComponent(topPaneEl)
            .setIcon(Icons.DICE)
            .setTooltip("Roll Again")
            .onClick(() => this.roll(result.original));
        reroll.extraSettingsEl.addClass("dice-result-reroll");
        topPaneEl.createSpan({
            text: result.original
        });

        const copy = new ExtraButtonComponent(topPaneEl)
            .setIcon(Icons.COPY)
            .setTooltip("Copy Result")
            .onClick(async () => {
                await navigator.clipboard.writeText(`${result.result}`);
            });
        copy.extraSettingsEl.addClass("dice-content-copy");
        resultEl.createEl("strong", {
            attr: {
                "aria-label": result.resultText
            },
            text: `${result.result}`
        });
        /* .appendChild(roller.containerEl.cloneNode(true)) */

        const context = resultEl.createDiv("result-context");

        context.createEl("em", {
            cls: "result-timestamp",
            text: this.Formatter.format(result.timestamp)
        });
        new ExtraButtonComponent(context)
            .setIcon(Icons.DELETE)
            .onClick(async () => {
                resultEl.detach();
                if (this.resultEl.children.length === 0) {
                    this.resultEl.prepend(this.noResultsEl);
                }

                this.plugin.data.viewResults.splice(
                    this.plugin.data.viewResults.findIndex(
                        (r) => r.id === result.id
                    ),
                    1
                );
                await this.plugin.saveSettings();
            });

        this.resultEl.prepend(resultEl);
        if (save) {
            console.log("🚀 ~ file: view.ts:372 ~ save:", save);

            this.plugin.data.viewResults.push(result);
            this.plugin.data.viewResults = this.plugin.data.viewResults.slice(
                0,
                100
            );
            await this.plugin.saveSettings();
        }
    }

    getDisplayText() {
        return "Dice Tray";
    }
    getViewType() {
        return VIEW_TYPE;
    }
    getIcon() {
        return Icons.DICE;
    }
    async onClose() {
        await super.onClose();
    }
}
