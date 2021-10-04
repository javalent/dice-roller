import {
    addIcon,
    ButtonComponent,
    debounce,
    ExtraButtonComponent,
    ItemView,
    Notice,
    TextAreaComponent,
    TextComponent,
    WorkspaceLeaf
} from "obsidian";
import DiceRollerPlugin from "src/main";
import { StackRoller } from "src/roller";
import { COPY_DEFINITION, ICON_DEFINITION } from "src/utils/constants";
import DiceRenderer from "./renderer";

import "./view.css";

export const VIEW_TYPE = "DICE_ROLLER_VIEW";

const D4 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500"><defs><style>.cls-1{fill:none;stroke: currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-width:15px;}</style></defs><g id="Shapes"><path class="cls-1" d="M244.62,49.31,40.31,403.19a6.21,6.21,0,0,0,5.38,9.31H454.31a6.21,6.21,0,0,0,5.38-9.31L255.38,49.31A6.21,6.21,0,0,0,244.62,49.31Z"/></g><g fill="currentColor" id="Layer_1" data-name="Layer 1"><path d="M270.21,278.16h21.7v16.22h-21.7v36.31h-20V294.38H179V282.67l70-108.39h21.16Zm-68.64,0h48.66v-76.7l-2.36,4.3Z"/></g></svg>`;
const D6 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500"><defs><style>.cls-1{fill:none;stroke: currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-width:15px;}</style></defs><g id="Shapes"><rect class="cls-1" x="87.5" y="87.5" width="325" height="325" rx="10"/></g><g fill="currentColor" id="Layer_1" data-name="Layer 1"><path d="M279.22,174.18V191h-3.65q-23.2.44-37,13.75t-15.9,37.49q12.36-14.17,33.74-14.18,20.4,0,32.6,14.4t12.19,37.17q0,24.16-13.16,38.67t-35.29,14.5q-22.46,0-36.41-17.24t-14-44.42v-7.63q0-43.19,18.42-66t54.84-23.36Zm-26.1,70.47a33.41,33.41,0,0,0-30.73,21.48v7.31q0,19.33,8.7,31.15t21.7,11.81q13.43,0,21.11-9.88t7.68-25.89q0-16.11-7.79-26A25,25,0,0,0,253.12,244.65Z"/></g></svg>`;
const D8 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500"><defs><style>.cls-1{fill:none;stroke: currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-width:15px;}</style></defs><g id="Shapes"><rect class="cls-1" x="102.75" y="102.75" width="294.51" height="294.51" rx="9.8" transform="translate(-103.55 250) rotate(-45)"/></g><g fill="currentColor" id="Layer_1" data-name="Layer 1"><path d="M292.08,215.1a36.35,36.35,0,0,1-6.17,20.84,42.05,42.05,0,0,1-16.71,14.29,44.8,44.8,0,0,1,19.39,15.36,38.7,38.7,0,0,1,7.15,22.88q0,20.31-13.7,32.34t-36,12q-22.56,0-36.15-12.09t-13.59-32.28a39.84,39.84,0,0,1,6.93-22.88,43.14,43.14,0,0,1,19.18-15.47,40.88,40.88,0,0,1-16.44-14.28,36.85,36.85,0,0,1-6-20.74q0-19.75,12.67-31.36T246,172.14q20.63,0,33.35,11.6T292.08,215.1ZM275.86,288q0-13.1-8.32-21.37t-21.75-8.27q-13.44,0-21.54,8.16T216.14,288q0,13.33,7.89,20.95t22,7.63q14,0,21.91-7.68T275.86,288ZM246,188.46q-11.72,0-19,7.26t-7.25,19.71q0,11.92,7.14,19.28T246,242.07q11.92,0,19.07-7.36t7.14-19.28q0-11.93-7.41-19.45T246,188.46Z"/></g></svg>`;
const D10 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500"><defs><style>.cls-1{fill:none;stroke: currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-width:15px;}</style></defs><g id="Shapes"><rect class="cls-1" x="102.75" y="102.75" width="294.51" height="294.51" rx="9.8" transform="translate(-103.55 250) rotate(-45)"/></g><g fill="currentColor" id="Layer_1" data-name="Layer 1"><path d="M219,330.69H199V198.24L158.92,213V194.91l56.93-21.38H219Z"/><path d="M344.47,264q0,34.92-11.93,51.89t-37.27,17q-25,0-37.06-16.6t-12.46-49.57V240.13q0-34.47,11.92-51.24t37.38-16.75q25.24,0,37.17,16.16t12.25,49.9ZM324.59,236.8q0-25.23-7.09-36.79t-22.45-11.55q-15.26,0-22.23,11.5t-7.2,35.34v31.8q0,25.35,7.36,37.43t22.29,12.09q14.72,0,21.86-11.39t7.46-35.88Z"/></g></svg>`;
const D12 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500"><defs><style>.cls-1{fill:none;stroke: currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-width:15px;}</style></defs><g id="Shapes"><path class="cls-1" d="M244.31,29.14,52,168.87a9.72,9.72,0,0,0-3.52,10.84l73.47,226.1a9.69,9.69,0,0,0,9.21,6.69H368.87a9.69,9.69,0,0,0,9.21-6.69l73.47-226.1A9.72,9.72,0,0,0,448,168.87L255.69,29.14A9.66,9.66,0,0,0,244.31,29.14Z"/></g><g fill="currentColor" id="Layer_1" data-name="Layer 1"><path d="M208,330.69H188V198.24L147.93,213V194.91l56.93-21.38H208Z"/><path d="M342.28,330.69H239.8V316.4l54.14-60.15q12-13.65,16.6-22.19a37,37,0,0,0,4.56-17.67q0-12.24-7.41-20.08t-19.77-7.85q-14.82,0-23,8.44t-8.22,23.47H236.79q0-21.6,13.91-34.91t37.22-13.32q21.81,0,34.49,11.44T335.08,214q0,23.1-29.43,55l-41.9,45.44h78.53Z"/></g></svg>`;
const D20 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500"><defs><style>.cls-1{fill:none;stroke: currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-width:15px;}</style></defs><g id="Shapes"><path class="cls-1" d="M55.14,143.27V356.73a10,10,0,0,0,5,8.66L245,472.11a10,10,0,0,0,10,0L439.86,365.39a10,10,0,0,0,5-8.66V143.27a10,10,0,0,0-5-8.66L255,27.89a10,10,0,0,0-10,0L60.14,134.61A10,10,0,0,0,55.14,143.27Z"/></g><g fill="currentColor" id="Layer_1" data-name="Layer 1"><path d="M251.34,330.69H148.86V316.4L203,256.25q12-13.65,16.6-22.19a37,37,0,0,0,4.57-17.67q0-12.24-7.42-20.08T197,188.46q-14.82,0-23,8.44t-8.22,23.47H145.86q0-21.6,13.91-34.91T197,172.14q21.81,0,34.48,11.44T244.15,214q0,23.1-29.44,55l-41.89,45.44h78.52Z"/><path d="M361.67,264q0,34.92-11.92,51.89t-37.27,17q-25,0-37.06-16.6T263,266.67V240.13q0-34.47,11.93-51.24t37.38-16.75q25.25,0,37.17,16.16t12.24,49.9ZM341.8,236.8q0-25.23-7.09-36.79t-22.45-11.55Q297,188.46,290,200t-7.19,35.34v31.8q0,25.35,7.36,37.43t22.29,12.09q14.72,0,21.86-11.39t7.46-35.88Z"/></g></svg>`;
const D100 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500"><defs><style>.cls-1{fill:none;stroke: currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-width:15px;}</style></defs><g fill="currentColor" id="Layer_1" data-name="Layer 1"><path d="M172.54,194.88q0-15.7,10.19-25.49t26.72-9.79q16.76,0,27,9.67t10.19,26.19v8.44q0,15.82-10.19,25.43t-26.72,9.61q-16.65,0-26.9-9.67T172.54,203.2Zm22.5,9.17q0,7.06,4,11.37a13.88,13.88,0,0,0,10.61,4.3,13.24,13.24,0,0,0,10.43-4.36Q224,211,224,203.69V195c0-4.71-1.28-8.53-3.86-11.43s-6.14-4.36-10.67-4.36a13.56,13.56,0,0,0-10.43,4.3q-4,4.31-4,12Zm21.33,115.87L199.84,311l83.32-133.36,16.53,8.91Zm37.73-29.06q0-15.83,10.31-25.49t26.72-9.67q16.65,0,26.9,9.55t10.25,26.31V300q0,15.71-10.08,25.37T291.37,335q-16.87,0-27.07-9.73t-10.2-25.78Zm22.5,9.28a15.82,15.82,0,0,0,4.22,11.08,13.71,13.71,0,0,0,10.55,4.6q14.29,0,14.29-15.92V291q0-7.08-4-11.38a15.08,15.08,0,0,0-21.09,0q-4,4.31-4,11.73Z"/><circle class="cls-1" cx="246.23" cy="250" r="189.38"/></g></svg>`;

addIcon("d4", D4);
addIcon("d6", D6);
addIcon("d8", D8);
addIcon("d10", D10);
addIcon("d12", D12);
addIcon("d20", D20);
addIcon("d100", D100);

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
    static DICE() {
        return {
            d4: 0,
            d6: 0,
            d8: 0,
            d10: 0,
            d12: 0,
            d20: 0,
            d100: 0
        };
    }
    stack: StackRoller;
    gridEl: HTMLDivElement;
    formulaEl: HTMLDivElement;
    dice: { [dice: string]: number } = DiceView.DICE();

    custom = "";
    adv = false;
    dis = false;
    add = 0;

    formulaComponent: TextAreaComponent;
    resultEl: HTMLDivElement;

    renderer = new DiceRenderer(this.plugin);

    constructor(public plugin: DiceRollerPlugin, public leaf: WorkspaceLeaf) {
        super(leaf);
        this.contentEl.addClass("dice-roller-view");

        this.registerEvent(
            this.plugin.app.workspace.on("dice-roller:update-colors", () => {
                this.renderer.factory.updateColors();
            })
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

    buildButtons() {
        this.gridEl.empty();
        const buttons = this.gridEl.createDiv("dice-buttons");

        for (let type in this.dice) {
            const button = new ExtraButtonComponent(
                buttons.createDiv("dice-button")
            ).setIcon(type);
            button.extraSettingsEl.onclick = async (evt) => {
                let add = evt.getModifierState("Shift") ? -1 : 1;
                this.dice[type] += add;
                this.setFormula();
                const roller = await this.plugin.getRoller(
                    this.formulaComponent.inputEl.value,
                    "view"
                );
                if (roller instanceof StackRoller) {
                    this.stack = roller;
                }
            };
        }

        const advDis = this.gridEl.createDiv("advantage-disadvantage");

        const adv = new ButtonComponent(advDis)
            .setButtonText("ADV")
            .onClick(() => {
                this.adv = !this.adv;
                this.dis = false;

                if (this.adv) {
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
                this.dis = !this.dis;

                if (this.dis) {
                    dis.setCta();
                    adv.removeCta();
                } else {
                    dis.removeCta();
                }

                this.adv = false;
                this.setFormula();
            });

        const add = this.gridEl
            .createDiv("dice-context")
            .createDiv("add-subtract");

        new ExtraButtonComponent(add)
            .setIcon("dice-roller-minus")
            .onClick(() => {
                this.add -= 1;
                addComponent.setValue(`${this.add}`);
                this.setFormula();
            });
        const addComponent = new TextComponent(add)
            .setValue(`${this.add ? this.add : ""}`)
            .onChange((v) => {
                if (!isNaN(Number(v))) this.add = Number(v);
                this.setFormula();
            });
        new ExtraButtonComponent(add)
            .setIcon("dice-roller-plus")
            .onClick(() => {
                this.add += 1;
                addComponent.setValue(`${this.add}`);
                this.setFormula();
            });
    }
    formulaDice: StackRoller;
    buildFormula() {
        this.formulaEl.empty();
        this.formulaComponent = new TextAreaComponent(
            this.formulaEl
        ).setPlaceholder("Dice Formula");

        this.formulaComponent.onChange(debounce(async (v) => {}, 500, true));
        const roll = new ButtonComponent(this.formulaEl)
            .setIcon(ICON_DEFINITION)
            .setCta()
            .setTooltip("Roll")
            .onClick(async () => {
                if (!this.formulaComponent.inputEl.value) {
                    return;
                }
                roll.setDisabled(true);
                const roller = await this.plugin.getRoller(
                    this.formulaComponent.inputEl.value,
                    "view"
                );

                if (!(roller instanceof StackRoller)) {
                    new Notice("The Dice View only supports dice rolls.");
                    return;
                }
                await roller.roll();
                if (!roller.dice.length) {
                    new Notice("Invalid formula.");
                    return;
                }

                let resultText = roller.resultText;
                if (
                    this.plugin.data.renderer &&
                    roller.dice.filter((dice) => !dice.static).length
                ) {
                    this.addChild(this.renderer);
                    const staticDice = roller.dice.filter(
                        (dice) => dice.static
                    );
                    this.renderer.setDice(
                        roller.dice.filter((dice) => !dice.static)
                    );
                    const results = await this.renderer.start();
                    let result = 0;
                    resultText = roller.original;

                    for (let i = 0; i < results.length; i++) {
                        const dice = results[i];
                        let text;
                        if ((this.adv || this.dis) && i == 0) {
                            const target = this.adv
                                ? Math.max(...dice[1])
                                : Math.min(...dice[1]);
                            result += target;
                            text = `[${dice[1].map((n) => {
                                if (n != target) return `${n}d`;
                                return `${n}`;
                            })}]`;
                        } else {
                            result += dice[1].reduce((a, b) => a + b);
                            text = `[${dice[1]}]`;
                        }
                        resultText = resultText.replace(
                            new RegExp(`\\d+d${dice[0]}`),
                            text
                        );
                    }
                    const staticResult =
                        staticDice
                            ?.map((d) => d.result)
                            ?.reduce((a, b) => a + b, 0) ?? 0;
                    roller.result = result + staticResult;
                }
                roll.setDisabled(false);

                this.addResult({
                    result: roller.result,
                    original: roller.original,
                    resultText
                });

                this.dice = DiceView.DICE();
                this.add = null;
                this.adv = false;
                this.dis = false;

                this.buildButtons();

                this.setFormula();
            });
        roll.buttonEl.addClass("dice-roller-roll");
    }
    addResult(roller: {
        result: number;
        original: string;
        resultText: string;
    }) {
        if (this.noResultsEl) {
            this.noResultsEl.detach();
        }
        const result = createDiv("view-result");

        result.createSpan({
            text: roller.original
        });
        /* result.createSpan({
            text: roller.resultText
        }); */
        result.createEl("strong", {
            text: `${roller.result}`,
            attr: {
                "aria-label": roller.resultText
            }
        });

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

        this.resultEl.prepend(result);
    }

    get formulaString() {
        const result = [];
        const dice = Object.entries(this.dice).filter(
            ([type, num]) => num != 0
        );
        if (!dice.length) return "";

        dice.sort((a, b) => Number(b[0].slice(1)) - Number(a[0].slice(1)));

        const first = dice.shift();
        result.push(`${first[1]}${first[0]}`);

        if (this.adv) {
            result.push("kh");
        } else if (this.dis) {
            result.push("dh");
        }

        if (dice.length) {
            result.push(
                ...dice.map(
                    ([type, num]) =>
                        `${num > 0 ? "+" : "-"}${Math.abs(num)}${type}`
                )
            );
        }

        if (this.add && this.add != 0) {
            result.push(this.add > 0 ? "+" : "-");
            result.push(Math.abs(this.add));
        }

        return result.join("");
    }

    setFormula() {
        this.formulaComponent.setValue(this.formulaString);
    }

    getDisplayText() {
        return "Dice Roller";
    }
    getViewType() {
        return VIEW_TYPE;
    }
    getIcon() {
        return ICON_DEFINITION;
    }
    async onClose() {
        await super.onClose();
        this.renderer.unload();
    }
}
