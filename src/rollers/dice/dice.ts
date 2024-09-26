import { Notice } from "obsidian";
import type { LexicalToken } from "src/lexer/lexer";

import { _insertIntoMap } from "src/utils/util";
import { DiceRenderer } from "src/renderer/renderer";
import { DiceShape } from "src/renderer/shapes";
import { BasicStackRoller } from "./stack";
import type { RenderableDice, RenderTypes } from "./renderable";

export interface Conditional {
    operator: string;
    comparer: string | number;
    lexemes: LexicalToken[];
    value: string;
    result?: number;
}

export type ResultMapInterface<T> = Map<number, ResultInterface<T>>;
export type ResultInterface<T> = {
    usable: boolean;
    value: T;
    display: string;
    modifiers?: Set<string>;
};
interface Modifier {
    conditionals: Conditional[];
    data: number;
    value: string;
}

type ModifierType = "sort" | "kh" | "kl" | "!" | "!!" | "r" | "u";

export class DiceRoller implements RenderableDice<number> {
    getType() {
        return `${this.faces.max}` as RenderTypes;
    }

    constructor(
        dice: string | number,
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
            /(\-?\d+)[dD](%|F|-?\d+|\[\d+(?:[ \t]*[,-][ \t]*\d+)+\])/
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
        } else if (/\[\d+(?:[ \t]*-[ \t]*\d+)+\]/.test(maxStr)) {
            [min, max] = maxStr
                .replace(/[\[\]\s]/g, "")
                .split("-")
                .map((v) => Number(v));
            this.possibilities = Array.from(
                { length: max - min },
                (_, i) => i + min
            );
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
            if (isNaN(max)) {
                max = 1;
            }

            this.possibilities = [...Array(Number(max ?? 1)).keys()].map(
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
        const shapes = DiceRenderer.getDiceForRoller(this);
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

        if (this.results.size === 1) return;

        [...this.results]
            .sort((a, b) => a[1].value - b[1].value)
            .slice(
                drop > this.results.size
                    ? this.results.size
                    : drop - this.results.size
            )
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

        if (this.results.size === 1) return;

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
            const temp = shapes ?? DiceRenderer.getDiceForRoller(this) ?? [];

            await DiceRenderer.addDice(temp);
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
        let rolls = this.rolls;
        if (this.modifiers.has("kl")) {
            rolls = rolls - this.modifiers.get("kl")!.data;
        }
        if (this.modifiers.has("kh")) {
            rolls = rolls - this.modifiers.get("kh")!.data;
        }
        if (rolls < 1) rolls = 0;
        if (this.multiplier === -1) {
            return this.multiplier * Math.min(...this.possibilities) * rolls;
        }
        return Math.max(...this.possibilities) * rolls;
    }
    getMinPossible(): number {
        if (this.static) return Number(this.dice);
        let rolls = this.rolls;
        if (this.modifiers.has("kl")) {
            rolls = rolls - this.modifiers.get("kl")!.data;
        }
        if (this.modifiers.has("kh")) {
            rolls = rolls - this.modifiers.get("kh")!.data;
        }
        if (rolls < 1) rolls = 0;

        if (this.multiplier === -1) {
            return this.multiplier * Math.max(...this.possibilities) * rolls;
        }
        return Math.min(...this.possibilities) * rolls;
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
    async roll(): Promise<void> {
        this.results = new Map();
        this.shapes = new Map();
        const results = await this.#roll();

        this.setResults(results);
        await this.applyModifiers();
        if (this.conditions?.length) this.applyConditions();
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
