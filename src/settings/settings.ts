import {
    App,
    ButtonComponent,
    DropdownComponent,
    ExtraButtonComponent,
    Notice,
    Platform,
    PluginSettingTab,
    setIcon,
    Setting,
    TextComponent,
    TFolder
} from "obsidian";
import { Round, ExpectedValue } from "src/types";
import { ICON_DEFINITION } from "src/utils/constants";
import type DiceRoller from "../main";
import { DEFAULT_SETTINGS } from "../main";
import { DiceIcon, IconManager, IconShapes } from "src/view/view.icons";
import { generateSlug } from "random-word-slugs";
import { FontSuggestionModal } from "src/suggester/fonts";
import { FolderSuggestionModal } from "src/suggester/folder";

declare var require: (id: "get-fonts") => { getFonts: () => Promise<string[]> };

declare global {
    interface Window {
        Capacitor?: {
            isPluginAvailable(plugin: string): boolean;
            Plugins: {
                App: {
                    getFonts: () => Promise<string[]>;
                };
            };
        };
    }
}
export default class SettingTab extends PluginSettingTab {
    iconsEl: HTMLDivElement;
    contentEl: HTMLDivElement;
    constructor(app: App, public plugin: DiceRoller) {
        super(app, plugin);
        this.plugin = plugin;
    }
    async getFonts() {
        let fonts: string[] = [];
        try {
            if (
                Platform.isMobile &&
                window?.Capacitor?.isPluginAvailable("App")
            ) {
                fonts = await window?.Capacitor?.Plugins["App"]
                    ?.getFonts()
                    ?.catch((e) => []);
            } else {
                fonts = await require("get-fonts")
                    .getFonts()
                    .catch((e) => []);
            }
        } catch (e) {}

        let fontSet: Set<string> = new Set();

        for (const font of fonts) {
            fontSet.add(font);
        }

        return [...fontSet].sort();
    }
    async display(): Promise<void> {
        let { containerEl } = this;

        containerEl.empty();

        containerEl.addClass("dice-roller-settings");

        containerEl.createEl("h2", { text: "Dice Roller Settings" });

        this.contentEl = this.containerEl.createDiv(
            "dice-roller-settings-content"
        );

        this.buildGenerics(this.contentEl.createDiv());
        this.buildDisplay(
            this.contentEl.createEl("details", {
                cls: "dice-roller-nested-settings"
            })
        );
        this.buildDice(
            this.contentEl.createEl("details", {
                cls: "dice-roller-nested-settings"
            })
        );
        this.buildView(
            this.contentEl.createEl("details", {
                cls: "dice-roller-nested-settings"
            })
        );
        this.buildRender(
            this.contentEl.createEl("details", {
                cls: "dice-roller-nested-settings"
            })
        );

        this.buildFormulaSettings(
            this.contentEl.createEl("details", {
                cls: "dice-roller-nested-settings"
            })
        );
        this.buildTables(
            this.contentEl.createEl("details", {
                cls: "dice-roller-nested-settings"
            })
        );
        this.buildSections(
            this.contentEl.createEl("details", {
                cls: "dice-roller-nested-settings"
            })
        );
        this.buildTags(
            this.contentEl.createEl("details", {
                cls: "dice-roller-nested-settings"
            })
        );
        this.buildDiceModTemplateFoldersSettings(
            this.contentEl.createEl("details", {
                cls: "dice-roller-nested-settings"
            })
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
    #buildSummary(containerEl: HTMLDetailsElement, name: string) {
        const summary = containerEl.createEl("summary");
        new Setting(summary).setHeading().setName(name);

        setIcon(
            summary.createDiv("collapser").createDiv("handle"),
            "chevron-right"
        );
    }
    buildDisplay(containerEl: HTMLDetailsElement) {
        containerEl.empty();
        this.#buildSummary(containerEl, "Dice Display");
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
    buildDice(containerEl: HTMLDetailsElement) {
        containerEl.empty();
        this.#buildSummary(containerEl, "Dice Rollers");
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
                    this.plugin.parser.setDefaultFace(
                        this.plugin.data.defaultFace
                    );
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
            .setName("Auto Roll dice")
            .setDesc(
                "On initial display, should dice be rolled or displayed empty."
            )
            .addDropdown((d) => {
                d.addOption(ExpectedValue.None, "Empty")
                    .addOption(ExpectedValue.Roll, "Rolled")
                    .setValue(this.plugin.data.initialDisplay)
                    .onChange((v: ExpectedValue) => {
                        this.plugin.data.initialDisplay = v;
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
        new Setting(containerEl)
            .setName("Log Rolls to Dice Tray")
            .setDesc(
                createFragment((e) => {
                    e.createSpan({
                        text: "Dice rolled in notes will be added to the Dice Tray's Results section."
                    });
                })
            )
            .addToggle((t) => {
                t.setValue(this.plugin.data.addToView).onChange((v) => {
                    this.plugin.data.addToView = v;
                    this.plugin.saveSettings();
                });
            });
    }
    buildTables(containerEl: HTMLDetailsElement) {
        containerEl.empty();
        this.#buildSummary(containerEl, "Table Rollers");

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
    buildSections(containerEl: HTMLDetailsElement) {
        containerEl.empty();
        this.#buildSummary(containerEl, "Section Rollers");

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
    buildTags(containerEl: HTMLDetailsElement) {
        containerEl.empty();
        this.#buildSummary(containerEl, "Tag Rollers");

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
    buildView(containerEl: HTMLDetailsElement) {
        containerEl.empty();
        this.#buildSummary(containerEl, "Dice Tray");

        new Setting(containerEl)
            .setName("Open Dice Tray on Startup")
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
            .setName("Dice Tray Buttons")
            .setDesc(
                "Add and remove the buttons available in the Dice Tray here, to customize what quick-actions are available to roll."
            );

        this.iconsEl = containerEl.createDiv("dice-icons");
        this.buildIcons();
    }
    buildIcons() {
        this.iconsEl.empty();
        if (!this.plugin.data.icons) {
            this.iconsEl.createSpan({
                cls: "no-icons",
                text: "No dice buttons created! Create a button to use this functionality."
            });
            return;
        }

        const pathsEl = this.iconsEl.createDiv("existing-buttons has-table");
        //build table
        const tableEl = pathsEl.createDiv("buttons-table");
        for (let i = 0; i < this.plugin.data.icons.length; i++) {
            const rowEl = tableEl.createDiv("icons-table-row");
            this.buildStaticIcon(rowEl, i);
        }

        /** Build the "add-new" */
        const addEl = tableEl.createDiv("icons-table-row add-new");
        const toAdd: DiceIcon = {
            text: null,
            formula: null,
            shape: IconShapes.NONE,
            id: generateSlug()
        };
        const dropEl = addEl.createDiv("shape");
        const formulaEl = addEl.createDiv("formula");
        new TextComponent(formulaEl).setPlaceholder("Formula").onChange((v) => {
            toAdd.formula = v;
            button.setDisabled(
                toAdd.text?.length === 0 || toAdd.formula?.length === 0
            );
        });
        new TextComponent(formulaEl).setPlaceholder("Display").onChange((v) => {
            toAdd.text = v;
            button.setDisabled(
                toAdd.text?.length === 0 || toAdd.formula?.length === 0
            );
        });
        const button = new ExtraButtonComponent(addEl.createDiv("actions"))
            .setIcon("plus-with-circle")
            .setDisabled(true)
            .onClick(async () => {
                if (!toAdd.text || !toAdd.formula) return;
                this.plugin.data.icons.push({ ...toAdd });
                this.buildIcons();
                await this.plugin.view.buildButtons();
                await this.plugin.saveSettings();
            });
        const drop = new DropdownComponent(dropEl);
        for (const [type, display] of Object.entries(IconShapes)) {
            drop.addOption(display, display);
        }

        drop.setValue(toAdd.shape).onChange((v) => {
            toAdd.shape = drop.getValue() as IconShapes;
        });
        toAdd.shape = drop.getValue() as IconShapes;
    }
    buildStaticIcon(rowEl: HTMLElement, index: number) {
        rowEl.empty();
        rowEl.removeClass("add-new");
        const instance = this.plugin.data.icons[index];
        const iconEl = rowEl.createDiv("shape dice-button");

        IconManager.registerIcon(instance.id, instance.shape, instance.text);

        setIcon(iconEl, instance.id);

        rowEl.createDiv({ cls: "formula", text: instance.formula });

        const actions = rowEl.createDiv("actions");
        new ExtraButtonComponent(actions).setIcon("edit").onClick(() => {
            this.buildEditIcon(rowEl, index, instance);
        });
        new ExtraButtonComponent(actions).setIcon("trash").onClick(async () => {
            this.plugin.data.icons.splice(index, 1);
            await this.plugin.view.buildButtons();
            this.buildIcons();
        });
    }
    buildEditIcon(rowEl: HTMLElement, index: number, instance: DiceIcon) {
        rowEl.empty();
        rowEl.addClass("add-new");
        /** Build the "add-new" */
        const toAdd: DiceIcon = {
            text: instance.text,
            formula: instance.formula,
            shape: instance.shape,
            id: instance.id
        };
        const dropEl = rowEl.createDiv("shape");
        const formulaEl = rowEl.createDiv("formula");
        new TextComponent(formulaEl)
            .setPlaceholder("Formula")
            .setValue(toAdd.formula)
            .onChange((v) => {
                toAdd.formula = v;
                button.setDisabled(
                    toAdd.text.length === 0 || toAdd.formula.length === 0
                );
            });
        new TextComponent(formulaEl)
            .setPlaceholder("Display")
            .setValue(toAdd.text)
            .onChange((v) => {
                toAdd.text = v;
                button.setDisabled(
                    toAdd.text.length === 0 || toAdd.formula.length === 0
                );
            });
        const actionsEl = rowEl.createDiv("actions");
        const button = new ExtraButtonComponent(actionsEl)
            .setIcon("checkmark")
            .setDisabled(toAdd.text.length === 0 || toAdd.formula.length === 0)
            .onClick(async () => {
                if (!toAdd.text || !toAdd.formula) return;
                this.plugin.data.icons.splice(index, 1, { ...toAdd });
                await this.plugin.saveSettings();
                this.buildStaticIcon(rowEl, index);
                await this.plugin.view.buildButtons();
            });
        new ExtraButtonComponent(actionsEl).setIcon("cross").onClick(() => {
            this.buildStaticIcon(rowEl, index);
        });
        const drop = new DropdownComponent(dropEl);
        for (const [type, display] of Object.entries(IconShapes)) {
            drop.addOption(display, display);
        }

        drop.setValue(toAdd.shape).onChange((v) => {
            toAdd.shape = v as IconShapes;
        });
    }
    buildRender(containerEl: HTMLDetailsElement) {
        containerEl.empty();
        this.#buildSummary(containerEl, "Graphical Dice");

        new Setting(containerEl)
            .setName("Display graphics for Dice Tray Rolls")
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
                    this.plugin.renderer.setData(this.plugin.getRendererData());
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
                    this.plugin.renderer.setData(this.plugin.getRendererData());
                    await this.plugin.saveSettings();
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
                        this.plugin.renderer.setData(
                            this.plugin.getRendererData()
                        );
                        this.plugin.saveSettings();
                    });
            });
        new Setting(containerEl)
            .setName("Font for dice")
            .setDesc("Select the font to use for the dice")
            .addText(async (t) => {
                const set = async () => {
                    this.plugin.data.textFont = t.getValue();
                    await this.plugin.saveSettings();
                    this.plugin.renderer.setData(this.plugin.getRendererData());
                };
                const folderModal = new FontSuggestionModal(
                    this.app,
                    t,
                    await this.getFonts()
                );
                folderModal.onClose = () => {
                    t.setValue(folderModal.item);
                    set();
                };
                t.setValue(this.plugin.data.textFont);
                t.inputEl.onblur = async () => {
                    set();
                };
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
                    this.plugin.renderer.setData(this.plugin.getRendererData());

                    await this.plugin.saveSettings();
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
                    this.plugin.renderer.setData(this.plugin.getRendererData());
                    await this.plugin.saveSettings();
                };
            }
        );

        new Setting(containerEl)
            .setName("Show Notice for Results")
            .setDesc(
                createFragment((e) => {
                    e.createSpan({
                        text: "A notice will be displayed for each rendered dice roll."
                    });
                    e.createEl("br");
                    e.createSpan({
                        text: "Changing this setting will not effect any existing dice rollers in opened notes."
                    });
                })
            )
            .addToggle((t) => {
                t.setValue(this.plugin.data.showRenderNotice).onChange(
                    async (v) => {
                        this.plugin.data.showRenderNotice = v;
                        await this.plugin.saveSettings();
                    }
                );
            });
    }

    buildFormulaSettings(containerEl: HTMLDetailsElement) {
        containerEl.empty();
        this.#buildSummary(containerEl, "Saved Formulas");
        const settingEl = containerEl.createDiv(
            "dice-roller-setting-additional-container"
        );

        const addNew = settingEl.createDiv();
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

    buildDiceModTemplateFoldersSettings(containerEl: HTMLDetailsElement) {
        containerEl.empty();
        this.#buildSummary(containerEl, "Modify Dice");
        new Setting(containerEl)
            .setName(
                createFragment((e) => {
                    e.createSpan({ text: "Apply " });
                    e.createEl("code", { text: "dice-mod" });
                    e.createSpan({ text: " in live-preview" });
                })
            )
            .setDesc(
                createFragment((e) => {
                    e.createSpan({ text: "If not enabled " });
                    e.createEl("code", { text: "dice-mod" });
                    e.createSpan({
                        text: " will only be applied/replaced in read mode."
                    });
                })
            )
            .addToggle((t) => {
                t.setValue(this.plugin.data.replaceDiceModInLivePreview);
                t.onChange(async (v) => {
                    this.plugin.data.replaceDiceModInLivePreview = v;
                    await this.plugin.saveSettings();
                });
            });
        new Setting(containerEl)
            .setName("Escape Markdown When Modifying")
            .setDesc(
                createFragment((e) => {
                    e.createSpan({
                        text: "Markdown characters will be escaped when using "
                    });
                    e.createEl("code", { text: "dice-mod" });
                    e.createSpan({ text: "." });
                })
            )
            .addToggle((t) => {
                t.setValue(this.plugin.data.escapeDiceMod);
                t.onChange(async (v) => {
                    this.plugin.data.escapeDiceMod = v;
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

        const settingEl = containerEl.createDiv(
            "dice-roller-setting-additional-container"
        );
        const addNew = settingEl.createDiv();
        new Setting(addNew)
            .setName("Template Folders")
            .setDesc(
                createFragment((e) => {
                    e.createSpan({ text: "Define folders where " });
                    e.createEl("code", { text: "dice-mod" });
                    e.createSpan({
                        text: " is not applied/replaced and can be used in templates."
                    });
                })
            )
            .addButton((button: ButtonComponent): ButtonComponent => {
                let b = button
                    .setTooltip("Add Folder")
                    .setButtonText("+")
                    .onClick(async () => {
                        const tmp = await this.buildDiceModTemplateFoldersForm(
                            addNew
                        );

                        if (tmp) {
                            this.plugin.data.diceModTemplateFolders[
                                tmp.folder
                            ] = tmp.useSubfolders;
                            this.buildDiceModTemplateFoldersSettings(
                                containerEl
                            );
                            await this.plugin.saveSettings();
                        }
                    });

                return b;
            });

        const additional = settingEl.createDiv("additional");

        const diceModeTemplateFolders = this.plugin.data.diceModTemplateFolders;

        for (const [folder, useSubfolders] of Object.entries(
            diceModeTemplateFolders
        )) {
            const setting = new Setting(additional).setName(folder);
            if (useSubfolders) {
                setting.controlEl.createSpan({
                    text: "(including subfolders)",
                    cls: "dice-mod-template-use-subfolders"
                });
            }
            setting
                .addExtraButton((b) =>
                    b
                        .setIcon("pencil")
                        .setTooltip("Edit")
                        .onClick(async () => {
                            const edited =
                                await this.buildDiceModTemplateFoldersForm(
                                    addNew,
                                    {
                                        folder: folder,
                                        useSubfolders: useSubfolders
                                    }
                                );

                            if (edited) {
                                delete this.plugin.data.diceModTemplateFolders[
                                    folder
                                ];
                                this.plugin.data.diceModTemplateFolders[
                                    edited.folder
                                ] = edited.useSubfolders;
                                this.buildDiceModTemplateFoldersSettings(
                                    containerEl
                                );
                                await this.plugin.saveSettings();
                            }
                        })
                )
                .addExtraButton((b) =>
                    b
                        .setIcon("trash")
                        .setTooltip("Delete")
                        .onClick(async () => {
                            delete this.plugin.data.diceModTemplateFolders[
                                folder
                            ];
                            await this.plugin.saveSettings();
                            this.buildDiceModTemplateFoldersSettings(
                                containerEl
                            );
                        })
                );
        }
        if (!Object.values(diceModeTemplateFolders).length) {
            additional.createDiv(
                { cls: "no-dice-mod-template-folders" },
                (e) => {
                    e.createSpan({ text: "Add a template folder to enable " });
                    e.createEl("code", { text: "dice-mod" });
                    e.createSpan({ text: " in templates!" });
                }
            );
        }
    }
    allFolders = this.app.vault
        .getAllLoadedFiles()
        .filter((f) => f instanceof TFolder) as TFolder[];
    folders = this.allFolders
        .filter(
            (f) =>
                !Object.keys(
                    this.plugin.data.diceModTemplateFolders ?? {}
                ).find(([p]) => f.path === p)
        )
        .sort((a, b) => a.path.localeCompare(b.path));
    async buildDiceModTemplateFoldersForm(
        el: HTMLElement,
        temp: DiceModTemplateFolder = {
            folder: null,
            useSubfolders: true
        }
    ): Promise<DiceModTemplateFolder> {
        return new Promise((resolve) => {
            const formulaEl = el.createDiv("add-new-formula");
            const dataEl = formulaEl.createDiv("formula-data");

            new Setting(dataEl)
                .setName("Template Folder")
                .addText(async (t) => {
                    const set = async () => {
                        temp.folder = t.getValue();
                        this.folders = this.allFolders
                            .filter(
                                (f) =>
                                    !Object.keys(
                                        this.plugin.data
                                            .diceModTemplateFolders ?? {}
                                    ).find(([p]) => f.path === p)
                            )
                            .sort((a, b) => a.path.localeCompare(b.path));
                    };
                    const folderModal = new FolderSuggestionModal(
                        this.app,
                        t,
                        this.folders
                    );
                    folderModal.onClose = () => {
                        set();
                    };
                    t.inputEl.onblur = async () => {
                        set();
                    };
                });
            new Setting(dataEl)
                .setName("Also use subfolders")
                .addToggle((t) => {
                    t.setValue(temp.useSubfolders).onChange(
                        (v) => (temp.useSubfolders = v)
                    );
                });

            const buttonEl = formulaEl.createDiv("formula-buttons");
            new Setting(buttonEl)
                .addButton((b) =>
                    b
                        .setCta()
                        .setButtonText("Save")
                        .onClick(async () => {
                            formulaEl.detach();
                            if (temp.folder && temp.folder != "") {
                                resolve(temp);
                            } else {
                                new Notice("Invalid Template folder!");
                                resolve(null);
                            }
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

interface DiceModTemplateFolder {
    folder: string;
    useSubfolders: boolean;
}
