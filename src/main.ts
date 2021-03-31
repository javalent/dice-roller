import { Plugin, MarkdownPostProcessorContext, Notice } from "obsidian";
//@ts-ignore
import lexer from "lex";

import { faDice } from "@fortawesome/free-solid-svg-icons";
import { icon } from "@fortawesome/fontawesome-svg-core";

import "./main.css";

interface Lexeme {
    type: string;
    data: string;
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
                            let { result, /* map, */ text } = this.parseDice(
                                dice
                            );

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
                        new Notice(
                            `There was an error parsing the dice string: ${node.innerText}`
                        );
                        return;
                    }
                });
            }
        );

        this.lexer = new lexer();

        this.lexer.addRule(/\s+/, function () {
            /* skip whitespace */
        });
        this.lexer.addRule(/[{}]+/, function () {
            /* skip brackets */
        });

        this.lexer.addRule(
            /([0-9]\d*)?[Dd]?([0-9]\d*)/,
            function (lexeme: string) {
                return {
                    type: "dice",
                    data: lexeme
                }; // symbols
            }
        );

        this.lexer.addRule(/[\(\^\+\-\*\/\)]/, function (lexeme: string) {
            return {
                type: "math",
                data: lexeme
            }; // punctuation ("^", "(", "+", "-", "*", "/", ")")
        });

        this.lexer.addRule(/kh?[^l]\d*/, function (lexeme: string) {
            return { type: "kh", data: lexeme.replace(/^\D+/g, "") };
        });
        this.lexer.addRule(/dl[^h]\d*/, function (lexeme: string) {
            return { type: "dl", data: lexeme.replace(/^\D+/g, "") };
        });

        this.lexer.addRule(/kl\d*/, function (lexeme: string) {
            return { type: "kl", data: lexeme.replace(/^\D+/g, "") };
        });
        this.lexer.addRule(/dh\d*/, function (lexeme: string) {
            return { type: "dh", data: lexeme.replace(/^\D+/g, "") };
        });

        this.lexer.addRule(/!/, function (lexeme: string) {
            return { type: "!", data: "" };
        });

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
        let stack: number[][] = [],
            diceMap: Array<[string, any[]]> = [];

        this.parse(text).forEach((d) => {
            switch (d.type) {
                case "+":
                case "-":
                case "*":
                case "/":
                case "^":
                case "math":
                    let b = stack
                        .pop()
                        .reduce((acc: number, curr: number) => acc + curr, 0);
                    let a = stack
                        .pop()
                        .reduce((acc: number, curr: number) => acc + curr, 0);
                    stack.push([this.operators[d.data](a, b)]);
                    break;
                case "kh":
                case "dl": {
                    const order = [...stack[stack.length - 1]].map((s, i) => [
                        s,
                        i
                    ]);
                    let num = Number(d.data) || 1;

                    if (d.type === "dl") num = order.length - num;
                    stack[stack.length - 1] = order
                        .sort((a, b) => a[0] - b[0])
                        .slice(-1 * num)
                        .sort((a, b) => a[1] - b[1])
                        .map((s) => s[0]);

                    const diceOrder = diceMap[
                        diceMap.length - 1
                    ][1].map((s, i) => [s, i]);

                    diceMap[diceMap.length - 1][1] = diceOrder
                        .sort((a, b) => a[0] - b[0])
                        .map((n, i, a) =>
                            i < a.length - num ? [`${n[0]}d`, n[1]] : n
                        )
                        .sort((a, b) => a[1] - b[1])
                        .map((s) => s[0]);

                    text = text.replace(/(kh?|dl)\d*/, "");

                    break;
                }
                case "kl":
                case "dh": {
                    const order = [...stack[stack.length - 1]].map((s, i) => [
                        s,
                        i
                    ]);
                    let num = Number(d.data) || 1;
                    if (d.type === "dh") num = order.length - num;

                    stack[stack.length - 1] = order
                        .sort((a, b) => b[0] - a[0])
                        .slice(-1 * num)
                        .sort((a, b) => a[1] - b[1])
                        .map((s) => s[0]);

                    const diceOrder = diceMap[
                        diceMap.length - 1
                    ][1].map((s, i) => [s, i]);

                    diceMap[diceMap.length - 1][1] = diceOrder
                        .sort((a, b) => b[0] - a[0])
                        .map((n, i, a) =>
                            i < a.length - num ? [`${n[0]}d`, n[1]] : n
                        )
                        .sort((a, b) => a[1] - b[1])
                        .map((s) => s[0]);
                    text = text.replace(/(kl?|dh)\d*/, "");
                    break;
                }
                case "!": {
                    let roll = stack[stack.length - 1];
                    let d = diceMap[diceMap.length - 1][0].match(
                        /\d*[dD](\d+)/
                    );
                    let dice = Number(d[1]);
                    roll.forEach((result) => {
                        if (result == dice) {
                            roll.push(this.roll(`1d${dice}`)[0]);
                        }
                    });

                    console.log(roll, dice);

                    break;
                }
                case "dice":
                    const res = this.roll(d.data);
                    if (!Number(d.data)) diceMap.push([d.data, res]);
                    stack.push(res);
                    break;
            }
        });
        diceMap.forEach(([roll, result]) => {
            text = text.replace(roll, `[${result.join(", ")}]`);
        });
        return {
            result: stack[0].reduce(
                (acc: number, curr: number) => acc + curr,
                0
            ),
            text: text
        };
    }

    roll(dice: string): number[] {
        if (!/([0-9]\d*)[dD]?([0-9]\d*)?/.test(dice)) return;
        let [, amount, faces] = dice.match(/([0-9]\d*)[dD]?([0-9]\d*)?/);
        if (!faces) return [Number(amount)];
        let result = [...Array(Number(amount))].map(
            () => Math.floor(Math.random() * Number(faces)) + 1
        );

        return result;
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
