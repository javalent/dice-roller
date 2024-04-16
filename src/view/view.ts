import {
    addIcon,
    ButtonComponent,
    ExtraButtonComponent,
    ItemView,
    Notice,
    TextAreaComponent,
    WorkspaceLeaf
} from "obsidian";
import DiceRollerPlugin from "src/main";
import { StackRoller } from "src/roller";
import { COPY_DEFINITION, ICON_DEFINITION } from "src/utils/constants";
import { ExpectedValue, type RollerOptions } from "../types";
import API from "../api/api";
import { type DiceIcon, IconManager } from "./view.icons";

export const VIEW_TYPE = "DICE_ROLLER_VIEW";

addIcon(
    "dice-roller-save",
    `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" data-prefix="far" data-icon="save" class="svg-inline--fa fa-save fa-w-14" role="img" viewBox="0 0 448 512"><path fill="currentColor" d="M433.941 129.941l-83.882-83.882A48 48 0 0 0 316.118 32H48C21.49 32 0 53.49 0 80v352c0 26.51 21.49 48 48 48h352c26.51 0 48-21.49 48-48V163.882a48 48 0 0 0-14.059-33.941zM272 80v80H144V80h128zm122 352H54a6 6 0 0 1-6-6V86a6 6 0 0 1 6-6h42v104c0 13.255 10.745 24 24 24h176c13.255 0 24-10.745 24-24V83.882l78.243 78.243a6 6 0 0 1 1.757 4.243V426a6 6 0 0 1-6 6zM224 232c-48.523 0-88 39.477-88 88s39.477 88 88 88 88-39.477 88-88-39.477-88-88-88zm0 128c-22.056 0-40-17.944-40-40s17.944-40 40-40 40 17.944 40 40-17.944 40-40 40z"/></svg>`
);

addIcon(
    "dice-roller-plus",
    `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" data-prefix="far" data-icon="plus-square" class="svg-inline--fa fa-plus-square fa-w-14" role="img" viewBox="0 0 448 512"><path fill="currentColor" d="M352 240v32c0 6.6-5.4 12-12 12h-88v88c0 6.6-5.4 12-12 12h-32c-6.6 0-12-5.4-12-12v-88h-88c-6.6 0-12-5.4-12-12v-32c0-6.6 5.4-12 12-12h88v-88c0-6.6 5.4-12 12-12h32c6.6 0 12 5.4 12 12v88h88c6.6 0 12 5.4 12 12zm96-160v352c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V80c0-26.5 21.5-48 48-48h352c26.5 0 48 21.5 48 48zm-48 346V86c0-3.3-2.7-6-6-6H54c-3.3 0-6 2.7-6 6v340c0 3.3 2.7 6 6 6h340c3.3 0 6-2.7 6-6z"/></svg>`
);
addIcon(
    "dice-roller-minus",
    `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" data-prefix="far" data-icon="minus-square" class="svg-inline--fa fa-minus-square fa-w-14" role="img" viewBox="0 0 448 512"><path fill="currentColor" d="M108 284c-6.6 0-12-5.4-12-12v-32c0-6.6 5.4-12 12-12h232c6.6 0 12 5.4 12 12v32c0 6.6-5.4 12-12 12H108zM448 80v352c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V80c0-26.5 21.5-48 48-48h352c26.5 0 48 21.5 48 48zm-48 346V86c0-3.3-2.7-6-6-6H54c-3.3 0-6 2.7-6 6v340c0 3.3 2.7 6 6 6h340c3.3 0 6-2.7 6-6z"/></svg>`
);

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
            .setIcon("trash")
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

        new ExtraButtonComponent(advDis)
            .setIcon("dice-roller-minus")
            .onClick(() => {
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

        new ExtraButtonComponent(advDis)
            .setIcon("dice-roller-plus")
            .onClick(() => {
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
                    .setIcon(ICON_DEFINITION)
                    .setTooltip("Roll")
                    .onClick(() => this.roll(formula));
                formulaEl.createSpan({ text: formula });

                new ExtraButtonComponent(containerEl)
                    .setIcon("trash")
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
            .setIcon("plus-with-circle")
            .setTooltip("Save Formula")
            .onClick(() => this.save());
        this.saveButton.extraSettingsEl.addClass("dice-roller-roll");

        this.rollButton = new ButtonComponent(buttons)
            .setIcon(ICON_DEFINITION)
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
        new ExtraButtonComponent(context).setIcon("trash").onClick(() => {
            result.detach();
            if (this.resultEl.children.length === 0) {
                this.resultEl.prepend(this.noResultsEl);
            }
        });

        const copy = new ExtraButtonComponent(context)
            .setIcon(COPY_DEFINITION)
            .setTooltip("Copy Result")
            .onClick(async () => {
                await navigator.clipboard.writeText(`${roller.result}`);
            });
        copy.extraSettingsEl.addClass("dice-content-copy");

        const reroll = new ExtraButtonComponent(context)
            .setIcon(ICON_DEFINITION)
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
        return ICON_DEFINITION;
    }
    async onClose() {
        await super.onClose();
    }
}
