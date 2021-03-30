import {
    Plugin,
    MarkdownPostProcessorContext,
    Notice,
    HoverPopover
} from "obsidian";
//@ts-ignore
import lexer from "lex";

import { faDice } from "@fortawesome/free-solid-svg-icons";
import { icon } from "@fortawesome/fontawesome-svg-core";

import "./main.css";
import { platform } from "node:os";

class Parser {
    table: any;
    constructor(table: any) {
        this.table = table;
    }
    parse(input: string[]) {
        var length = input.length,
            table = this.table,
            output = [],
            stack = [],
            index = 0;

        while (index < length) {
            var token = input[index++];

            switch (token) {
                case "(":
                    stack.unshift(token);
                    break;
                case ")":
                    while (stack.length) {
                        var token = stack.shift();
                        if (token === "(") break;
                        else output.push(token);
                    }

                    if (token !== "(")
                        throw new Error("Mismatched parentheses.");
                    break;
                default:
                    if (table.hasOwnProperty(token)) {
                        while (stack.length) {
                            var punctuator = stack[0];

                            if (punctuator === "(") break;

                            var operator = table[token],
                                precedence = operator.precedence,
                                antecedence = table[punctuator].precedence;

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
            if (token !== "(") output.push(token);
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
                    if (
                        !/^dice:\s*([0-9]+[dD]?[0-9]*[-+*^\(\)]*)\s*?/.test(
                            node.innerText
                        )
                    )
                        return;
                    let parent = node.parentElement;

                    try {
                        let [, dice] = node.innerText.match(
                            /^dice:\s*([\s\S]+)\s*?/
                        );
                        

                        dice = dice.split(" ").join("").trim();
                        let { result, map } = this.parseDice(dice);

                        let container = createDiv().createDiv({
                            cls: "dice-roller"
                        });
                        container.setAttr("data-dice", dice);

                        let diceSpan = container.createSpan();
                        diceSpan.innerText = `${result}`;

                        container
                            .createDiv({ cls: "dice-roller-button" })
                            .appendChild(icon(faDice).node[0]) as HTMLElement;

                        parent.replaceChild(container, node);

                        container.addEventListener("click", () => {
                            let { result, map } = this.parseDice(dice);

                            diceSpan.innerText = `${result}`;
                            let text = `${dice}`;
                            map.forEach(([roll, result]) => {
                                text = text.replace(
                                    roll,
                                    `[${result.join(", ")}]`
                                );
                            });

                            this.buildTooltip(container, `${dice}\n${text}`, {
                                delay: 0,
                                gap: 2,
                                placement: "top"
                            });
                        });
                        container.addEventListener(
                            "mouseenter",
                            (evt: MouseEvent) => {
                                let text = `${dice}`;
                                map.forEach(([roll, result]) => {
                                    text = text.replace(
                                        roll,
                                        `[${result.join(", ")}]`
                                    );
                                });

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
            /([0-9]\d*)+[Dd]?([0-9]\d*)?/,
            function (lexeme: string) {
                return lexeme; // symbols
            }
        );

        this.lexer.addRule(/[\(\^\+\-\*\/\)]/, function (lexeme: string) {
            return lexeme; // punctuation (i.e. "(", "+", "-", "*", "/", ")")
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
    parseDice(text: string): { result: number; map: any[] } {
        let stack: number[] = [],
            diceMap: Array<[string, number[]]> = [];
        this.parse(text).forEach((d) => {
            switch (d) {
                case "+":
                case "-":
                case "*":
                case "/":
                case "^":
                    let b = stack.pop();
                    let a = stack.pop();
                    stack.push(this.operators[d](a, b));
                    break;
                default:
                    const res = this.roll(d);
                    if (!Number(d)) diceMap.push([d, res]);
                    stack.push(
                        res.reduce((acc: number, curr: number) => acc + curr, 0)
                    );
            }
        });
        return { result: stack[0], map: diceMap };
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

    parse(input: string): string[] {
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
