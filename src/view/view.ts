import {
    addIcon,
    ButtonComponent,
    debounce,
    ExtraButtonComponent,
    ItemView,
    setIcon,
    TextComponent,
    WorkspaceLeaf
} from "obsidian";
import DiceRollerPlugin from "src/main";
import { DiceRoller } from "src/roller";
import { ICON_DEFINITION } from "src/utils/constants";

import "./view.css";

export const VIEW_TYPE = "DICE_ROLLER_VIEW";

const D4 = `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="mdi-dice-d4-outline" viewBox="0 0 24 24"><path d="M13.43,15.15H14.29V16.36H13.43V18H11.92V16.36H8.82L8.75,15.41L11.91,10.42H13.43V15.15M10.25,15.15H11.92V12.47L10.25,15.15M22,21H2C1.64,21 1.31,20.81 1.13,20.5C0.95,20.18 0.96,19.79 1.15,19.5L11.15,3C11.5,2.38 12.5,2.38 12.86,3L22.86,19.5C23.04,19.79 23.05,20.18 22.87,20.5C22.69,20.81 22.36,21 22,21M3.78,19H20.23L12,5.43L3.78,19Z"/></svg>`;
const D6 = `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="mdi-dice-d6-outline" viewBox="0 0 24 24"><path d="M5,3H19A2,2 0 0,1 21,5V19A2,2 0 0,1 19,21H5A2,2 0 0,1 3,19V5A2,2 0 0,1 5,3M5,5V19H19V5H5M13.39,9.53C10.89,9.5 10.86,11.53 10.86,11.53C10.86,11.53 11.41,10.87 12.53,10.87C13.19,10.87 14.5,11.45 14.55,13.41C14.61,15.47 12.77,16 12.77,16C12.77,16 9.27,16.86 9.3,12.66C9.33,7.94 13.39,8.33 13.39,8.33V9.53M11.95,12.1C11.21,12 10.83,12.78 10.83,12.78L10.85,13.5C10.85,14.27 11.39,14.83 12,14.83C12.61,14.83 13.05,14.27 13.05,13.5C13.05,12.73 12.56,12.1 11.95,12.1Z"/></svg>`;
const D8 = `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="mdi-dice-d8-outline" viewBox="0 0 24 24"><path d="M12,8.25C13.31,8.25 14.38,9.2 14.38,10.38C14.38,11.07 14,11.68 13.44,12.07C14.14,12.46 14.6,13.13 14.6,13.9C14.6,15.12 13.44,16.1 12,16.1C10.56,16.1 9.4,15.12 9.4,13.9C9.4,13.13 9.86,12.46 10.56,12.07C10,11.68 9.63,11.07 9.63,10.38C9.63,9.2 10.69,8.25 12,8.25M12,12.65A1.1,1.1 0 0,0 10.9,13.75A1.1,1.1 0 0,0 12,14.85A1.1,1.1 0 0,0 13.1,13.75A1.1,1.1 0 0,0 12,12.65M12,9.5C11.5,9.5 11.1,9.95 11.1,10.5C11.1,11.05 11.5,11.5 12,11.5C12.5,11.5 12.9,11.05 12.9,10.5C12.9,9.95 12.5,9.5 12,9.5M21.54,10.8C22.14,11.5 22.14,12.5 21.54,13.2L13.24,21.5C12.54,22.2 11.54,22.2 10.84,21.5L2.54,13.2C1.84,12.5 1.84,11.5 2.54,10.8L10.84,2.5C11.54,1.8 12.54,1.8 13.24,2.5L21.54,10.8M20.34,12L12.04,3.7L3.74,12L12.04,20.3L20.34,12Z"/></svg>`;
const D10 = `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="mdi-dice-d10-outline" viewBox="0 0 24 24"><path d="M21.5,10.8C22.1,11.5 22.1,12.5 21.5,13.2L13.2,21.5C12.5,22.2 11.5,22.2 10.8,21.5L2.5,13.2C1.8,12.5 1.8,11.5 2.5,10.8L10.8,2.5C11.5,1.8 12.5,1.8 13.2,2.5L21.5,10.8M20.3,12L12,3.7L3.7,12L12,20.3L20.3,12M10.38,15.79H8.88V10L7.08,10.55V9.32L10.22,8.2H10.38V15.79M13.93,8A2.57,2.57 0 0,1 16.5,10.57V13.21C16.5,14.63 15.35,15.78 13.93,15.78C12.5,15.78 11.36,14.63 11.36,13.21V10.57A2.57,2.57 0 0,1 13.93,8M13.92,9.44A1.06,1.06 0 0,0 12.86,10.5V13.27A1.06,1.06 0 0,0 13.92,14.33C14.5,14.33 15,13.85 15,13.27V10.5C15,9.91 14.5,9.44 13.92,9.44Z"/></svg>`;
const D12 = `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="mdi-dice-d12-outline" viewBox="0 0 24 24"><path d="M12,2L1.5,9.64L5.5,22H18.5L22.5,9.64L12,2M17,20H7L3.85,10.4L12,4.47L20.15,10.4L17,20M17,15.75V17H11.66V15.91C11.66,15.91 15.23,12.45 15.23,11.4C15.23,10.12 14.18,10.25 14.18,10.25C13.5,10.3 13,10.87 13,11.55H11.44C11.5,10.09 12.72,8.94 14.27,9C16.74,9 16.77,10.85 16.77,11.3C16.77,13.07 13.58,15.77 13.58,15.77L17,15.75M10.5,17H8.89V10.89L7,11.47V10.19L10.31,9H10.5V17Z"/></svg>`;
const D20 = `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="mdi-dice-d20-outline" viewBox="0 0 24 24"><path d="M21,16.5C21,16.88 20.79,17.21 20.47,17.38L12.57,21.82C12.41,21.94 12.21,22 12,22C11.79,22 11.59,21.94 11.43,21.82L3.53,17.38C3.21,17.21 3,16.88 3,16.5V7.5C3,7.12 3.21,6.79 3.53,6.62L11.43,2.18C11.59,2.06 11.79,2 12,2C12.21,2 12.41,2.06 12.57,2.18L20.47,6.62C20.79,6.79 21,7.12 21,7.5V16.5M12,4.15L5,8.09V15.91L12,19.85L19,15.91V8.09L12,4.15M14.93,8.27A2.57,2.57 0 0,1 17.5,10.84V13.5C17.5,14.9 16.35,16.05 14.93,16.05C13.5,16.05 12.36,14.9 12.36,13.5V10.84A2.57,2.57 0 0,1 14.93,8.27M14.92,9.71C14.34,9.71 13.86,10.18 13.86,10.77V13.53C13.86,14.12 14.34,14.6 14.92,14.6C15.5,14.6 16,14.12 16,13.53V10.77C16,10.18 15.5,9.71 14.92,9.71M11.45,14.76V15.96L6.31,15.93V14.91C6.31,14.91 9.74,11.58 9.75,10.57C9.75,9.33 8.73,9.46 8.73,9.46C8.73,9.46 7.75,9.5 7.64,10.71L6.14,10.76C6.14,10.76 6.18,8.26 8.83,8.26C11.2,8.26 11.23,10.04 11.23,10.5C11.23,12.18 8.15,14.77 8.15,14.77L11.45,14.76Z"/></svg>`;
const D100 = `<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="mdi-percent-outline" viewBox="0 0 24 24"><path d="M18.5 3.5L20.5 5.5L5.5 20.5L3.5 18.5L18.5 3.5M7 4C8.66 4 10 5.34 10 7C10 8.66 8.66 10 7 10C5.34 10 4 8.66 4 7C4 5.34 5.34 4 7 4M17 14C18.66 14 20 15.34 20 17C20 18.66 18.66 20 17 20C15.34 20 14 18.66 14 17C14 15.34 15.34 14 17 14M7 6C6.45 6 6 6.45 6 7C6 7.55 6.45 8 7 8C7.55 8 8 7.55 8 7C8 6.45 7.55 6 7 6M17 16C16.45 16 16 16.45 16 17C16 17.55 16.45 18 17 18C17.55 18 18 17.55 18 17C18 16.45 17.55 16 17 16Z"/></svg>`;

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

export default class DiceView extends ItemView {
    dice: Record<string, DiceRoller> = {
        d4: new DiceRoller(`1d4`),
        d6: new DiceRoller(`1d6`),
        d8: new DiceRoller(`1d8`),
        d10: new DiceRoller(`1d10`),
        d12: new DiceRoller(`1d12`),
        d20: new DiceRoller(`1d20`),
        d100: new DiceRoller(`1d100`)
    };
    gridEl: HTMLDivElement;
    formulaEl: HTMLDivElement;
    constructor(public plugin: DiceRollerPlugin, public leaf: WorkspaceLeaf) {
        super(leaf);
        console.log("Opened Dice View");
        this.containerEl.addClass("dice-roller-view");
    }

    async onOpen() {
        //build ui
        this.display();
    }

    async display() {
        this.contentEl.empty();
        this.gridEl = this.contentEl.createDiv("dice-view-grid");
        this.formulaEl = this.contentEl.createDiv("dice-view-formula");

        this.buildButtons();
        this.buildFormula();
    }

    buildButtons() {
        for (let type in this.dice) {
            const dice = this.dice[type];
            new ExtraButtonComponent(this.gridEl.createDiv("dice-button"))
                .setIcon(type)
                .onClick(async () => {
                    await dice.roll();
                    console.log(dice.result);
                });
        }
    }
    formulaDice: DiceRoller;
    buildFormula() {
        const formula = new TextComponent(this.formulaEl).setPlaceholder(
            "Dice Formula"
        );

        formula.onChange(
            debounce(
                async (v) => {
                    this.formulaDice = new DiceRoller(v);
                    await this.formulaDice.roll();

                    console.log(this.formulaDice.result);
                },
                250,
                true
            )
        );

        new ExtraButtonComponent(this.formulaEl)
            .setIcon(ICON_DEFINITION)
            .setTooltip("Roll")
            .onClick(async () => {
                await this.formulaDice.roll();
                console.log(this.formulaDice.result);
            });
        new ExtraButtonComponent(this.formulaEl)
            .setIcon("dice-roller-save")
            .setTooltip("Save");
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
}
