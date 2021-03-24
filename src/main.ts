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
                        let results = this.parseDice(dice);

                        let container = createDiv().createDiv({
                            cls: "dice-roller"
                        });
                        container.setAttr("data-dice", dice);

                        let diceSpan = container.createSpan();
                        diceSpan.innerText = `${results}`;

                        container
                            .createDiv({ cls: "dice-roller-button" })
                            .appendChild(icon(faDice).node[0]) as HTMLElement;
                        parent.replaceChild(container, node);
                        container.addEventListener("click", () => {
                            let results = this.parseDice(dice);
                            diceSpan.innerText = `${results}`;
                        });
                        interface HoverPopoverWithElement extends HoverPopover {
                            hoverEl: HTMLElement;
                        }
                        container.addEventListener(
                            "mouseenter",
                            (evt: MouseEvent) => {
                                this.buildTooltip(container, dice, {
                                    delay: 0,
                                    gap: 2,
                                    placement: "top"
                                });

                                /* let containerDims = (evt.target as HTMLElement).getBoundingClientRect();
                                let hover = new HoverPopover(
                                    container.parentElement,
                                    evt.target as HTMLElement,
                                    0
                                ) as HoverPopoverWithElement; */
                                /* hover.onload = () => {
                                    console.log(
                                        hover.hoverEl.getBoundingClientRect()
                                    );
                                    hover.hoverEl.addClass(
                                        "tooltip",
                                        "mod-top"
                                    );
                                    hover.hoverEl.removeClass(
                                        "popover",
                                        "hover-popover"
                                    );
                                    hover.hoverEl.removeClass(
                                        "popover",
                                        "hover-popover"
                                    );
                                    hover.hoverEl.appendChild(
                                        createSpan({}, (s) => {
                                            s.innerText = dice;
                                        })
                                    );

                                    let arrow = createDiv({
                                        cls: "tooltip-arrow"
                                    });
                                    hover.hoverEl.appendChild(arrow);
                                    let top =
                                        containerDims.top -
                                        hover.hoverEl.getBoundingClientRect()
                                            .height;
                                    let left =
                                        containerDims.left +
                                        containerDims.width / 2;
                                    console.log(
                                        "🚀 ~ file: main.ts ~ line 130 ~ DiceRoller ~ container.addEventListener ~ left",
                                        hover.hoverEl.getBoundingClientRect()
                                            .width
                                    );
                                    hover.hoverEl.setAttribute(
                                        "style",
                                        `top: ${top - 5}px; left: ${left}px;`
                                    );
                                }; */
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
    parseDice(text: string): number {
        let stack: number[] = [];
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
                    stack.push(
                        this.roll(d).reduce((acc, curr) => acc + curr, 0)
                    );
            }
        });
        return stack[0];
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
        let placement = params.placement ? params.placement : "top";
        let classes = params.classes ? params.classes : [];
        let gap = params.gap ? params.gap : 4;
        let delay = params.delay ? params.delay : 0;
        if (delay > 0) {
            //timeout
        }
        const { top, left, width, height } = element.getBoundingClientRect();
        let b = 0;
        let w = 0;

        if (this.tooltip && this.tooltipTarget === element) {
            this.tooltip.setText(text);
        } else {
            this.clearTooltip();
            this.tooltip = createDiv({
                cls: "tooltip",
                text: text
            });
        }

        let arrow = this.tooltip.createDiv("tooltip-arrow");

        switch (placement) {
            case "bottom": {
                b = top + height + gap;
                w = left + width / 2;
                break;
            }
            case "right": {
                b = top + height / 2;
                w = left + width + gap;
                classes.push("mod-right");
                break;
            }
            case "left": {
                b = top + height / 2;
                w = left - gap;
                classes.push("mod-left");
                break;
            }
            case "top": {
                b = top - gap - 5;
                w = left + width / 2;
                classes.push("mod-top");
                break;
            }
        }

        this.tooltip.addClasses(classes);
        this.tooltip.style.top = "0px";
        this.tooltip.style.left = "0px";
        this.tooltip.style.width = "";
        this.tooltip.style.height = "";
        (this.tooltip.parentNode || document.body).appendChild(this.tooltip);

        var k = this.tooltip.getBoundingClientRect(),
            C = ["bottom", "top"].contains(placement) ? k.width / 2 : k.width,
            x = ["left", "right"].contains(placement) ? k.height / 2 : k.height;
        if (
            ("left" === placement ? (w -= C) : "top" === placement && (b -= x),
            b + x > window.innerHeight && (b = window.innerHeight - x - gap),
            (b = Math.max(b, gap)),
            "top" === placement || "bottom" === placement)
        ) {
            if (w + C > window.innerWidth)
                (w -= E = w + C + gap - window.innerWidth),
                    (arrow.style.left = "initial"),
                    (arrow.style.right = C - E - gap / 2 + "px");
            else if (w - gap - C < 0) {
                var E;
                (w += E = -(w - gap - C)),
                    (arrow.style.right = "initial"),
                    (arrow.style.left = C - E - gap / 2 + "px");
            }
            w = Math.max(w, gap);
        }

        this.tooltip.style.top = b + "px";
        this.tooltip.style.left = w + "px";
        this.tooltip.style.width = k.width + "px";
        this.tooltip.style.height = k.height + "px";
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
