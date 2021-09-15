import { Notice, setIcon } from "obsidian";
import type DiceRollerPlugin from "src/main";
import { ResultMapInterface, Conditional, Lexeme } from "src/types";
import { ICON_DEFINITION } from "src/utils/constants";
import { _checkCondition, _insertIntoMap } from "src/utils/util";
import { BaseRoller, GenericRoller, Roller } from "./roller";

interface Modifier {
    conditionals: Conditional[];
    data: number;
}

class DiceRoller extends BaseRoller implements Roller<number> {
    dice: string;
    modifiers: Map<string, Modifier> = new Map();
    rolls: number;
    faces: { min: number; max: number };
    results: ResultMapInterface<number>;
    resultArray: number[];
    originalRoll: number[];
    modifiersAllowed: boolean = true;
    static: boolean = false;
    conditions: Conditional[];

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
                ([, { modifiers, value }]) =>
                    `${value}${[...modifiers].join("")}`
            )
            .join(", ")}]`;
    }
    constructor(dice: string) {
        super();
        if (!/(\-?\d+)[dD]?(\d+|%|\[\d+,\s?\d+\])?/.test(dice)) {
            throw new Error("Non parseable dice string passed to DiceRoll.");
        }
        this.dice = dice.split(" ").join("");

        if (/^-?\d+$/.test(this.dice)) {
            this.static = true;
            this.modifiersAllowed = false;
        }
        let [, rolls, min = null, max = 1] = this.dice.match(
            /(\-?\d+)[dD]\[?(?:(-?\d+)\s?,)?\s?(-?\d+|%|F)\]?/
        ) || [, 1, null, 1];
        this.rolls = Number(rolls) || 1;
        if (Number(max) < 0 && !min) {
            min = -1;
        }
        if (max === "%") max = 100;
        if (max === "F") {
            max = 1;
            min = -1;
        }
        if (Number(max) < Number(min)) {
            [max, min] = [min, max];
        }

        this.faces = { max: max ? Number(max) : 1, min: min ? Number(min) : 1 };

        this.originalRoll = this.roll();
        this.results = new Map(
            [...this.originalRoll].map((n, i) => {
                return [i, { usable: true, value: n, modifiers: new Set() }];
            })
        );
    }
    keepLow(drop: number = 1) {
        if (!this.modifiersAllowed) {
            new Notice("Modifiers are only allowed on dice rolls.");
            return;
        }
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
        /**
         * Build Conditional
         */
        if (!conditionals.length) {
            conditionals.push({
                operator: "=",
                comparer: this.faces.min
            });
        }

        /**
         * Find values that pass the conditional.
         */
        let i = 0,
            toReroll = [...this.results].filter(([, { value }]) =>
                _checkCondition(value, conditionals)
            );
        while (
            i < times &&
            toReroll.filter(([, { value }]) =>
                _checkCondition(value, conditionals)
            ).length > 0
        ) {
            i++;
            toReroll.map(([, roll]) => {
                roll.modifiers.add("r");
                roll.value = this._getRandomBetween(
                    this.faces.min,
                    this.faces.max
                );
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
                comparer: this.faces.max
            });
        }

        /**
         * Find values that pass the conditional
         */
        let i = 0,
            toExplode = [...this.results].filter(([, { value }]) =>
                _checkCondition(value, conditionals)
            );

        toExplode.forEach(([index, value]) => {
            let newRoll = this._getRandomBetween(
                this.faces.min,
                this.faces.max
            );
            i++;
            value.modifiers.add("!");
            value.value += newRoll;
            this.results.set(index, value);
            while (i < times && _checkCondition(newRoll, conditionals)) {
                i++;
                newRoll = this._getRandomBetween(
                    this.faces.min,
                    this.faces.max
                );
                value.value += newRoll;
                this.results.set(index, value);
            }
        });
    }
    explode(times: number, conditionals: Conditional[]) {
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
                comparer: this.faces.max
            });
        }

        /**
         * Find values that pass the conditional
         */
        let toExplode = [...this.results].filter(([, { value }]) =>
            _checkCondition(value, conditionals)
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
            while (i < times && _checkCondition(newRoll, conditionals)) {
                let previous = this.results.get(key + inserted + i);
                previous.modifiers.add("!");

                newRoll = this._getRandomBetween(
                    this.faces.min,
                    this.faces.max
                );

                /** Insert the new roll into the results map */
                _insertIntoMap(this.results, key + inserted + i + 1, {
                    usable: true,
                    value: newRoll,
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
        return [...Array(this.rolls)].map(() =>
            this._getRandomBetween(this.faces.min, this.faces.max)
        );
    }
    roll() {
        const roll = this._roll();
        this.results = new Map(
            [...roll].map((n, i) => {
                return [i, { usable: true, value: n, modifiers: new Set() }];
            })
        );

        for (let [type, modifier] of this.modifiers) {
            this.applyModifier(type, modifier);
        }

        return roll;
    }
    applyModifier(type: string, modifier: Modifier) {
        switch (type) {
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
        }
    }

    element() {
        return createDiv();
    }
}

class StuntRoller extends DiceRoller {
    constructor(dice: string) {
        super(`3d6`);

        this.dice = dice;
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
}

export class StackRoller extends GenericRoller<number> {
    result: number;
    get tooltip() {
        let text = this.original;
        this.dice.forEach((dice) => {
            text = text.replace(
                `${dice.dice}${Array.from(dice.modifiers).join("")}`,
                dice.display
            );
        });
        return `${this.original}\n${text}`;
    }
    async build() {
        const result = [
            this.result.toLocaleString(navigator.language, {
                maximumFractionDigits: 2
            })
        ];
        if (this.plugin.data.displayResultsInline) {
            result.unshift(this.tooltip.split("\n").join(" => "), " => ");
        }
        this.resultEl.setText(result.join(""));
    }

    constructor(
        public plugin: DiceRollerPlugin,
        public original: string,
        public lexemes: Lexeme[]
    ) {
        super(plugin, original, lexemes);
        this.roll();
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
    dice: DiceRoller[] = [];
    roll() {
        let index = 0;
        for (const d of this.lexemes) {
            switch (d.type) {
                case "+":
                case "-":
                case "*":
                case "/":
                case "^":
                case "math":
                    const b = this.stack.pop(),
                        a = this.stack.pop();
                    a.roll();
                    b.roll();

                    const result = this.operators[d.data](a.result, b.result);

                    this.stack.push(new DiceRoller(`${result}`));
                    break;
                case "kh": {
                    let diceInstance = this.dice[index - 1];
                    let data = d.data ? Number(d.data) : 1;

                    /* diceInstance.keepHigh(data); */

                    diceInstance.modifiers.set("kh", {
                        data,
                        conditionals: []
                    });
                    break;
                }
                case "dl": {
                    let diceInstance = this.dice[index - 1];
                    let data = d.data ? Number(d.data) : 1;

                    data = diceInstance.results.size - data;

                    /* diceInstance.keepHigh(data); */
                    diceInstance.modifiers.set("kh", {
                        data,
                        conditionals: []
                    });
                    break;
                }
                case "kl": {
                    let diceInstance = this.dice[index - 1];
                    let data = d.data ? Number(d.data) : 1;

                    /* diceInstance.keepLow(data); */
                    diceInstance.modifiers.set("kl", {
                        data,
                        conditionals: []
                    });
                    break;
                }
                case "dh": {
                    let diceInstance = this.dice[index - 1];
                    let data = d.data ? Number(d.data) : 1;

                    data = diceInstance.results.size - data;

                    /* diceInstance.keepLow(data); */
                    diceInstance.modifiers.set("kl", {
                        data,
                        conditionals: []
                    });
                    break;
                }
                case "!": {
                    let diceInstance = this.dice[index - 1];
                    let data = Number(d.data) || 1;

                    /* diceInstance.explode(data, d.conditionals); */
                    /* diceInstance.modifiers.add(d.original); */
                    diceInstance.modifiers.set("!", {
                        data,
                        conditionals: d.conditionals
                    });

                    break;
                }
                case "!!": {
                    let diceInstance = this.dice[index - 1];
                    let data = Number(d.data) || 1;

                    /* diceInstance.explodeAndCombine(data, d.conditionals); */
                    /* diceInstance.modifiers.add(d.original); */
                    diceInstance.modifiers.set("!!", {
                        data,
                        conditionals: d.conditionals
                    });

                    break;
                }
                case "r": {
                    let diceInstance = this.dice[index - 1];
                    let data = Number(d.data) || 1;

                    /* diceInstance.reroll(data, d.conditionals); */
                    /* diceInstance.modifiers.add(d.original); */
                    diceInstance.modifiers.set("r", {
                        data,
                        conditionals: d.conditionals
                    });
                    break;
                }
                case "dice":
                    ///const res = this.roll(d.data);
                    if (!this.dice[index]) {
                        this.dice[index] = new DiceRoller(d.data);
                    }

                    this.stack.push(this.dice[index]);
                    index++;
                    break;
                case "stunt":
                    if (!this.dice[index]) {
                        this.dice[index] = new StuntRoller(d.original);
                    }

                    /* if (stunt.doubles) {
                            stunted = ` - ${
                                stunt.results.get(0).value
                            } Stunt Points`;
                        } */

                    this.stack.push(this.dice[index]);
                    index++;
            }
        }

        const final = this.stack.pop();
        final.roll();

        this.result = final.result;

        this.render();

        return this.result;
    }
}
