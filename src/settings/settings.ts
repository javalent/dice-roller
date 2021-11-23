import {
    App,
    ButtonComponent,
    Notice,
    PluginSettingTab,
    Setting
} from "obsidian";
import type DiceRoller from "../main";

export default class SettingTab extends PluginSettingTab {
    additionalContainer: HTMLDivElement;

    constructor(app: App, public plugin: DiceRoller) {
        super(app, plugin);
        this.plugin = plugin;
    }
    async display(): Promise<void> {
        let { containerEl } = this;

        containerEl.empty();

        containerEl.addClass("dice-roller-settings");

        containerEl.createEl("h2", { text: "Dice Roller Settings" });

        new Setting(containerEl)
            .setName("Roll All Files for Tags")
            .setDesc("Return a result for each file when rolling tags.")
            .addToggle((t) => {
                t.setValue(this.plugin.data.returnAllTags);
                t.onChange(async (v) => {
                    this.plugin.data.returnAllTags = v;
                    await this.plugin.saveSettings();
                });
            });
        new Setting(containerEl)
            .setName("Always Return Links for Tags")
            .setDesc(
                "Enables random link rolling with the link parameter. Override by specifying a section type."
            )
            .addToggle((t) => {
                t.setValue(this.plugin.data.rollLinksForTags);
                t.onChange(async (v) => {
                    this.plugin.data.rollLinksForTags = v;
                    await this.plugin.saveSettings();
                });
            });
        new Setting(containerEl)
            .setName("Add Copy Button to Section Results")
            .setDesc(
                "Randomly rolled sections will have a copy-content button to easy add result to clipboard."
            )
            .addToggle((t) => {
                t.setValue(this.plugin.data.copyContentButton);
                t.onChange(async (v) => {
                    this.plugin.data.copyContentButton = v;
                    await this.plugin.saveSettings();
                });
            });
        new Setting(containerEl)
            .setName("Display Formula With Results")
            .setDesc(
                "Both the formula and the results will both be displayed in preview mode."
            )
            .addToggle((t) => {
                t.setValue(this.plugin.data.displayResultsInline);
                t.onChange(async (v) => {
                    this.plugin.data.displayResultsInline = v;
                    await this.plugin.saveSettings();
                });
            });
        new Setting(containerEl)
            .setName("Add Formula When Modifying")
            .setDesc(
                createFragment((e) => {
                    e.createSpan({
                        text: "Both the formula and the results will both be added to the node when using "
                    });
                    e.createEl("code", { text: "dice-mod" });
                    e.createSpan({ text: "." });
                })
            )
            .addToggle((t) => {
                t.setValue(this.plugin.data.displayFormulaForMod);
                t.onChange(async (v) => {
                    this.plugin.data.displayFormulaForMod = v;
                    await this.plugin.saveSettings();
                });
            });
        new Setting(containerEl)
            .setName("Display Lookup Table Roll")
            .setDesc(
                "Lookup table rolls will display the rolled number along with the result."
            )
            .addToggle((t) => {
                t.setValue(this.plugin.data.displayLookupRoll);
                t.onChange(async (v) => {
                    this.plugin.data.displayLookupRoll = v;
                    await this.plugin.saveSettings();
                });
            });
        new Setting(containerEl)
            .setName("Show Dice Button")
            .setDesc("A dice button will appear next to results.")
            .addToggle((t) => {
                t.setValue(this.plugin.data.showDice);
                t.onChange(async (v) => {
                    this.plugin.data.showDice = v;
                    await this.plugin.saveSettings();
                });
            });
        const save = new Setting(containerEl)
            .setName("Globally Save Results")
            .setDesc(
                "Dice results will be saved by default. This can be overridden using "
            )
            .addToggle((t) => {
                t.setValue(this.plugin.data.persistResults);
                t.onChange(async (v) => {
                    this.plugin.data.persistResults = v;
                    await this.plugin.saveSettings();
                });
            });
        new Setting(containerEl)
            .setName("Open Dice View on Startup")
            .setDesc(
                "The dice view can always be opened using the command from the command palette."
            )
            .addToggle((t) => {
                t.setValue(this.plugin.data.showLeafOnStartup);
                t.onChange(async (v) => {
                    this.plugin.data.showLeafOnStartup = v;
                    await this.plugin.saveSettings();
                });
            });
        new Setting(containerEl)
            .setName("Display graphics for Dice View Rolls")
            .setDesc("Dice rolls from dice view will be displayed on screen.")
            .addToggle((t) => {
                t.setValue(this.plugin.data.renderer);
                t.onChange(async (v) => {
                    this.plugin.data.renderer = v;
                    await this.plugin.saveSettings();
                });
            });
        const diceColor = new Setting(containerEl)
            .setName("Dice Base Color")
            .setDesc("Rendered dice will be this color.");
        diceColor.controlEl.createEl(
            "input",
            {
                type: "color",
                value: this.plugin.data.diceColor
            },
            (el) => {
                el.value = this.plugin.data.diceColor;
                el.onchange = async ({ target }) => {
                    let color = (target as HTMLInputElement).value;

                    this.plugin.data.diceColor = color;

                    await this.plugin.saveSettings();

                    this.plugin.app.workspace.trigger(
                        "dice-roller:update-colors"
                    );
                };
            }
        );

        const textColor = new Setting(containerEl)
            .setName("Dice Text Color")
            .setDesc("Rendered dice will use this color for their numbers.");
        textColor.controlEl.createEl(
            "input",
            {
                type: "color",
                value: this.plugin.data.textColor
            },
            (el) => {
                el.value = this.plugin.data.textColor;
                el.onchange = async ({ target }) => {
                    let color = (target as HTMLInputElement).value;

                    if (!color) return;
                    this.plugin.data.textColor = color;
                    await this.plugin.saveSettings();
                    this.plugin.app.workspace.trigger(
                        "dice-roller:update-colors"
                    );
                };
            }
        );

        new Setting(containerEl)
            .setName("Default Face")
            .setDesc("Use this as the number of faces when it is omitted.")
            .addText((t) => {
                t.setValue(`${this.plugin.data.defaultFace}`);
                t.inputEl.onblur = async () => {
                    if (isNaN(Number(t.inputEl.value))) {
                        new Notice("The default face must be a number.");
                    }

                    this.plugin.data.defaultFace = Number(t.inputEl.value);
                    await this.plugin.saveSettings();
                };
            });
        save.descEl.createEl("code", { text: `dice-: formula` });
        save.descEl.createEl("p", {
            text: "Please note that the plugin will attempt to save the result but may not be able to."
        });
        this.additionalContainer = containerEl.createDiv(
            "dice-roller-setting-additional-container"
        );

        this.buildFormulaSettings();

        const div = containerEl.createDiv("coffee");
        div.createEl("a", {
            href: "https://www.buymeacoffee.com/valentine195"
        }).createEl("img", {
            attr: {
                src: "https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=☕&slug=valentine195&button_colour=e3e7ef&font_colour=262626&font_family=Inter&outline_colour=262626&coffee_colour=ff0000"
            }
        });
    }
    buildFormulaSettings() {
        this.additionalContainer.empty();
        const addNew = this.additionalContainer.createDiv();
        new Setting(addNew)
            .setName("Add Formula")
            .setDesc("Add a new formula shortcut.")
            .addButton((button: ButtonComponent): ButtonComponent => {
                let b = button
                    .setTooltip("Add Formula")
                    .setButtonText("+")
                    .onClick(async () => {
                        const formula = await this.buildFormulaForm(addNew);

                        if (formula) {
                            this.plugin.data.formulas[formula.alias] =
                                formula.formula;
                            this.buildFormulaSettings();
                            await this.plugin.saveSettings();
                        }
                    });

                return b;
            });

        const additional = this.additionalContainer.createDiv("additional");

        const formulas = this.plugin.data.formulas;

        for (const [alias, formula] of Object.entries(formulas)) {
            const setting = new Setting(additional).setName(alias);
            setting.controlEl.createSpan({ text: formula });
            setting
                .addExtraButton((b) =>
                    b
                        .setIcon("pencil")
                        .setTooltip("Edit")
                        .onClick(async () => {
                            const edited = await this.buildFormulaForm(addNew, {
                                alias,
                                formula
                            });

                            if (edited) {
                                delete this.plugin.data.formulas[alias];
                                this.plugin.data.formulas[edited.alias] =
                                    edited.formula;
                                this.buildFormulaSettings();
                                await this.plugin.saveSettings();
                            }
                        })
                )
                .addExtraButton((b) =>
                    b
                        .setIcon("trash")
                        .setTooltip("Delete")
                        .onClick(async () => {
                            delete this.plugin.data.formulas[alias];
                            await this.plugin.saveSettings();
                            this.buildFormulaSettings();
                        })
                );
        }
        if (!Object.values(formulas).length) {
            additional.createSpan({
                text: "Create a formula to see it here!",
                cls: "no-formulas"
            });
        }
    }

    async buildFormulaForm(
        el: HTMLElement,
        temp: DiceFormula = {
            alias: null,
            formula: null
        }
    ): Promise<DiceFormula> {
        return new Promise((resolve) => {
            const formulaEl = el.createDiv("add-new-formula");
            const dataEl = formulaEl.createDiv("formula-data");

            new Setting(dataEl).setName("Alias").addText((t) => {
                t.setValue(temp.alias).onChange((v) => (temp.alias = v));
            });
            new Setting(dataEl).setName("Formula").addText((t) => {
                t.setValue(temp.formula).onChange((v) => (temp.formula = v));
            });

            const buttonEl = formulaEl.createDiv("formula-buttons");
            new Setting(buttonEl)
                .addButton((b) =>
                    b
                        .setCta()
                        .setButtonText("Save")
                        .onClick(async () => {
                            formulaEl.detach();
                            resolve(temp);
                        })
                )
                .addExtraButton((b) =>
                    b
                        .setIcon("cross")
                        .setTooltip("Cancel")
                        .onClick(() => {
                            formulaEl.detach();
                            resolve(null);
                        })
                );
        });
    }
}

interface DiceFormula {
    alias: string;
    formula: string;
}
