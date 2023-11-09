import { Notice, setIcon } from "obsidian";
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
import { GenericRoller, Roller } from "./roller";
import DiceRenderer from "src/renderer/renderer";
import { DiceShape } from "src/renderer/shapes";

interface Modifier {
    conditionals: Conditional[];
    data: number;
    value: string;
}

type ModifierType = "sort" | "kh" | "kl" | "!" | "!!" | "r" | "u";

export class DiceRoller {
    constructor(
        dice: string | number,
        public renderer: DiceRenderer | null,
        public lexeme: Partial<LexicalToken> = {
            value: `${dice}`,
            conditions: [],
            type: "dice"
        }
    ) {
        if (!/(\-?\d+)[dD]?(\d+|%|\[\d+,\s?\d+\])?/.test(`${dice}`)) {
            throw new Error("Non parseable dice string passed to DiceRoll.");
        }
        this.dice = `${dice}`.split(" ").join("");

        if (/^-?\d+(?:\.\d+)?$/.test(this.dice)) {
            this.static = true;
            this.modifiersAllowed = false;
        }
        let [, rolls, maxStr = "1"] = this.dice.match(
            /(\-?\d+)[dD](%|F|-?\d+|\[\d+(?:[ \t]*,[ \t]*\d+)+\])/
        ) || [, 1, "1"];

        rolls = Number(rolls);

        this.multiplier = rolls < 0 ? -1 : 1;
        let min = 1;
        let max = isNaN(Number(maxStr)) ? 1 : Number(maxStr);
        this.rolls = Math.abs(Number(rolls)) || 1;

        //ugly af
        if (/\[\d+(?:[ \t]*,[ \t]*\d+)+\]/.test(maxStr)) {
            this.possibilities = maxStr
                .replace(/[\[\]\s]/g, "")
                .split(",")
                .map((v) => Number(v));
        } else if (maxStr === "F") {
            this.possibilities = [-1, 0, 1];
            this.fudge = true;
        } else {
            if (maxStr === "%") {
                max = 100;
            } else {
                max = Number(maxStr);
            }
            if (Number(max) < 0 && !min) {
                min = -1;
            }
            if (Number(max) < Number(min)) {
                [max, min] = [min, max];
            }

            this.possibilities = [...Array(Number(max)).keys()].map(
                (k) => k + min
            );
        }
        this.conditions = this.lexeme.conditions ?? [];
    }
    dice: string;
    modifiers: Map<ModifierType, Modifier> = new Map();
    rolls: number;
    possibilities: number[] = [];
    get faces() {
        return {
            max: this.possibilities[this.possibilities.length - 1],
            min: this.possibilities[0]
        };
    }
    results: ResultMapInterface<number> = new Map();
    shapes: Map<number, DiceShape[]> = new Map();
    getShapes(index?: number) {
        if (this.shapes.has(index)) {
            return this.shapes.get(index);
        }
        const shapes = this.renderer.getDiceForRoller(this);
        if (index != undefined) {
            this.shapes.set(index, shapes);
        }
        return shapes;
    }
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
            return this.multiplier * Number(this.dice);
        }
        const results = [...this.results].map(([, { usable, value }]) =>
            usable ? value : 0
        );
        return this.multiplier * results.reduce((a, b) => a + b, 0);
    }
    get display() {
        if (this.static) {
            return `${this.result}`;
        }
        let display = [
            `[${[...this.results]
                .map(
                    ([, { modifiers, display }]) =>
                        `${display}${[...modifiers].join("")}`
                )
                .join(", ")}]`
        ];
        if (this.conditions.length) {
            display.push(
                this.conditions
                    .map(({ result, operator }) => `${operator}${result}`)
                    .join("")
            );
        }
        return display.join("");
    }
    get modifierText() {
        const conditionals = this.conditions.map(({ value }) => value).join("");

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
    async reroll(times: number, conditionals: Conditional[]) {
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
                comparer: this.faces.min,
                lexemes: [
                    {
                        value: `${this.faces.min}`,
                        text: `${this.faces.min}`,
                        type: "dice"
                    }
                ],
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
        while (i < times && toReroll.length > 0) {
            const promises = [];
            for (const [i, roll] of toReroll) {
                promises.push(
                    new Promise<void>(async (resolve) => {
                        roll.modifiers.add("r");
                        const shapes = this.getShapes(i);
                        const newValue = await this.getValue(shapes);
                        roll.value = newValue;
                        roll.display = `${newValue}`;
                        resolve();
                    })
                );
            }
            await Promise.all(promises);

            toReroll = toReroll.filter(([, { value }]) =>
                this.checkCondition(value, conditionals)
            );
            i++;
        }

        toReroll.forEach(([index, value]) => {
            this.results.set(index, value);
        });
    }

    async explode(times: number, conditionals: Conditional[], combine = false) {
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
                lexemes: [
                    {
                        value: `${this.faces.max}`,
                        text: `${this.faces.max}`,
                        type: "dice"
                    }
                ],
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
        await Promise.all(
            toExplode.map(async ([key, value]) => {
                if (combine) {
                    let newRoll = await this.getValue();
                    let i = 0;
                    value.modifiers.add("!");
                    value.value += newRoll;
                    value.display = `${value.value}`;
                    this.results.set(key, value);
                    while (
                        i < times &&
                        this.checkCondition(newRoll, conditionals)
                    ) {
                        i++;
                        newRoll = await this.getValue();
                        value.value += newRoll;
                        value.display = `${value.value}`;
                        this.results.set(key, value);
                    }
                } else {
                    /** newRoll is the new value to check against the max face value */
                    let newRoll = value.value;
                    /** i tracks how many times this roll has been exploded */
                    let i = 0;

                    /**
                     * Explode max rolls.
                     */
                    while (
                        i < times &&
                        this.checkCondition(newRoll, conditionals)
                    ) {
                        let previous = this.results.get(key + inserted + i);
                        previous.modifiers.add("!");
                        newRoll = await this.getValue();

                        /** Insert the new roll into the results map */
                        _insertIntoMap(
                            this.results,
                            key + inserted + i + 1,
                            this.#getResultInterface(newRoll)
                        );
                        i++;
                    }
                    /** Update how many have been inserted. */
                    inserted += i;
                }
            })
        );
    }
    canRender() {
        if (this.possibilities.length !== this.faces.max && !this.fudge)
            return false;
        const arr = [...Array(this.faces.max).keys()].map(
            (k) => this.faces.min + k
        );
        return arr.every((v) => this.possibilities.includes(v));
    }
    async getValue(shapes?: DiceShape[]) {
        let value: number;
        if (this.shouldRender && this.canRender()) {
            const temp = shapes ?? this.renderer.getDiceForRoller(this) ?? [];
            await this.renderer.addDice(temp);
            value = this.#resolveShapeValue(temp);
        } else {
            value = this.getValueSync();
        }
        return value;
    }
    getValueSync() {
        return this.getRandomValue();
    }
    getMaxPossible(): number {
        if (this.static) return Number(this.dice);
        if (this.multiplier === -1) {
            return (
                this.multiplier * Math.min(...this.possibilities) * this.rolls
            );
        }
        return Math.max(...this.possibilities) * this.rolls;
    }
    getMinPossible(): number {
        if (this.static) return Number(this.dice);
        if (this.multiplier === -1) {
            return (
                this.multiplier * Math.max(...this.possibilities) * this.rolls
            );
        }
        return Math.min(...this.possibilities) * this.rolls;
    }
    #resolveShapeValue(shapes: DiceShape[] = []) {
        if (!shapes.length) return this.getValueSync();
        const values = shapes.map((v) => v.getUpsideValue());
        if (this.faces.max === 100) {
            let [tens, ones] = values;
            if (tens === 10 && ones == 10) {
                return 100;
            }

            if (ones == 10) ones = 0;
            if (tens == 10) tens = 0;
            return tens * 10 + ones;
        }
        return values.reduce((a, b) => a + b);
    }
    #getResultInterface(n = 0): ResultInterface<number> {
        return {
            usable: true,
            value: n,
            display: `${n}`,
            modifiers: new Set()
        };
    }
    async applyModifiers() {
        for (const [type, modifier] of this.modifiers) {
            if (type == "kh" || type == "kl") continue;
            await this.applyModifier(type, modifier);
        }
        if (this.modifiers.has("kh")) {
            await this.applyModifier("kh", this.modifiers.get("kh"));
        }
        if (this.modifiers.has("kl")) {
            await this.applyModifier("kl", this.modifiers.get("kl"));
        }
    }

    setResults(results: Map<number, number>) {
        this.results = new Map(
            [...results].map(([i, n]) => [i, this.#getResultInterface(n)])
        );
        this.updateResultArray();
    }
    rollSync() {
        const results = new Map();
        for (let index = 0; index < this.rolls; index++) {
            results.set(index, this.getValueSync());
        }
        this.setResults(results);
        this.applyModifiers();

        if (this.conditions?.length) this.applyConditions();
        return [...results.values()];
    }
    async roll(): Promise<number[]> {
        this.results = new Map();
        this.shapes = new Map();
        const results = await this.#roll();
        this.setResults(results);
        await this.applyModifiers();
        if (this.conditions?.length) this.applyConditions();
        return [...results.values()];
    }
    async #roll() {
        const results = new Map();
        if (this.static) {
            results.set(0, Number(this.dice));
        } else {
            const promises = [];
            for (let index = 0; index < this.rolls; index++) {
                promises.push(
                    new Promise<void>(async (resolve) => {
                        const value = await this.getValue(
                            this.getShapes(index)
                        );
                        results.set(index, value);
                        resolve();
                    })
                );
            }
            await Promise.all(promises);
        }

        return results;
    }
    applyConditions() {
        for (const result of this.results.values()) {
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
        return;
    }
    updateResultArray() {
        this.resultArray = [...this.results.values()].map((v) => v.value);
    }
    async applyModifier(type: string, modifier: Modifier) {
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
                await this.explode(modifier.data, modifier.conditionals);
                break;
            }
            case "!!": {
                await this.explode(modifier.data, modifier.conditionals, true);
                break;
            }
            case "r": {
                await this.reroll(modifier.data, modifier.conditionals);
                break;
            }
            case "u": {
                await this.makeUnique();
                break;
            }
            case "condition": {
            }
        }
    }

    async makeUnique() {
        let resultValues = [...this.results.values()];
        if (
            new Set(this.possibilities).size < this.rolls ||
            new Set(resultValues.map((v) => v.value)).size == this.results.size
        )
            return;
        let attempts = 0;
        while (
            new Set(resultValues.map((v) => v.value)).size !=
                this.results.size &&
            attempts < 100
        ) {
            const promises = [];

            for (const [index, result] of this.results) {
                promises.push(
                    new Promise<void>(async (resolve) => {
                        let dupe = resultValues.find(
                            (v) => v.value == result.value && v != result
                        );
                        if (dupe) {
                            dupe.value = await this.getValue(
                                this.getShapes(index)
                            );
                            dupe.display = `${dupe.value}`;
                            dupe.modifiers.add("u");
                        }
                        resolve();
                    })
                );
            }
            await Promise.all(promises);

            resultValues = [...this.results.values()];
            attempts++;
        }
    }
    checkCondition(value: number, conditions: Conditional[]): boolean | number {
        if (!conditions || !conditions.length) return value;
        let result = false;
        for (const condition of conditions) {
            const { operator, comparer, lexemes } = condition;
            if (Number.isNaN(value) || !operator?.length || !comparer) {
                continue;
            }

            const roller = new BasicStackRoller(comparer, lexemes);
            roller.rollSync();
            condition.result = roller.result;

            if (Number.isNaN(condition.result)) continue;
            switch (operator) {
                case "=":
                    result = value === condition.result;
                    break;
                case "!=":
                case "=!":
                    result = value !== condition.result;
                    break;
                case "<":
                    result = value < condition.result;
                    break;
                case "<=":
                    result = value <= condition.result;
                    break;
                case ">":
                    result = value > condition.result;
                    break;
                case ">=":
                    result = value >= condition.result;
                    break;
            }

            if (result) return result;
        }
        return result;
    }
    allowAverage(): boolean {
        return true;
    }
    average(): number {
        return (
            this.possibilities.reduce((a, b) => a + b) /
            this.possibilities.length
        );
    }
    getRandomValue(): number {
        const index = Math.floor(Math.random() * this.possibilities.length);
        return this.possibilities[index];
    }

    shouldRender = false;
    getGeometries() {
        return [...this.shapes.values()].flat();
    }
    async render(): Promise<void> {
        this.shouldRender = true;
        await this.roll();
        this.shouldRender = false;
    }
}

class StuntRoller extends DiceRoller {
    constructor(
        public dice: string,
        renderer?: DiceRenderer,
        lexeme?: LexicalToken
    ) {
        super(`3d6`, renderer, lexeme);
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
    constructor(
        public dice: string,
        renderer?: DiceRenderer,
        lexeme?: LexicalToken
    ) {
        super(dice, renderer, lexeme);
        const faces = `${this.faces.max}`.split("");
        for (let i = 0; i < this.rolls; i++) {
            const stack = [];
            for (const face of faces) {
                const roller = new DiceRoller(`1d${face}`, renderer);
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
    async roll() {
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

class BasicStackRoller extends Roller<number> {
    constructor(
        public original: string | number,
        public lexemes: LexicalToken[]
    ) {
        super();
    }
    result: number;
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
                    this.stack.push(new DiceRoller(`${result}`, null, dice));
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
                        this.dice[index] = new DiceRoller(
                            dice.value,
                            null,
                            dice
                        );
                    }
                    if (!this.dice[index]) {
                        this.dice[index] = new DiceRoller(
                            dice.value,
                            null,
                            dice
                        );
                    }

                    this.stack.push(this.dice[index]);
                    this.stackCopy.push(this.dice[index]);
                    index++;
                    break;
                }
                case "stunt": {
                    if (!this.dice[index]) {
                        this.dice[index] = new StuntRoller(
                            dice.value,
                            null,
                            dice
                        );
                    }

                    this.stack.push(this.dice[index]);
                    this.stackCopy.push(this.dice[index]);
                    index++;
                    break;
                }

                case "%": {
                    if (!this.dice[index]) {
                        this.dice[index] = new PercentRoller(
                            dice.value,
                            null,
                            dice
                        );
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

export class StackRoller extends GenericRoller<number> {
    result: number;
    fixedText: string;
    displayFixedText: boolean = false;
    expectedValue: ExpectedValue;
    round: Round;
    signed: boolean;
    showRenderNotice: boolean;
    async getReplacer() {
        return `${this.result}`;
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
        const avgAllowed = (roller: DiceRoller) => roller.allowAverage();
        return this.dynamic.every(avgAllowed);
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
            if (this.showDice) {
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
            /* this.render();
            this.trigger("new-result"); */
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
        public renderer: DiceRenderer,
        showDice = plugin.data.showDice,
        fixedText: string,
        expectedValue = plugin.data.initialDisplay,
        displayFormulaAfter = plugin.data.displayFormulaAfter,
        round = plugin.data.round,
        signed = plugin.data.signed
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
        setIcon(this.resultEl.createDiv("should-spin"), "loader-2");
    }
    async renderDice() {
        this.isRendering = true;
        this.setTooltip();
        this.setSpinner();
        /* if (!this.renderer.loaded) {
            this.plugin.addChild(this.renderer);
        } */
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
        /* this.recalculate(); */
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
                        this.dice[index] = new DiceRoller(
                            dice.value,
                            this.renderer,
                            dice
                        );
                    }
                    if (!this.dice[index]) {
                        this.dice[index] = new DiceRoller(
                            dice.value,
                            this.renderer,
                            dice
                        );
                    }
                    index++;
                    break;
                }
                case "stunt": {
                    if (!this.dice[index]) {
                        this.dice[index] = new StuntRoller(
                            dice.value,
                            this.renderer,
                            dice
                        );
                    }
                    index++;
                    break;
                }

                case "%": {
                    if (!this.dice[index]) {
                        this.dice[index] = new PercentRoller(
                            dice.value,
                            this.renderer,
                            dice
                        );
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
        this.renderer.stop();
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
                    this.stack.push(
                        new DiceRoller(`${result}`, this.renderer, dice)
                    );
                    this.minStack.push(min);
                    this.maxStack.push(max);
                    break;
                }
                case "stunt":
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
                this.stunted = ` - ${final.results.get(0).value} Stunt Points`;
            }
        }
        this.result = final.result;
    }

    recalculate(modify = false) {
        let stack = [];
        let result = 0;
        if (!this.stackCopy.length) {
            return this.roll();
        }
        for (let item of this.stackCopy) {
            if (typeof item === "string") {
                let b: DiceRoller = stack.pop(),
                    a = stack.pop();

                const r = this.operators[item](a.result, b.result);
                stack.push(new DiceRoller(`${r}`, this.renderer));
            } else {
                stack.push(item);
                if (
                    item instanceof DiceRoller &&
                    this.stackCopy.indexOf(item) != this.stackCopy.length - 1
                ) {
                    if (modify) item.applyModifiers();
                }
            }
        }
        if (stack.length && stack[0] instanceof DiceRoller) {
            if (modify) stack[0].applyModifiers();
            result += stack[0].result;
        }

        this.result = result;
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
