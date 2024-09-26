import { App, setIcon, Notice } from "obsidian";
import type { LexicalToken } from "src/lexer/lexer";
import { DiceRenderer } from "src/renderer/renderer";
import {
    ButtonPosition,
    type DiceRollerSettings
} from "src/settings/settings.types";
import { ExpectedValue, Round } from "src/types/api";
import { Icons } from "src/utils/icons";
import { Roller, BasicRoller } from "../roller";
import { DiceRoller } from "./dice";
import { PercentRoller } from "./percentage";
import { StuntRoller } from "./stunt";
import { FudgeRoller } from "./fudge";

export class BasicStackRoller extends Roller<number> {
    constructor(
        public original: string | number,
        public lexemes: LexicalToken[]
    ) {
        super();
    }
    declare result: number;
    operators: Record<string, (...args: number[]) => number> = {
        "+": (a: number, b: number): number => a + b,
        "-": (a: number, b: number): number => a - b,
        "*": (a: number, b: number): number => a * b,
        "/": (a: number, b: number): number => a / b,
        "^": (a: number, b: number): number => {
            return Math.pow(a, b);
        }
    };
    stack: DiceRoller[] = [];
    stackCopy: Array<DiceRoller | string> = [];
    stunted: string = "";
    dice: DiceRoller[] = [];
    async roll() {
        return this.rollSync();
    }
    rollSync() {
        this.stunted = "";
        this.parseLexemes();
        const final = this.stack.pop();
        final.rollSync();
        if (final instanceof StuntRoller) {
            if (final.doubles) {
                this.stunted = ` - ${final.results.get(0).value} Stunt Points`;
            }
        }
        this.result = final.result;
        return this.result;
    }
    parseLexemes() {
        let index = 0;
        for (const dice of this.lexemes) {
            switch (dice.type) {
                case "+":
                case "-":
                case "*":
                case "/":
                case "^":
                case "math":
                    let b = this.stack.pop(),
                        a = this.stack.pop();

                    b.rollSync();
                    if (b instanceof StuntRoller) {
                        if (b.doubles) {
                            this.stunted = ` - ${
                                b.results.get(0).value
                            } Stunt Points`;
                        }
                    }

                    a.rollSync();
                    if (a instanceof StuntRoller) {
                        if (a.doubles) {
                            this.stunted = ` - ${
                                a.results.get(0).value
                            } Stunt Points`;
                        }
                    }
                    const result = this.operators[dice.value](
                        a.result,
                        b.result
                    );

                    this.stackCopy.push(dice.value);
                    this.stack.push(new DiceRoller(`${result}`, dice));
                    break;
                case "u": {
                    let diceInstance = this.dice[index - 1];
                    let data = dice.value ? Number(dice.value) : 1;

                    diceInstance.modifiers.set("u", {
                        data,
                        conditionals: [],
                        value: dice.text
                    });
                    break;
                }
                case "kh": {
                    let diceInstance = this.dice[index - 1];
                    let data = dice.value ? Number(dice.value) : 1;

                    diceInstance.modifiers.set("kh", {
                        data,
                        conditionals: [],
                        value: dice.text
                    });
                    break;
                }
                case "dl": {
                    let diceInstance = this.dice[index - 1];
                    let data = dice.value ? Number(dice.value) : 1;

                    data = diceInstance.rolls - data;

                    diceInstance.modifiers.set("kh", {
                        data,
                        conditionals: [],
                        value: dice.text
                    });
                    break;
                }
                case "kl": {
                    let diceInstance = this.dice[index - 1];
                    let data = dice.value ? Number(dice.value) : 1;

                    diceInstance.modifiers.set("kl", {
                        data,
                        conditionals: [],
                        value: dice.text
                    });
                    break;
                }
                case "dh": {
                    let diceInstance = this.dice[index - 1];
                    let data = dice.value ? Number(dice.value) : 1;

                    data = diceInstance.rolls - data;

                    diceInstance.modifiers.set("kl", {
                        data,
                        conditionals: [],
                        value: dice.text
                    });
                    break;
                }
                case "!": {
                    let diceInstance = this.dice[index - 1];
                    let data = Number(dice.value) || 1;

                    diceInstance.modifiers.set("!", {
                        data,
                        conditionals: dice.conditions ?? [],
                        value: dice.text
                    });

                    break;
                }
                case "!!": {
                    let diceInstance = this.dice[index - 1];
                    let data = Number(dice.value) || 1;

                    diceInstance.modifiers.set("!!", {
                        data,
                        conditionals: dice.conditions ?? [],
                        value: dice.text
                    });

                    break;
                }
                case "r": {
                    let diceInstance = this.dice[index - 1];
                    let data = Number(dice.value) || 1;

                    diceInstance.modifiers.set("r", {
                        data,
                        conditionals: dice.conditions ?? [],
                        value: dice.text
                    });
                    break;
                }
                case "sort": {
                    let diceInstance = this.dice[index - 1];
                    let data = Number(dice.value);

                    diceInstance.modifiers.set("sort", {
                        data,
                        conditionals: dice.conditions ?? [],
                        value: dice.value
                    });
                    break;
                }
                case "dice": {
                    if (
                        dice.parenedDice &&
                        /^d/.test(dice.value) &&
                        this.stack.length
                    ) {
                        const previous = this.stack.pop();
                        dice.value = `${previous.result}${dice.value}`;
                        this.dice[index] = new DiceRoller(dice.value, dice);
                    }
                    if (!this.dice[index]) {
                        this.dice[index] = new DiceRoller(dice.value, dice);
                    }

                    this.stack.push(this.dice[index]);
                    this.stackCopy.push(this.dice[index]);
                    index++;
                    break;
                }
                case "fudge": {
                    if (!this.dice[index]) {
                        this.dice[index] = new FudgeRoller(dice.value, dice);
                    }

                    this.stack.push(this.dice[index]);
                    this.stackCopy.push(this.dice[index]);
                    index++;
                    break;
                }
                case "stunt": {
                    if (!this.dice[index]) {
                        this.dice[index] = new StuntRoller(dice.value, dice);
                    }

                    this.stack.push(this.dice[index]);
                    this.stackCopy.push(this.dice[index]);
                    index++;
                    break;
                }

                case "%": {
                    if (!this.dice[index]) {
                        this.dice[index] = new PercentRoller(dice.value, dice);
                    }

                    this.stack.push(this.dice[index]);
                    this.stackCopy.push(this.dice[index]);
                    index++;
                    break;
                }
            }
        }
    }
}

export class StackRoller extends BasicRoller<number> {
    onunload(): void {
        if (this.isRendering) {
            DiceRenderer.unrender();
        }
        super.onunload();
    }
    result: number;
    fixedText: string;
    displayFixedText: boolean = false;
    expectedValue: ExpectedValue;
    round: Round;
    signed: boolean;
    showRenderNotice: boolean;
    async getReplacer() {
        let inline = this.showFormula ? `${this.inlineText} ` : "";
        return `${inline}${this.result}`;
    }
    stunted: string = "";
    private _tooltip: string;
    shouldRender: boolean = false;
    isRendering: boolean = false;
    showFormula: boolean = false;
    get resultText() {
        let text: string[] = [];
        let index = 0;
        this.dice.forEach((dice) => {
            const slice = this.original.slice(index);
            text.push(
                slice.slice(0, slice.indexOf(dice.lexeme.text)),
                dice.display
            );

            index +=
                slice.indexOf(dice.lexeme.text) +
                dice.lexeme.text.length +
                dice.modifierText.length;
        });
        text.push(this.original.slice(index));
        return text.join("");
    }
    get tooltip() {
        if (this.isRendering) {
            return this.original;
        }
        if (this._tooltip) return this._tooltip;
        if (this.expectedValue === ExpectedValue.Roll || this.shouldRender) {
            if (this.displayFixedText) {
                return `${this.original}\n${this.result} = ${this.resultText}`;
            }
            return `${this.original}\n${this.resultText}`;
        }
        if (this.expectedValue === ExpectedValue.Average) {
            if (this.displayFixedText) {
                return `${this.original}\n${this.result} = average: ${this.resultText}`;
            }
            return `${this.original}\naverage: ${this.resultText}`;
        }

        return `${this.original}\nempty`;
    }
    allowAverage(): boolean {
        return this.dynamic.every((roller: DiceRoller) =>
            roller.allowAverage()
        );
    }
    async build() {
        this.resultEl.empty();
        if (
            this.expectedValue === ExpectedValue.Average &&
            !this.shouldRender
        ) {
            if (this.allowAverage()) {
                for (let roller of this.dynamic) {
                    const avg: number = roller.average();
                    const results = new Map();
                    for (let index = 0; index < roller.rolls; index++) {
                        results.set(index, avg);
                    }
                    roller.setResults(results);
                }
                this.calculate();
            } else {
                this.expectedValue = ExpectedValue.Roll;
            }
            this.result = Math.floor(this.result);
            this.setTooltip();
        }

        let rounded = this.result;

        switch (this.round) {
            case Round.None: {
                rounded = Math.trunc(rounded * 100) / 100;
                break;
            }
            case Round.Normal: {
                rounded = Math.round(rounded);
                break;
            }
            case Round.Up: {
                rounded = Math.ceil(rounded);
                break;
            }
            case Round.Down: {
                rounded = Math.floor(rounded);
                break;
            }
        }
        let sign = this.signed && rounded > 0 ? "+" : "";
        let result;
        if (this.expectedValue === ExpectedValue.None && !this.shouldRender) {
            if (this.position != ButtonPosition.NONE) {
                result = [""];
            } else {
                result = ["\xa0"];
            }
            if (this.showFormula) {
                result.unshift(this.original + " -> ");
            }
        } else {
            result = [`${sign}${rounded}`];
            if (this.showFormula) {
                result.unshift(this.inlineText);
            }
        }

        this.expectedValue = ExpectedValue.Roll;

        if (this.displayFixedText) {
            this.resultEl.setText(this.fixedText);
        } else {
            this.resultEl.setText(result.join("") + this.stunted);
        }

        if (this.result === this.max) {
            this.containerEl.addClass("is-max");
        } else {
            this.containerEl.removeClass("is-max");
        }
        if (this.result === this.min) {
            this.containerEl.addClass("is-min");
        } else {
            this.containerEl.removeClass("is-min");
        }
    }
    async onClick(evt: MouseEvent) {
        evt.stopPropagation();
        evt.stopImmediatePropagation();
        if (evt.getModifierState("Alt")) {
            this.expectedValue = ExpectedValue.Average;
        } else if (evt.getModifierState("Control")) {
            this.expectedValue = ExpectedValue.None;
        }
        if (evt.getModifierState("Shift")) {
            await this.roll(true);
            this.hasRunOnce = true;
        } else if (window.getSelection()?.isCollapsed) {
            await this.roll();
        }
    }
    get dynamic() {
        return this.dice.filter((d) => !d.static);
    }
    get static() {
        return this.dice.filter((d) => d.static);
    }

    get isStatic() {
        return this.dice.every((d) => d.static);
    }

    constructor(
        public data: DiceRollerSettings,
        public original: string,
        public lexemes: LexicalToken[],
        public app: App,
        position = data.position,
        fixedText: string,
        expectedValue = data.initialDisplay,
        displayFormulaAfter = data.displayFormulaAfter,
        round = data.round,
        signed = data.signed
    ) {
        super(data, original, lexemes, position);

        if (displayFormulaAfter) {
            this.containerEl.createSpan({
                cls: "dice-roller-formula",
                text: `(${original})`
            });
        }

        this.fixedText = fixedText;
        this.expectedValue = expectedValue;
        this.displayFixedText = this.fixedText !== "";
        this.round = round;
        this.signed = signed;
        this.loaded = true;
        this.trigger("loaded");
    }
    operators: Record<string, (...args: number[]) => number> = {
        "+": (a: number, b: number): number => a + b,
        "-": (a: number, b: number): number => a - b,
        "*": (a: number, b: number): number => a * b,
        "/": (a: number, b: number): number => a / b,
        "^": (a: number, b: number): number => {
            return Math.pow(a, b);
        }
    };
    stack: DiceRoller[] = [];
    maxStack: number[] = [];
    minStack: number[] = [];
    stackCopy: Array<DiceRoller | string> = [];
    dice: DiceRoller[] = [];
    hasRunOnce = false;
    rollSync() {
        this.stunted = "";
        this.buildDiceTree();
        for (const dice of this.dice) {
            dice.rollSync();
        }
        this.calculate();
        this._tooltip = null;
        this.render();

        this.trigger("new-result");
        this.hasRunOnce = true;
        return this.result;
    }
    setSpinner() {
        this.resultEl.empty();
        setIcon(this.resultEl.createDiv("should-spin"), Icons.LOADING);
    }
    async renderDice() {
        this.isRendering = true;
        this.setTooltip();
        this.setSpinner();
        const promises = [];
        for (const die of this.dice) {
            promises.push(
                new Promise<void>(async (resolve) => {
                    await die.render();
                    resolve();
                })
            );
        }
        await Promise.all(promises);

        this.isRendering = false;
        this.setTooltip();
    }
    buildDiceTree() {
        let index = 0;
        for (const dice of this.lexemes) {
            switch (dice.type) {
                case "+":
                case "*":
                case "/":
                case "^":
                case "-":
                case "math": {
                    continue;
                }
                case "u": {
                    let diceInstance = this.dice[index - 1];
                    let data = dice.value ? Number(dice.value) : 1;

                    diceInstance.modifiers.set("u", {
                        data,
                        conditionals: [],
                        value: dice.text
                    });
                    break;
                }
                case "kh": {
                    let diceInstance = this.dice[index - 1];
                    let data = dice.value ? Number(dice.value) : 1;

                    diceInstance.modifiers.set("kh", {
                        data,
                        conditionals: [],
                        value: dice.text
                    });
                    break;
                }
                case "dl": {
                    let diceInstance = this.dice[index - 1];
                    let data = dice.value ? Number(dice.value) : 1;

                    data = diceInstance.rolls - data;

                    diceInstance.modifiers.set("kh", {
                        data,
                        conditionals: [],
                        value: dice.text
                    });
                    break;
                }
                case "kl": {
                    let diceInstance = this.dice[index - 1];
                    let data = dice.value ? Number(dice.value) : 1;

                    diceInstance.modifiers.set("kl", {
                        data,
                        conditionals: [],
                        value: dice.text
                    });
                    break;
                }
                case "dh": {
                    let diceInstance = this.dice[index - 1];
                    let data = dice.value ? Number(dice.value) : 1;

                    data = diceInstance.rolls - data;

                    diceInstance.modifiers.set("kl", {
                        data,
                        conditionals: [],
                        value: dice.text
                    });
                    break;
                }
                case "!": {
                    let diceInstance = this.dice[index - 1];
                    let data = Number(dice.value) || 1;

                    diceInstance.modifiers.set("!", {
                        data,
                        conditionals: dice.conditions ?? [],
                        value: dice.text
                    });

                    break;
                }
                case "!!": {
                    let diceInstance = this.dice[index - 1];
                    let data = Number(dice.value) || 1;

                    diceInstance.modifiers.set("!!", {
                        data,
                        conditionals: dice.conditions ?? [],
                        value: dice.text
                    });

                    break;
                }
                case "r": {
                    let diceInstance = this.dice[index - 1];
                    let data = Number(dice.value) || 1;

                    diceInstance.modifiers.set("r", {
                        data,
                        conditionals: dice.conditions ?? [],
                        value: dice.text
                    });
                    break;
                }
                case "sort": {
                    let diceInstance = this.dice[index - 1];
                    let data = Number(dice.value);

                    diceInstance.modifiers.set("sort", {
                        data,
                        conditionals: dice.conditions ?? [],
                        value: dice.value
                    });
                    break;
                }
                case "dice": {
                    if (
                        dice.parenedDice &&
                        /^d/.test(dice.value) &&
                        this.stack.length
                    ) {
                        const previous = this.stack.pop();
                        dice.value = `${previous.result}${dice.value}`;
                        this.dice[index] = new DiceRoller(dice.value, dice);
                    }
                    if (!this.dice[index]) {
                        this.dice[index] = new DiceRoller(dice.value, dice);
                    }

                    index++;
                    break;
                }

                case "fudge": {
                    if (!this.dice[index]) {
                        this.dice[index] = new FudgeRoller(dice.value, dice);
                    }
                    index++;
                    break;
                }
                case "stunt": {
                    if (!this.dice[index]) {
                        this.dice[index] = new StuntRoller(dice.value, dice);
                    }
                    index++;
                    break;
                }

                case "%": {
                    if (!this.dice[index]) {
                        this.dice[index] = new PercentRoller(dice.value, dice);
                    }
                    index++;
                    break;
                }
            }
        }
    }
    async roll(render?: boolean) {
        this.stunted = "";
        this.stackCopy = [];
        if (!this.dice.length) {
            this.buildDiceTree();
        }
        DiceRenderer.stop();
        this.dice.forEach((dice) => (dice.shouldRender = false));
        if (render || (this.shouldRender && this.hasRunOnce)) {
            await this.renderDice();
        } else {
            for (const dice of this.dice) {
                await dice.roll();
            }
        }
        this.calculate();
        this.render();

        if (
            this.showRenderNotice &&
            (render || (this.shouldRender && this.hasRunOnce))
        ) {
            new Notice(`${this.tooltip}\n\nResult: ${this.result}`);
        }

        this.trigger("new-result");
        this.app.workspace.trigger("dice-roller:new-result", this);
        this.hasRunOnce = true;
        return this.result;
    }
    max = Number.MIN_VALUE;
    min = Number.MAX_VALUE;
    calculate() {
        let index = 0;
        for (const dice of this.lexemes) {
            switch (dice.type) {
                case "+":
                case "-":
                case "*":
                case "/":
                case "^":
                case "math": {
                    let b = this.stack.pop(),
                        a = this.stack.pop();

                    if (b instanceof StuntRoller) {
                        if (b.doubles) {
                            this.stunted = ` - ${
                                b.results.get(0).value
                            } Stunt Points`;
                        }
                    }
                    if (a instanceof StuntRoller) {
                        if (a.doubles) {
                            this.stunted = ` - ${
                                a.results.get(0).value
                            } Stunt Points`;
                        }
                    }
                    const result = this.operators[dice.value](
                        a.result,
                        b.result
                    );

                    const min = this.operators[dice.value](
                        this.minStack.pop(),
                        this.minStack.pop()
                    );
                    const max = this.operators[dice.value](
                        this.maxStack.pop(),
                        this.maxStack.pop()
                    );

                    this.stackCopy.push(dice.value);
                    this.stack.push(new DiceRoller(`${result}`, dice));
                    this.minStack.push(min);
                    this.maxStack.push(max);
                    break;
                }
                case "stunt":
                case "fudge":
                case "%":
                case "dice": {
                    this.stack.push(this.dice[index]);
                    this.stackCopy.push(this.dice[index]);
                    this.minStack.push(this.dice[index].getMinPossible());
                    this.maxStack.push(this.dice[index].getMaxPossible());
                    index++;
                }
                default: {
                    continue;
                }
            }
        }
        const final = this.stack.pop();
        this.min = this.minStack.pop();
        this.max = this.maxStack.pop();
        if (final instanceof StuntRoller) {
            if (final.doubles) {
                this.stunted = ` - ${final.stunt.result} Stunt Points`;
            }
        }
        this.result = final.result;
    }
}
