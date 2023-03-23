import { Notice } from "obsidian";
import type DiceRollerPlugin from "src/main";
import { LexicalToken } from "src/parser/lexer";
import {
    ResultMapInterface,
    Conditional,
    Round,
    ExpectedValue,
    ResultInterface
} from "src/types";
import { _insertIntoMap } from "src/utils/util";
import { GenericRoller } from "./roller";

interface Modifier {
    conditionals: Conditional[];
    data: number;
    value: string;
}

export class DiceRoller {
    dice: string;
    modifiers: Map<string, Modifier> = new Map();
    rolls: number;
    faces: { min: number; max: number };
    results: ResultMapInterface<number>;
    resultArray: number[];
    modifiersAllowed: boolean = true;
    static: boolean = false;
    conditions: Conditional[] = [];
    multiplier: number;
    fudge: boolean = false;
    get text() {
        return `${this.result}`;
    }
    get result() {
        if (this.static) {
            return Number(this.dice);
        }
        const results = [...this.results].map(([, { usable, value }]) =>
            usable ? value : 0
        );
        return results.reduce((a, b) => a + b, 0);
    }
    get display() {
        if (this.static) {
            return `${this.result}`;
        }
        return `[${[...this.results]
            .map(
                ([, { modifiers, display }]) =>
                    `${display}${[...modifiers].join("")}`
            )
            .join(", ")}]`;
    }
    get modifierText() {
        if (!this.modifiers.size) return "";
        const conditionals = [...this.conditions]
            .map(({ value }) => value)
            .join("");
        const modifiers = [...this.modifiers]
            .map(([_, { conditionals, value }]) => {
                const conditional = conditionals.map(
                    (conditional) => conditional.value
                );
                return `${value}${conditional.join("")}`;
            })
            .join("");
        return `${conditionals}${modifiers}`;
    }
    constructor(
        dice: string,
        public lexeme: Partial<LexicalToken> = {
            value: dice,
            conditions: [],
            type: "dice"
        }
    ) {
        if (!/(\-?\d+)[dD]?(\d+|%|\[\d+,\s?\d+\])?/.test(dice)) {
            throw new Error("Non parseable dice string passed to DiceRoll.");
        }
        this.dice = dice.split(" ").join("");

        if (/^-?\d+(?:\.\d+)?$/.test(this.dice)) {
            this.static = true;
            this.modifiersAllowed = false;
        }
        let [, rolls, minStr = null, maxStr = 1] = this.dice.match(
            /(\-?\d+)[dD]\[?(?:(-?\d+)\s?,)?\s?(-?\d+|%|F)\]?/
        ) || [, 1, null, 1];

        rolls = Number(rolls);

        this.multiplier = rolls < 0 ? -1 : 1;
        let min = isNaN(Number(minStr)) ? null : Number(minStr);
        let max: number;
        this.rolls = Math.abs(Number(rolls)) || 1;

        if (maxStr === "%") {
            max = 100;
        } else if (maxStr === "F") {
            max = 1;
            min = -1;
            this.fudge = true;
        } else {
            max = Number(maxStr);
        }
        if (Number(max) < 0 && !min) {
            min = -1;
        }
        if (Number(max) < Number(min)) {
            [max, min] = [min, max];
        }

        this.faces = { max: max ? Number(max) : 1, min: min ? Number(min) : 1 };

        this.conditions = this.lexeme.conditions ?? [];

        this.roll();
    }
    keepLow(drop: number = 1) {
        if (!this.modifiersAllowed) {
            new Notice("Modifiers are only allowed on dice rolls.");
            return;
        }
        /* if (this.conditions?.length) {
            new Notice("Modifiers are not permitted on conditioned dice.");
            return;
        } */

        [...this.results]
            .sort((a, b) => a[1].value - b[1].value)
            .slice(drop - this.results.size)
            .forEach(([index]) => {
                const previous = this.results.get(index);
                previous.usable = false;
                previous.modifiers.add("d");
                this.results.set(index, { ...previous });
            });
    }
    keepHigh(drop: number = 1) {
        if (!this.modifiersAllowed) {
            new Notice("Modifiers are only allowed on dice rolls.");
            return;
        }
        /* if (this.conditions?.length) {
            new Notice("Modifiers are not permitted on conditioned dice.");
            return;
        } */
        [...this.results]
            .sort((a, b) => b[1].value - a[1].value)
            .slice(drop)
            .forEach(([index]) => {
                const previous = this.results.get(index);
                previous.usable = false;
                previous.modifiers.add("d");
                this.results.set(index, { ...previous });
            });
    }
    reroll(times: number, conditionals: Conditional[]) {
        if (!this.modifiersAllowed) {
            new Notice("Modifiers are only allowed on dice rolls.");
            return;
        }
        /* if (this.conditions?.length) {
            new Notice("Modifiers are not permitted on conditioned dice.");
            return;
        } */
        /**
         * Build Conditional
         */
        if (!conditionals.length) {
            conditionals.push({
                operator: "=",
                comparer: this.faces.min,
                value: ""
            });
        }

        /**
         * Find values that pass the conditional.
         */
        let i = 0,
            toReroll = [...this.results].filter(([, { value }]) =>
                this.checkCondition(value, conditionals)
            );
        while (
            i < times &&
            toReroll.filter(([, { value }]) =>
                this.checkCondition(value, conditionals)
            ).length > 0
        ) {
            i++;
            toReroll.map(([, roll]) => {
                roll.modifiers.add("r");
                roll.value = this.getValue();
            });
        }

        toReroll.forEach(([index, value]) => {
            this.results.set(index, value);
        });
    }
    explodeAndCombine(times: number, conditionals: Conditional[]) {
        if (!this.modifiersAllowed) {
            new Notice("Modifiers are only allowed on dice rolls.");
            return;
        }

        /**
         * Build Conditional
         */
        if (!conditionals.length) {
            conditionals.push({
                operator: "=",
                comparer: this.faces.max,
                value: ""
            });
        }

        /**
         * Find values that pass the conditional
         */
        let toExplode = [...this.results].filter(([, { value }]) =>
            this.checkCondition(value, conditionals)
        );

        toExplode.forEach(([index, value]) => {
            let newRoll = this.getValue();
            let i = 0;
            value.modifiers.add("!");
            value.value += newRoll;
            value.display = `${value.value}`;
            this.results.set(index, value);
            while (i < times && this.checkCondition(newRoll, conditionals)) {
                i++;
                newRoll = this.getValue();
                value.value += newRoll;
                value.display = `${value.value}`;
                this.results.set(index, value);
            }
        });
    }
    explode(times: number, conditionals: Conditional[]) {
        if (!this.modifiersAllowed) {
            new Notice("Modifiers are only allowed on dice rolls.");
            return;
        }
        /* if (this.conditions?.length) {
            new Notice("Modifiers are not permitted on conditioned dice.");
            return;
        } */

        /**
         * Build Conditional
         */
        if (!conditionals.length) {
            conditionals.push({
                operator: "=",
                comparer: this.faces.max,
                value: ""
            });
        }

        /**
         * Find values that pass the conditional
         */
        let toExplode = [...this.results].filter(([, { value }]) =>
            this.checkCondition(value, conditionals)
        );

        /** Track how many have been inserted */
        let inserted = 0;

        /** Loop through values that need to explode */
        toExplode.forEach(([key, value]) => {
            /** newRoll is the new value to check against the max face value */
            let newRoll = value.value;
            /** i tracks how many times this roll has been exploded */
            let i = 0;

            /**
             * Explode max rolls.
             */
            while (i < times && this.checkCondition(newRoll, conditionals)) {
                let previous = this.results.get(key + inserted + i);
                previous.modifiers.add("!");

                newRoll = this.getValue();

                /** Insert the new roll into the results map */
                _insertIntoMap(this.results, key + inserted + i + 1, {
                    usable: true,
                    value: newRoll,
                    display: `${newRoll}`,
                    modifiers: new Set()
                });
                i++;
            }
            /** Update how many have been inserted. */
            inserted += i;
        });
    }
    _roll(): number[] {
        if (this.static) {
            return [Number(this.dice)];
        }
        return [...Array(this.rolls)].map(() => this.getValue());
    }
    getValue() {
        return (
            this.multiplier *
            this.getRandomBetween(this.faces.min, this.faces.max)
        );
    }
    setResults(results: number[]) {
        this.results = new Map(
            [...results].map((n, i) => {
                return [
                    i,
                    {
                        usable: true,
                        value: n,
                        display: `${n}`,
                        modifiers: new Set()
                    }
                ];
            })
        );
        this.updateResultArray();
    }
    applyModifiers() {
        //uniques need to run first otherwise its a total headache
        /* if (this.modifiers.has("u")) {
            this.applyModifier("u", this.modifiers.get("u"));
            this.modifiers.delete("u");
        } */
        for (let [type, modifier] of this.modifiers) {
            /* if (type === "u") continue; */
            this.applyModifier(type, modifier);
        }
    }
    roll() {
        const roll = this._roll();
        this.setResults(roll);
        this.applyModifiers();
        if (this.conditions?.length) this.applyConditions();

        return roll;
    }
    applyConditions() {
        for (let [index, result] of this.results) {
            const negate = this.conditions.find(
                ({ operator }) => operator === "-=" || operator === "=-"
            );
            if (negate) {
                if (result.value === negate.comparer) {
                    result.value = -1;
                    result.modifiers.add("-");
                    continue;
                }
            }

            const check = this.checkCondition(result.value, this.conditions);

            if (!check) {
                result.usable = false;
            } else {
                result.modifiers.add("*");
                result.value = 1;
            }
        }
    }
    updateResultArray() {
        this.resultArray = [...this.results.values()].map((v) => v.value);
    }
    applyModifier(type: string, modifier: Modifier) {
        switch (type) {
            case "sort": {
                let values: ResultInterface<number>[];
                //true = asc
                if (modifier.value == "sa") {
                    values = [...this.results.values()].sort(
                        (a, b) => a.value - b.value
                    );
                } else {
                    values = [...this.results.values()].sort(
                        (a, b) => b.value - a.value
                    );
                }
                this.results = new Map(
                    [...this.results.keys()].map((k) => [k, values[k]])
                );
                this.updateResultArray();
                break;
            }
            case "kh": {
                this.keepHigh(modifier.data);
                break;
            }
            case "kl": {
                this.keepLow(modifier.data);
                break;
            }
            case "!": {
                this.explode(modifier.data, modifier.conditionals);
                break;
            }
            case "!!": {
                this.explodeAndCombine(modifier.data, modifier.conditionals);
                break;
            }
            case "r": {
                this.reroll(modifier.data, modifier.conditionals);
                break;
            }
            case "u": {
                this.makeUnique();
                break;
            }
            case "condition": {
            }
        }
    }

    makeUnique() {
        let resultValues = [...this.results.values()];
        if (
            this.faces.max - this.faces.min + 1 < this.rolls ||
            new Set(resultValues.map((v) => v.value)).size == this.results.size
        )
            return;
        let attempts = 0;
        while (
            new Set(resultValues.map((v) => v.value)).size !=
                this.results.size &&
            attempts < 100
        ) {
            for (const result of resultValues) {
                let dupe = resultValues.find(
                    (v) => v.value == result.value && v != result
                );
                if (dupe) {
                    dupe.value = this.getValue();
                    dupe.display = `${dupe.value}`;
                    dupe.modifiers.add("u");
                }
            }

            resultValues = [...this.results.values()];
            attempts++;
        }
    }
    checkCondition(value: number, conditions: Conditional[]): boolean | number {
        if (!conditions || !conditions.length) return value;
        return conditions.some(({ operator, comparer }) => {
            if (Number.isNaN(value) || Number.isNaN(comparer)) {
                return false;
            }
            let result = false;
            switch (operator) {
                case "=":
                    result = value === comparer;
                    break;
                case "!=":
                case "=!":
                    result = value !== comparer;
                    break;
                case "<":
                    result = value < comparer;
                    break;
                case "<=":
                    result = value <= comparer;
                    break;
                case ">":
                    result = value > comparer;
                    break;
                case ">=":
                    result = value >= comparer;
                    break;
            }

            return result;
        });
    }
    allowAverage(): boolean {
        return true;
    }
    average(): number {
        return (this.faces.min + this.faces.max) / 2;
    }
    getRandomBetween(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}

class StuntRoller extends DiceRoller {
    constructor(public dice: string, public lexeme: LexicalToken) {
        super(`3d6`, lexeme);
    }
    get doubles() {
        return (
            new Set(
                [...this.results].map(([, { usable, value }]) =>
                    usable ? value : 0
                )
            ).size < 3
        );
    }
    get result() {
        if (this.static) {
            return Number(this.dice);
        }
        const results = [...this.results].map(([, { usable, value }]) =>
            usable ? value : 0
        );
        return results.reduce((a, b) => a + b, 0);
    }
    get display() {
        let str: string[] = [];
        for (let result of this.results) {
            if (result[0] == 0 && this.doubles) {
                str.push(`${result[1].value}S`);
                continue;
            }
            str.push(`${result[1].value}`);
        }
        return `[${str.join(", ")}]`;
    }
    allowAverage(): boolean {
        return false;
    }
}

export class PercentRoller extends DiceRoller {
    stack: DiceRoller[][] = [];
    constructor(public dice: string, public lexeme: LexicalToken) {
        super(dice, lexeme);
        const faces = `${this.faces.max}`.split("");
        for (let i = 0; i < this.rolls; i++) {
            const stack = [];
            for (const face of faces) {
                const roller = new DiceRoller(`1d${face}`);
                stack.push(roller);
                roller.roll();
            }
            this.stack.push(stack);
        }
    }
    get result() {
        return this.stack
            .map((stack) => Number(stack.map((dice) => dice.result).join("")))
            .reduce((a, b) => a + b);
    }
    get display() {
        return this.stack
            .map((stack) => stack.map((v) => v.result).join(","))
            .join("|");
    }
    roll() {
        if (!this.stack || !this.stack.length) return super.roll();
        this.stack.forEach((stack) => stack.map((dice) => dice.roll()));
        return [
            ...this.stack
                .map((stack) => stack.map((dice) => dice.result))
                .flat()
        ];
    }
    allowAverage(): boolean {
        return false;
    }
}

export class StackRoller extends GenericRoller<number> {
    result: number;
    fixedText: string;
    displayFixedText: boolean = false;
    expectedValue: ExpectedValue;
    get replacer() {
        return `${this.result}`;
    }
    stunted: string = "";
    private _tooltip: string;
    shouldRender: boolean = false;
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
        const avgAllowed = (roller: DiceRoller) => roller.allowAverage();
        return this.dynamic.every(avgAllowed);
    }
    async build() {
        if (
            this.expectedValue === ExpectedValue.Average &&
            !this.shouldRender
        ) {
            if (this.allowAverage()) {
                for (let roller of this.dynamic) {
                    const avg: number = roller.average();
                    var results = Array(roller.rolls).fill(avg);
                    roller.setResults(results);
                    this.recalculate();
                }
            } else {
                this.expectedValue = ExpectedValue.Roll;
            }
            this.result = Math.floor(this.result);
            this.setTooltip();
        }

        let rounded = this.result;

        switch (this.plugin.data.round) {
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

        let result;
        if (this.expectedValue === ExpectedValue.None && !this.shouldRender) {
            if (this.showDice) {
                result = [""];
            } else {
                result = ["\xa0"];
            }
            if (this.showFormula) {
                result.unshift(this.original + " -> ");
            }
        } else {
            result = [`${rounded}`];
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
            await this.plugin.renderRoll(this);
            this.render();
            this.trigger("new-result");
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
        public plugin: DiceRollerPlugin,
        public original: string,
        public lexemes: LexicalToken[],
        showDice = plugin.data.showDice,
        fixedText: string,
        expectedValue: ExpectedValue,
        displayFormulaAfter = plugin.data.displayFormulaAfter
    ) {
        super(plugin, original, lexemes, showDice);

        if (displayFormulaAfter) {
            this.containerEl.createSpan({
                cls: "dice-roller-formula",
                text: `(${original})`
            });
        }

        this.fixedText = fixedText;
        this.expectedValue = expectedValue;
        this.displayFixedText = this.fixedText !== "";
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
    stackCopy: Array<DiceRoller | string> = [];
    dice: DiceRoller[] = [];
    hasRunOnce = false;
    rollSync() {
        this.stunted = "";
        this.parseLexemes();
        const final = this.stack.pop();
        final.roll();
        if (final instanceof StuntRoller) {
            if (final.doubles) {
                this.stunted = ` - ${final.results.get(0).value} Stunt Points`;
            }
        }
        this.result = final.result;
        this._tooltip = null;
        this.render();

        this.trigger("new-result");
        this.hasRunOnce = true;
        return this.result;
    }
    async roll(render?: boolean) {
        this.stunted = "";
        this.stackCopy = [];
        this.parseLexemes();
        if (render || (this.shouldRender && this.hasRunOnce)) {
            await this.plugin.renderRoll(this);
            new Notice(`${this.tooltip}\n\nResult: ${this.result}`);
        } else {
            const final = this.stack.pop();
            final.roll();
            if (final instanceof StuntRoller) {
                if (final.doubles) {
                    this.stunted = ` - ${
                        final.results.get(0).value
                    } Stunt Points`;
                }
            }
            this.result = final.result;
            this._tooltip = null;
        }

        this.render();

        this.trigger("new-result");
        this.hasRunOnce = true;
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
                    if (!a) {
                        if (dice.value === "-") {
                            b = new DiceRoller(`-${b.dice}`, b.lexeme);
                        }
                        this.stackCopy.push(dice.value);
                        this.stack.push(b);
                        continue;
                    }

                    b.roll();
                    if (b instanceof StuntRoller) {
                        if (b.doubles) {
                            this.stunted = ` - ${
                                b.results.get(0).value
                            } Stunt Points`;
                        }
                    }

                    a.roll();
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

                    data = diceInstance.results.size - data;

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

                    data = diceInstance.results.size - data;

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

    recalculate() {
        let stack = [];
        let result = 0;
        if (!this.stackCopy.length) {
            return this.roll();
        }
        for (let item of this.stackCopy) {
            if (typeof item === "string") {
                let b: DiceRoller = stack.pop(),
                    a = stack.pop();

                if (!a) {
                    if (item === "-") {
                        b = new DiceRoller(`-${b.result}`, b.lexeme);
                    }
                    stack.push(b);
                    continue;
                }

                const r = this.operators[item](a.result, b.result);
                stack.push(new DiceRoller(`${r}`));
            } else {
                stack.push(item);
                if (
                    item instanceof DiceRoller &&
                    this.stackCopy.indexOf(item) != this.stackCopy.length - 1
                ) {
                    item.applyModifiers();
                }
            }
        }
        if (stack.length && stack[0] instanceof DiceRoller) {
            stack[0].applyModifiers();
            result += stack[0].result;
        }

        this.result = result;
        this.stackCopy = [];
        this.render();
    }

    toResult() {
        return {
            type: "dice",
            result: this.result,
            tooltip: this.tooltip
        };
    }
    async applyResult(result: any) {
        if (result.type !== "dice") return;
        if (result.result) {
            this.result = result.result;
        }
        if (result.tooltip) {
            this._tooltip = result.tooltip;
        }
        await this.render();
    }
    setResult(result: number[]) {}
}
