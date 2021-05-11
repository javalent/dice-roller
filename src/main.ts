import { Plugin, MarkdownPostProcessorContext, Notice } from "obsidian";
//@ts-ignore
import lexer from "lex";

import { faDice } from "@fortawesome/free-solid-svg-icons";
import { icon } from "@fortawesome/fontawesome-svg-core";

import "./main.css";

String.prototype.matchAll =
    String.prototype.matchAll ||
    function* matchAll(regexp: RegExp): IterableIterator<RegExpMatchArray> {
        const flags = regexp.global ? regexp.flags : regexp.flags + "g";
        const re = new RegExp(regexp, flags);
        let match;
        while ((match = re.exec(this))) {
            yield match;
        }
    };

interface Lexeme {
    original: string;
    type: string;
    data: string;
    conditionals: Conditional[];
}

interface Conditional {
    operator: string;
    comparer: number;
}

class Parser {
    table: any;
    constructor(table: any) {
        this.table = table;
    }
    parse(input: Lexeme[]) {
        var length = input.length,
            table = this.table,
            output = [],
            stack = [],
            index = 0;

        while (index < length) {
            var token = input[index++];

            switch (token.data) {
                case "(":
                    stack.unshift(token);
                    break;
                case ")":
                    while (stack.length) {
                        var token = stack.shift();
                        if (token.data === "(") break;
                        else output.push(token);
                    }

                    if (token.data !== "(")
                        throw new Error("Mismatched parentheses.");
                    break;
                default:
                    if (table.hasOwnProperty(token.data)) {
                        while (stack.length) {
                            var punctuator = stack[0];

                            if (punctuator.data === "(") break;

                            var operator = table[token.data],
                                precedence = operator.precedence,
                                antecedence = table[punctuator.data].precedence;

                            if (
                                precedence > antecedence ||
                                (precedence === antecedence &&
                                    operator.associativity === "right")
                            )
                                break;
                            else output.push(stack.shift());
                        }

                        stack.unshift(token);
                    } else output.push(token);
            }
        }

        while (stack.length) {
            var token = stack.shift();
            if (token.data !== "(") output.push(token);
            else throw new Error("Mismatched parentheses.");
        }

        return output;
    }
}

export default class DiceRoller extends Plugin {
    lexer: lexer;
    parser: Parser;
    async onload() {
        console.log("DiceRoller plugin loaded");
        this.registerMarkdownPostProcessor(
            (el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
                let nodeList = el.querySelectorAll("code");
                if (!nodeList.length) return;

                nodeList.forEach((node) => {
                    if (!/^dice:\s*([\s\S]+)\s*?/.test(node.innerText)) return;
                    let parent = node.parentElement;

                    try {
                        let [, dice] = node.innerText.match(
                            /^dice:\s*([\s\S]+)\s*?/
                        );

                        dice = dice.split(" ").join("").trim();
                        let { result, text } = this.parseDice(dice);

                        let container = createDiv().createDiv({
                            cls: "dice-roller"
                        });
                        container.setAttr("data-dice", dice);

                        let diceSpan = container.createSpan();
                        diceSpan.innerText = `${result.toLocaleString(
                            navigator.language,
                            { maximumFractionDigits: 2 }
                        )}`;

                        container
                            .createDiv({ cls: "dice-roller-button" })
                            .appendChild(icon(faDice).node[0]) as HTMLElement;

                        parent.replaceChild(container, node);

                        container.addEventListener("click", () => {
                            ({ result, text } = this.parseDice(dice));

                            diceSpan.innerText = `${result.toLocaleString(
                                navigator.language,
                                { maximumFractionDigits: 2 }
                            )}`;

                            this.buildTooltip(container, `${dice}\n${text}`, {
                                delay: 0,
                                gap: 2,
                                placement: "top"
                            });
                        });
                        container.addEventListener(
                            "mouseenter",
                            (evt: MouseEvent) => {
                                this.buildTooltip(
                                    container,
                                    `${dice}\n${text}`,
                                    {
                                        delay: 0,
                                        gap: 2,
                                        placement: "top"
                                    }
                                );
                            }
                        );
                    } catch (e) {
                        console.error(e);
                        new Notice(
                            `There was an error parsing the dice string: ${node.innerText}`
                        );
                        return;
                    }
                });
            }
        );

        this.lexer = new lexer();

        this.addLexerRules();

        var exponent = {
            precedence: 3,
            associativity: "right"
        };

        var factor = {
            precedence: 2,
            associativity: "left"
        };

        var term = {
            precedence: 1,
            associativity: "left"
        };

        this.parser = new Parser({
            "+": term,
            "-": term,
            "*": factor,
            "/": factor,
            "^": exponent
        });
    }
    addLexerRules() {
        this.lexer.addRule(/\s+/, function () {
            /* skip whitespace */
        });
        this.lexer.addRule(/[{}]+/, function () {
            /* skip brackets */
        });
        this.lexer.addRule(
            /[\(\^\+\-\*\/\)]/,
            function (lexeme: string): Lexeme {
                return {
                    type: "math",
                    data: lexeme,
                    original: lexeme,
                    conditionals: null
                }; // punctuation ("^", "(", "+", "-", "*", "/", ")")
            }
        );

        this.lexer.addRule(
            /(\d+)([Dd]\[?(?:(-?\d+)\s?,)?\s?(-?\d+|%|F)\]?)?/,
            function (lexeme: string): Lexeme {
                let [, dice] = lexeme.match(
                        /(\d+(?:[Dd]?\[?(?:-?\d+\s?,)?\s?(?:-?\d+|%|F)\]?)?)/
                    ),
                    conditionals: Conditional[] = [];
                if (/(?:(!?=|=!|>=?|<=?)(\d+))+/.test(lexeme)) {
                    for (const [, operator, comparer] of lexeme.matchAll(
                        /(?:(!?=|=!|>=?|<=?)(\d+))/g
                    )) {
                        conditionals.push({
                            operator: operator,
                            comparer: Number(comparer)
                        });
                    }
                }
                return {
                    type: "dice",
                    data: dice,
                    original: lexeme,
                    conditionals: conditionals
                }; // symbols
            }
        );

        this.lexer.addRule(/kh?(?!:l)(\d*)/, function (lexeme: string): Lexeme {
            /** keep high */
            return {
                type: "kh",
                data: lexeme.replace(/^\D+/g, ""),
                original: lexeme,
                conditionals: null
            };
        });
        this.lexer.addRule(/dl?(?!:h)\d*/, function (lexeme: string): Lexeme {
            /** drop low */
            return {
                type: "dl",
                data: lexeme.replace(/^\D+/g, ""),
                original: lexeme,
                conditionals: null
            };
        });

        this.lexer.addRule(/kl\d*/, function (lexeme: string): Lexeme {
            /** keep low */
            return {
                type: "kl",
                data: lexeme.replace(/^\D+/g, ""),
                original: lexeme,
                conditionals: null
            };
        });
        this.lexer.addRule(/dh\d*/, function (lexeme: string): Lexeme {
            /** drop high */
            return {
                type: "dh",
                data: lexeme.replace(/^\D+/g, ""),
                original: lexeme,
                conditionals: null
            };
        });
        this.lexer.addRule(
            /!!(i|\d+)?(?:(!?=|=!|>=?|<=?)(-?\d+))*/,
            function (lexeme: string): Lexeme {
                /** explode and combine */
                let [, data = `1`] = lexeme.match(
                        /!!(i|\d+)?(?:(!?=|=!|>=?|<=?)(-?\d+))*/
                    ),
                    conditionals: Conditional[] = [];
                if (/(?:(!?=|=!|>=?|<=?)(-?\d+))+/.test(lexeme)) {
                    for (const [, operator, comparer] of lexeme.matchAll(
                        /(?:(!?=|=!|>=?|<=?)(-?\d+))/g
                    )) {
                        conditionals.push({
                            operator: operator,
                            comparer: Number(comparer)
                        });
                    }
                }
                if (/!!i/.test(lexeme)) {
                    data = `100`;
                }

                return {
                    type: "!!",
                    data: data,
                    original: lexeme,
                    conditionals: conditionals
                };
            }
        );
        this.lexer.addRule(
            /!(i|\d+)?(?:(!?=|=!?|>=?|<=?)(-?\d+))*/,
            function (lexeme: string): Lexeme {
                /** explode */
                let [, data = `1`] = lexeme.match(
                        /!(i|\d+)?(?:(!?=|=!?|>=?|<=?)(-?\d+))*/
                    ),
                    conditionals: Conditional[] = [];
                if (/(?:(!?=|=!|>=?|<=?)(\d+))+/.test(lexeme)) {
                    for (const [, operator, comparer] of lexeme.matchAll(
                        /(?:(!?=|=!?|>=?|<=?)(-?\d+))/g
                    )) {
                        conditionals.push({
                            operator: operator,
                            comparer: Number(comparer)
                        });
                    }
                }
                if (/!i/.test(lexeme)) {
                    data = `100`;
                }

                return {
                    type: "!",
                    data: data,
                    original: lexeme,
                    conditionals: conditionals
                };
            }
        );

        this.lexer.addRule(
            /r(i|\d+)?(?:(!?=|=!|>=?|<=?)(-?\d+))*/,
            function (lexeme: string): Lexeme {
                /** reroll */
                let [, data = `1`] = lexeme.match(
                        /r(i|\d+)?(?:(!?=|=!|>=?|<=?)(-?\d+))*/
                    ),
                    conditionals: Conditional[] = [];
                if (/(?:(!?={1,2}|>=?|<=?)(-?\d+))+/.test(lexeme)) {
                    for (const [, operator, comparer] of lexeme.matchAll(
                        /(?:(!?=|=!|>=?|<=?)(-?\d+))/g
                    )) {
                        conditionals.push({
                            operator: operator,
                            comparer: Number(comparer)
                        });
                    }
                }
                if (/ri/.test(lexeme)) {
                    data = `100`;
                }
                return {
                    type: "r",
                    data: data,
                    original: lexeme,
                    conditionals: conditionals
                };
            }
        );
    }

    onunload() {
        this.clearTooltip();
        console.log("DiceRoller unloaded");
    }

    operators: any = {
        "+": (a: number, b: number): number => a + b,
        "-": (a: number, b: number): number => a - b,
        "*": (a: number, b: number): number => a * b,
        "/": (a: number, b: number): number => a / b,
        "^": (a: number, b: number): number => {
            return Math.pow(a, b);
        }
    };
    parseDice(text: string): { result: number; text: string } {
        let stack: DiceRoll[] = [],
            diceMap: DiceRoll[] = [];

        this.parse(text).forEach((d) => {
            switch (d.type) {
                case "+":
                case "-":
                case "*":
                case "/":
                case "^":
                case "math":
                    const b = stack.pop().sum,
                        a = stack.pop().sum,
                        result = this.operators[d.data](a, b);

                    stack.push(new DiceRoll(`${result}`));
                    break;
                case "kh": {
                    let diceInstance = diceMap[diceMap.length - 1];
                    let data = d.data ? Number(d.data) : 1;

                    diceInstance.keepHigh(data);
                    diceInstance.modifiers.push(d.original);
                    break;
                }
                case "dl": {
                    let diceInstance = diceMap[diceMap.length - 1];
                    let data = d.data ? Number(d.data) : 1;

                    data = diceInstance.results.size - data;

                    diceInstance.keepHigh(data);
                    diceInstance.modifiers.push(d.original);
                    break;
                }
                case "kl": {
                    let diceInstance = diceMap[diceMap.length - 1];
                    let data = d.data ? Number(d.data) : 1;

                    diceInstance.keepLow(data);
                    diceInstance.modifiers.push(d.original);
                    break;
                }
                case "dh": {
                    let diceInstance = diceMap[diceMap.length - 1];
                    let data = d.data ? Number(d.data) : 1;

                    data = diceInstance.results.size - data;

                    diceInstance.keepLow(data);
                    diceInstance.modifiers.push(d.original);
                    break;
                }
                case "!": {
                    let diceInstance = diceMap[diceMap.length - 1];
                    let data = Number(d.data) || 1;

                    diceInstance.explode(data, d.conditionals);
                    diceInstance.modifiers.push(d.original);

                    break;
                }
                case "!!": {
                    let diceInstance = diceMap[diceMap.length - 1];
                    let data = Number(d.data) || 1;

                    diceInstance.explodeAndCombine(data, d.conditionals);
                    diceInstance.modifiers.push(d.original);

                    break;
                }
                case "r": {
                    let diceInstance = diceMap[diceMap.length - 1];
                    let data = Number(d.data) || 1;

                    diceInstance.reroll(data, d.conditionals);
                    diceInstance.modifiers.push(d.original);
                    break;
                }
                case "dice":
                    ///const res = this.roll(d.data);

                    diceMap.push(new DiceRoll(d.data));
                    stack.push(diceMap[diceMap.length - 1]);
                    break;
            }
        });
        diceMap.forEach((diceInstance) => {
            text = text.replace(
                `${diceInstance.dice}${diceInstance.modifiers.join("")}`,
                diceInstance.display
            );
        });
        return {
            result: stack[0].sum,
            text: text
        };
    }
    parse(input: string): Lexeme[] {
        this.lexer.setInput(input);
        var tokens = [],
            token;
        while ((token = this.lexer.lex())) tokens.push(token);
        return this.parser.parse(tokens);
    }

    buildTooltip(
        element: HTMLElement,
        text: string,
        params: {
            placement?: string;
            classes?: string[];
            gap?: number;
            delay?: number;
        }
    ) {
        let { placement = "top", classes = [], gap = 4, delay = 0 } = params;

        if (delay > 0) {
            setTimeout(() => {
                this.buildTooltip(element, text, {
                    placement: placement,
                    classes: classes,
                    gap: gap,
                    delay: 0
                });
            }, delay);
            return;
        }
        const { top, left, width, height } = element.getBoundingClientRect();

        if (this.tooltip && this.tooltipTarget === element) {
            this.tooltip.setText(text);
        } else {
            this.clearTooltip();
            this.tooltip = createDiv({
                cls: "tooltip",
                text: text
            });

            (this.tooltip.parentNode || document.body).appendChild(
                this.tooltip
            );
        }

        let arrow =
            (this.tooltip.getElementsByClassName(
                "tooltip-arrow"
            )[0] as HTMLDivElement) || this.tooltip.createDiv("tooltip-arrow");

        let bottom = 0;
        let middle = 0;

        if (top - this.tooltip.getBoundingClientRect().height < 0) {
            placement = "bottom";
        }
        switch (placement) {
            case "bottom": {
                bottom = top + height + gap;
                middle = left + width / 2;
                break;
            }
            case "right": {
                bottom = top + height / 2;
                middle = left + width + gap;
                classes.push("mod-right");
                break;
            }
            case "left": {
                bottom = top + height / 2;
                middle = left - gap;
                classes.push("mod-left");
                break;
            }
            case "top": {
                bottom = top - gap - 5;
                middle = left + width / 2;
                classes.push("mod-top");
                break;
            }
        }

        this.tooltip.addClasses(classes);
        this.tooltip.style.top = "0px";
        this.tooltip.style.left = "0px";
        this.tooltip.style.width = "";
        this.tooltip.style.height = "";
        const {
            width: ttWidth,
            height: ttHeight
        } = this.tooltip.getBoundingClientRect();
        const actualWidth = ["bottom", "top"].contains(placement)
            ? ttWidth / 2
            : ttWidth;
        const actualHeight = ["left", "right"].contains(placement)
            ? ttHeight / 2
            : ttHeight;

        if (
            ("left" === placement
                ? (middle -= actualWidth)
                : "top" === placement && (bottom -= actualHeight),
            bottom + actualHeight > window.innerHeight &&
                (bottom = window.innerHeight - actualHeight - gap),
            (bottom = Math.max(bottom, gap)),
            "top" === placement || "bottom" === placement)
        ) {
            if (middle + actualWidth > window.innerWidth) {
                const E = middle + actualWidth + gap - window.innerWidth;
                middle -= E;
                arrow.style.left = "initial";
                arrow.style.right = actualWidth - E - gap / 2 + "px";
            } else if (middle - gap - actualWidth < 0) {
                const E = -(middle - gap - actualWidth);
                middle += E;
                arrow.style.right = "initial";
                arrow.style.left = actualWidth - E - gap / 2 + "px";
            }
            middle = Math.max(middle, gap);
        }

        this.tooltip.style.top = bottom + "px";
        this.tooltip.style.left = middle + "px";
        this.tooltip.style.width = ttWidth + "px";
        this.tooltip.style.height = ttHeight + "px";
        this.tooltipTarget = element;

        this.tooltipTarget.addEventListener("mouseleave", () => {
            this.clearTooltip();
        });
    }
    tooltip: HTMLDivElement = null;
    tooltipTimeout: number = null;
    tooltipTarget: HTMLElement = null;
    clearTooltipTimeout() {
        if (this.tooltipTimeout) {
            clearTimeout(this.tooltipTimeout);
            this.tooltipTimeout = null;
        }
    }
    clearTooltip() {
        this.clearTooltipTimeout();
        if (this.tooltip) {
            this.tooltip.detach();
            this.tooltip = null;
            this.tooltipTarget = null;
        }
    }
}

type ResultMapInterface = Map<number, ResultInterface>;
type ResultInterface = {
    usable: boolean;
    value: number;
    modifiers: Set<string>;
};
class DiceRoll {
    dice: string;
    result: number;
    modifiers: string[] = [];
    rolls: number;
    faces: { min: number; max: number };
    results: ResultMapInterface;
    resultArray: number[];
    originalRoll: number[];
    modifiersAllowed: boolean = true;
    static: boolean = false;
    conditions: Conditional[];
    toString(): string {
        return this.display;
    }
    constructor(dice: string) {
        if (!/(-?\d+)[dD]?(\d+|%|\[\d+,\s?\d+\])?/.test(dice)) {
            throw new Error("Non parseable dice string passed to DiceRoll.");
        }
        this.dice = dice.split(" ").join("");

        if (/^-?\d+$/.test(this.dice)) {
            this.static = true;
            this.modifiersAllowed = false;
        }
        let [, rolls, min = null, max = 1] = this.dice.match(
            /(\d+)[dD]\[?(?:(-?\d+)\s?,)?\s?(-?\d+|%|F)\]?/
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
    replaceSelf(text: string): string {
        return text.replace(
            `${this.dice}${this.modifiers.join("")}`,
            `[${this.display}]`
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
                DiceRoll._checkCondition(value, conditionals)
            );
        while (
            i < times &&
            toReroll.filter(([, { value }]) =>
                DiceRoll._checkCondition(value, conditionals)
            ).length > 0
        ) {
            i++;
            toReroll.map(([, roll]) => {
                roll.modifiers.add("r");
                roll.value = this._getRandomBetween();
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
                DiceRoll._checkCondition(value, conditionals)
            );

        toExplode.forEach(([index, value]) => {
            let newRoll = this._getRandomBetween();
            i++;
            value.modifiers.add("!");
            value.value += newRoll;
            this.results.set(index, value);
            while (
                i < times &&
                DiceRoll._checkCondition(newRoll, conditionals)
            ) {
                i++;
                newRoll = this._getRandomBetween();
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
            DiceRoll._checkCondition(value, conditionals)
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
            while (
                i < times &&
                DiceRoll._checkCondition(newRoll, conditionals)
            ) {
                let previous = this.results.get(key + inserted + i);
                previous.modifiers.add("!");

                newRoll = this._getRandomBetween();

                /** Insert the new roll into the results map */
                this._insertIntoMap(this.results, key + inserted + i + 1, {
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

    /**
     * Inserts a new result into a results map.
     *
     * @private
     * @param {ResultMapInterface} map Results map to modify.
     * @param {number} index Index to insert the new value.
     * @param {ResultInterface} value Value to insert.
     * @memberof DiceRoll
     */
    private _insertIntoMap(
        map: ResultMapInterface,
        index: number,
        value: ResultInterface
    ) {
        /** Get all values above index, then reverse them */
        let toUpdate = [...map].slice(index).reverse();
        /** Loop through the values and re-insert them into the map at key + 1 */
        toUpdate.forEach(([key, value]) => {
            map.set(key + 1, value);
        });
        /** Insert the new value at the specified index */
        map.set(index, value);
    }

    get sum() {
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
            return `${this.sum}`
        }
        return `[${[...this.results]
            .map(
                ([, { modifiers, value }]) =>
                    `${value}${[...modifiers].join("")}`
            )
            .join(", ")}]`;
    }
    roll() {
        if (this.static) {
            return [Number(this.dice)];
        }
        return [...Array(this.rolls)].map(() => this._getRandomBetween());
    }
    private _getRandomBetween(
        min: number = this.faces.min,
        max: number = this.faces.max
    ): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    private static _checkCondition(
        value: number,
        conditions: Conditional[]
    ): boolean {
        return conditions.every(({ operator, comparer }) => {
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
}
