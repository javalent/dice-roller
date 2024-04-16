import {
    ButtonComponent,
    ExtraButtonComponent,
    ItemView,
    Notice,
    TextAreaComponent,
    WorkspaceLeaf
} from "obsidian";
import DiceRollerPlugin from "src/main";
import { StackRoller } from "src/roller";
import { ExpectedValue, type RollerOptions } from "../types";
import API from "../api/api";
import { type DiceIcon, IconManager } from "./view.icons";
import { Icons } from "src/utils/icons";

export const VIEW_TYPE = "DICE_ROLLER_VIEW";

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
    }
    async onOpen() {
        //build ui
        this.display();
    }

    async display() {
        this.contentEl.empty();
        this.gridEl = this.contentEl.createDiv("dice-roller-grid");
        this.formulaEl = this.contentEl.createDiv("dice-roller-formula");

        const resultsEl = this.contentEl.createDiv(
            "dice-roller-results-container"
        );
        const headerEl = resultsEl.createDiv("dice-roller-results-header");
        headerEl.createEl("h4", { text: "Results" });
        new ExtraButtonComponent(headerEl.createDiv("clear-all"))
            .setIcon(Icons.DELETE)
            .setTooltip("Clear All")
            .onClick(() => {
                this.resultEl.empty();
                this.resultEl.append(this.noResultsEl);
            });
        this.resultEl = resultsEl.createDiv("dice-roller-results");
        this.noResultsEl = this.resultEl.createSpan({
            text: "No results yet! Roll some dice to get started :)"
        });

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
                    let amount = this.#formula.get(icon);
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

        new ExtraButtonComponent(advDis).setIcon(Icons.PLUS).onClick(() => {
            this.#add += 1;
            this.setFormula();
        });

        if (this.customFormulas.length) {
            const customs = this.gridEl.createDiv(
                "dice-roller-results-container"
            );
            const headerEl = customs.createDiv("dice-roller-results-header");
            headerEl.createEl("h4", { text: "Saved Formulas" });

            for (let formula of this.customFormulas) {
                const containerEl = customs.createDiv(
                    "dice-custom-formula-container"
                );
                const formulaEl = containerEl.createDiv("dice-custom-formula");
                new ExtraButtonComponent(formulaEl)
                    .setIcon(Icons.DICE)
                    .setTooltip("Roll")
                    .onClick(() => this.roll(formula));
                formulaEl.createSpan({ text: formula });

                new ExtraButtonComponent(containerEl)
                    .setIcon(Icons.DELETE)
                    .setTooltip("Remove")
                    .onClick(() => {
                        this.plugin.data.customFormulas =
                            this.plugin.data.customFormulas.filter(
                                (f) => f != formula
                            );
                        this.plugin.saveSettings();
                        this.buildButtons();
                    });
            }
        }
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
            const roller = this.plugin.getRollerSync(icon.formula, "view");
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
        const opts: RollerOptions = { ...API.RollerOptions(this.plugin) };
        if (opts.expectedValue == ExpectedValue.None) {
            opts.expectedValue = ExpectedValue.Roll;
        }
        try {
            const roller = await this.plugin
                .getRoller(formula, "view", opts)
                .catch((e) => {
                    throw e;
                });
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
            this.addResult(roller);
        } catch (e) {
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
        this.formulaComponent = new TextAreaComponent(
            this.formulaEl
        ).setPlaceholder("Dice Formula");

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
    addResult(roller: StackRoller) {
        if (this.noResultsEl) {
            this.noResultsEl.detach();
        }
        const result = createDiv("view-result");

        result.createSpan({
            text: roller.original
        });
        result
            .createEl("strong", {
                attr: {
                    "aria-label": roller.resultText
                }
            })
            .appendChild(roller.containerEl.cloneNode(true));

        const context = result.createDiv("result-context");

        context.createEl("em", { text: new Date().toLocaleString() });
        new ExtraButtonComponent(context).setIcon(Icons.DELETE).onClick(() => {
            result.detach();
            if (this.resultEl.children.length === 0) {
                this.resultEl.prepend(this.noResultsEl);
            }
        });

        const copy = new ExtraButtonComponent(context)
            .setIcon(Icons.COPY)
            .setTooltip("Copy Result")
            .onClick(async () => {
                await navigator.clipboard.writeText(`${roller.result}`);
            });
        copy.extraSettingsEl.addClass("dice-content-copy");

        const reroll = new ExtraButtonComponent(context)
            .setIcon(Icons.DICE)
            .setTooltip("Roll Again")
            .onClick(() => this.roll(roller.original));
        reroll.extraSettingsEl.addClass("dice-result-reroll");

        this.resultEl.prepend(result);
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
