import {
    App,
    ButtonComponent,
    Notice,
    PluginSettingTab,
    setIcon,
    Setting,
    TextComponent
} from "obsidian";
import { Round } from "src/types";
import { ICON_DEFINITION } from "src/utils/constants";
import type DiceRoller from "../main";
import { DEFAULT_SETTINGS } from "../main";

export default class SettingTab extends PluginSettingTab {
    constructor(app: App, public plugin: DiceRoller) {
        super(app, plugin);
        this.plugin = plugin;
    }
    async display(): Promise<void> {
        let { containerEl } = this;

        containerEl.empty();

        containerEl.addClass("dice-roller-settings");

        containerEl.createEl("h2", { text: "Dice Roller Settings" });

        this.buildGenerics(containerEl.createDiv());
        this.buildDisplay(containerEl.createDiv());
        this.buildDice(containerEl.createDiv());
        this.buildTables(containerEl.createDiv());
        this.buildSections(containerEl.createDiv());
        this.buildTags(containerEl.createDiv());
        this.buildView(containerEl.createDiv());
        this.buildRender(containerEl.createDiv());

        this.buildFormulaSettings(
            containerEl.createDiv("dice-roller-setting-additional-container")
        );

        const div = containerEl.createDiv("coffee");
        div.createEl("a", {
            href: "https://www.buymeacoffee.com/valentine195"
        }).createEl("img", {
            attr: {
                src: "https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=☕&slug=valentine195&button_colour=e3e7ef&font_colour=262626&font_family=Inter&outline_colour=262626&coffee_colour=ff0000"
            }
        });
    }
    buildGenerics(containerEl: HTMLDivElement) {
        containerEl.empty();
        new Setting(containerEl)
            .setName("Globally Save Results")
            .setDesc(
                createFragment((e) => {
                    e.createSpan({
                        text: "Dice results will be saved by default. This can be overridden using "
                    });
                    e.createEl("code", { text: `dice-: formula` });
                    e.createEl("p", {
                        text: "Please note that the plugin will attempt to save the result but may not be able to."
                    });
                })
            )
            .addToggle((t) => {
                t.setValue(this.plugin.data.persistResults);
                t.onChange(async (v) => {
                    this.plugin.data.persistResults = v;
                    await this.plugin.saveSettings();
                });
            });
    }
    buildDisplay(containerEl: HTMLDivElement) {
        containerEl.empty();
        new Setting(containerEl).setHeading().setName("Dice Display");
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
            .setName("Display Dice Button With Results")
            .setDesc("A dice button will appear next to results.")
            .addToggle((t) => {
                t.setValue(this.plugin.data.showDice);
                t.onChange(async (v) => {
                    this.plugin.data.showDice = v;
                    await this.plugin.saveSettings();
                });
            });
        new Setting(containerEl)
            .setName("Add Formula When Using Modify Dice")
            .setDesc(
                createFragment((e) => {
                    e.createSpan({
                        text: "Both the formula and the results will both be added to the note when using "
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
            .setName("Display Formula in Parentheses After")
            .setDesc(
                createFragment((e) => {
                    e.createSpan({
                        text: "For example,  "
                    });
                    e.createEl("code", { text: "`dice: 1d6`" });
                    e.createSpan({ text: " will become " });
                    const parent = e.createSpan("dice-roller");
                    parent.createSpan({ cls: "dice-roller-result", text: "3" });
                    setIcon(
                        parent.createSpan("dice-roller-button"),
                        ICON_DEFINITION
                    );
                    e.createSpan({
                        text: " (1d6). This only affects Dice Rollers."
                    });
                })
            )
            .addToggle((t) => {
                t.setValue(this.plugin.data.displayFormulaAfter);
                t.onChange(async (v) => {
                    this.plugin.data.displayFormulaAfter = v;
                    await this.plugin.saveSettings();
                });
            });
    }
    buildDice(containerEl: HTMLDivElement) {
        containerEl.empty();
        new Setting(containerEl).setHeading().setName("Dice Rollers");
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
        new Setting(containerEl)
            .setName("Round Results")
            .setDesc("Determine the rounding behavior for dice results.")
            .addDropdown((d) => {
                d.addOptions(Round)
                    .setValue(this.plugin.data.round)
                    .onChange((v: Round) => {
                        this.plugin.data.round = v;
                        this.plugin.saveSettings();
                    });
            });
        new Setting(containerEl)
            .setName("Show Signed Results")
            .setDesc(
                "Positive results will show a '+'. This setting has no effect on negative results."
            )
            .addToggle((d) => {
                d.setValue(this.plugin.data.signed).onChange((v: boolean) => {
                    this.plugin.data.signed = v;
                    this.plugin.saveSettings();
                });
            });
        new Setting(containerEl)
            .setName("Always Render Dice")
            .setDesc(
                createFragment((e) => {
                    e.createSpan({
                        text: "Dice rolled in notes will always be rendered. Use the "
                    });
                    e.createEl("code", { text: "|norender" });
                    e.createSpan({ text: " flag to prevent it." });
                })
            )
            .addToggle((t) => {
                t.setValue(this.plugin.data.renderAllDice).onChange((v) => {
                    this.plugin.data.renderAllDice = v;
                    this.plugin.saveSettings();
                });
            });
    }
    buildTables(containerEl: HTMLDivElement) {
        containerEl.empty();
        new Setting(containerEl).setHeading().setName("Table Rollers");

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
    }
    buildSections(containerEl: HTMLDivElement) {
        containerEl.empty();
        new Setting(containerEl).setHeading().setName("Section Rollers");
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
            .setName("Display As Embeds")
            .setDesc(
                "Sections returned from Section & Tag Rollers will display as embedded fields."
            )
            .addToggle((t) => {
                t.setValue(this.plugin.data.displayAsEmbed);
                t.onChange(async (v) => {
                    this.plugin.data.displayAsEmbed = v;
                    await this.plugin.saveSettings();
                });
            });
    }
    buildTags(containerEl: HTMLDivElement) {
        containerEl.empty();
        new Setting(containerEl).setHeading().setName("Tag Rollers");

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
    }
    buildView(containerEl: HTMLDivElement) {
        containerEl.empty();
        new Setting(containerEl).setHeading().setName("Dice View");
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
    }
    buildRender(containerEl: HTMLDivElement) {
        containerEl.empty();
        new Setting(containerEl).setHeading().setName("Graphical Dice");
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
        new Setting(containerEl)
            .setName("Display Time for Dice Graphics")
            .setDesc(
                "Rendered dice will stay on screen for this number of milliseconds. Leave blank to require a click to clear dice."
            )
            .addText((t) => {
                t.inputEl.setAttr("type", "number");
                t.inputEl.onblur = (ev) => {
                    if (Number(t.getValue()) < 0) {
                        new Notice("Render time cannot be less than 0.");
                        t.setValue(`0`);
                    }
                };

                t.setValue(`${this.plugin.data.renderTime}`);
                t.onChange(async (v) => {
                    if ((v && Number(v) < 0) || isNaN(Number(v))) return;
                    this.plugin.data.renderTime = Number(v);
                    await this.plugin.saveSettings();
                });
            })
            .addExtraButton((b) => {
                b.setIcon("reset")
                    .setTooltip("Reset to Default")
                    .onClick(async () => {
                        this.plugin.data.renderTime =
                            DEFAULT_SETTINGS.renderTime;
                        await this.plugin.saveSettings();
                        this.buildRender(containerEl);
                    });
            });

        new Setting(containerEl)
            .setName("Use Colorful Dice")
            .setDesc(
                "Rendered dice will be varied colors based on the dice type. This will override manually set dice and text colors."
            )
            .addToggle((t) => {
                t.setValue(this.plugin.data.colorfulDice);
                t.onChange(async (v) => {
                    this.plugin.data.colorfulDice = v;
                    await this.plugin.saveSettings();

                    this.plugin.app.workspace.trigger(
                        "dice-roller:update-dice"
                    );
                });
            });
        new Setting(containerEl)
            .setName("Adjust Dice Scale")
            .setDesc("Control the size of rendered dice.")
            .addSlider((s) => {
                s.setLimits(0.5, 1.5, 0.1)
                    .setValue(this.plugin.data.scaler)
                    .onChange((v) => {
                        this.plugin.data.scaler = v;
                        this.plugin.app.workspace.trigger(
                            "dice-roller:update-dice"
                        );
                        this.plugin.saveSettings();
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
                        "dice-roller:update-dice"
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
                        "dice-roller:update-dice"
                    );
                };
            }
        );
    }

    buildFormulaSettings(containerEl: HTMLDivElement) {
        containerEl.empty();
        new Setting(containerEl).setHeading().setName("Saved Formulas");
        const addNew = containerEl.createDiv();
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
                            this.buildFormulaSettings(containerEl);
                            await this.plugin.saveSettings();
                        }
                    });

                return b;
            });

        const additional = containerEl.createDiv("additional");

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
                                this.buildFormulaSettings(containerEl);
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
                            this.buildFormulaSettings(containerEl);
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
