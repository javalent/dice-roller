import {
    Plugin,
    MarkdownPostProcessorContext,
    Notice,
    TFile,
    addIcon,
    setIcon
} from "obsidian";
//@ts-ignore
import lexer from "lex";

import { faDice } from "@fortawesome/free-solid-svg-icons";
import { icon } from "@fortawesome/fontawesome-svg-core";

import "./main.css";
import { DiceRoll, LinkRoll } from "./roller";
import { Parser } from "./parser";
import { IConditional, ILexeme } from "src/types";
import { extract } from "./util";

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

export default class DiceRoller extends Plugin {
    lexer: lexer;
    parser: Parser;
    async onload() {
        console.log("DiceRoller plugin loaded");

        const ICON_DEFINITION = Symbol("dice-roller-icon").toString();
        const ICON_SVG = icon(faDice).html[0];

        addIcon(ICON_DEFINITION, ICON_SVG);

        this.registerMarkdownPostProcessor(
            async (el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
                let nodeList = el.querySelectorAll("code");
                if (!nodeList.length) return;

                for (const node of Array.from(nodeList)) {
                    if (!/^dice:\s*([\s\S]+)\s*?/.test(node.innerText)) return;
                    try {
                        let [, content] = node.innerText.match(
                            /^dice:\s*([\s\S]+)\s*?/
                        );

                        let { result, text, link } = await this.parseDice(
                            content
                        );

                        let container = createDiv().createDiv({
                            cls: "dice-roller"
                        });
                        container.setAttr("data-dice", content);

                        let diceSpan = container.createSpan();
                        diceSpan.innerText = `${result.toLocaleString(
                            navigator.language,
                            { maximumFractionDigits: 2 }
                        )}`;

                        setIcon(
                            container.createDiv({ cls: "dice-roller-button" }),
                            ICON_DEFINITION
                        );

                        node.replaceWith(container);

                        container.addEventListener("click", async (evt) => {
                            if (link && evt.getModifierState("Control")) {
                                await this.app.workspace.openLinkText(
                                    link.replace("^", "#^").split(/\|/).shift(),
                                    this.app.workspace.getActiveFile()?.path,
                                    true
                                );
                                return;
                            }
                            ({ result, text } = await this.parseDice(content));

                            diceSpan.innerText = `${result.toLocaleString(
                                navigator.language,
                                { maximumFractionDigits: 2 }
                            )}`;

                            this.buildTooltip(
                                container,
                                `${content}\n${text}`,
                                {
                                    delay: 0,
                                    gap: 2,
                                    placement: "top"
                                }
                            );
                        });
                        container.addEventListener(
                            "mouseenter",
                            (evt: MouseEvent) => {
                                this.buildTooltip(
                                    container,
                                    `${content}\n${text}`,
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
                            `There was an error parsing the dice string: ${node.innerText}.\n\n${e}`,
                            5000
                        );
                        return;
                    }
                }
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
            function (lexeme: string): ILexeme {
                return {
                    type: "math",
                    data: lexeme,
                    original: lexeme,
                    conditionals: null
                }; // punctuation ("^", "(", "+", "-", "*", "/", ")")
            }
        );

        this.lexer.addRule(
            /((\d+)[Dd])?\[\[([\s\S]+?)#?\^([\s\S]+?)\]\]\|?([\s\S]+)?/,
            function (lexeme: string): ILexeme {
                /* let [, link] = lexeme.match(/\d+[Dd]\[\[([\s\S]+?)\]\]/); */

                return {
                    type: "link",
                    data: lexeme,
                    original: lexeme,
                    conditionals: null
                };
            }
        );

        this.lexer.addRule(
            /(\d+)([Dd]\[?(?:(-?\d+)\s?,)?\s?(-?\d+|%|F)\]?)?/,
            function (lexeme: string): ILexeme {
                let [, dice] = lexeme.match(
                        /(\d+(?:[Dd]?\[?(?:-?\d+\s?,)?\s?(?:-?\d+|%|F)\]?)?)/
                    ),
                    conditionals: IConditional[] = [];
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

        this.lexer.addRule(
            /kh?(?!:l)(\d*)/,
            function (lexeme: string): ILexeme {
                /** keep high */
                return {
                    type: "kh",
                    data: lexeme.replace(/^\D+/g, ""),
                    original: lexeme,
                    conditionals: null
                };
            }
        );
        this.lexer.addRule(/dl?(?!:h)\d*/, function (lexeme: string): ILexeme {
            /** drop low */
            return {
                type: "dl",
                data: lexeme.replace(/^\D+/g, ""),
                original: lexeme,
                conditionals: null
            };
        });

        this.lexer.addRule(/kl\d*/, function (lexeme: string): ILexeme {
            /** keep low */
            return {
                type: "kl",
                data: lexeme.replace(/^\D+/g, ""),
                original: lexeme,
                conditionals: null
            };
        });
        this.lexer.addRule(/dh\d*/, function (lexeme: string): ILexeme {
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
            function (lexeme: string): ILexeme {
                /** explode and combine */
                let [, data = `1`] = lexeme.match(
                        /!!(i|\d+)?(?:(!?=|=!|>=?|<=?)(-?\d+))*/
                    ),
                    conditionals: IConditional[] = [];
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
            function (lexeme: string): ILexeme {
                /** explode */
                let [, data = `1`] = lexeme.match(
                        /!(i|\d+)?(?:(!?=|=!?|>=?|<=?)(-?\d+))*/
                    ),
                    conditionals: IConditional[] = [];
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
            function (lexeme: string): ILexeme {
                /** reroll */
                let [, data = `1`] = lexeme.match(
                        /r(i|\d+)?(?:(!?=|=!|>=?|<=?)(-?\d+))*/
                    ),
                    conditionals: IConditional[] = [];
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
    async parseDice(
        text: string
    ): Promise<{ result: string | number; text: string; link?: string }> {
        return new Promise(async (resolve, reject) => {
            let stack: Array<string | number> = [],
                diceMap: DiceRoll[] = [],
                linkMap: LinkRoll;

            parse: for (const d of this.parse(text)) {
                switch (d.type) {
                    case "+":
                    case "-":
                    case "*":
                    case "/":
                    case "^":
                    case "math":
                        const b = stack.pop(),
                            a = stack.pop(),
                            result = this.operators[d.data](a, b);

                        stack.push(new DiceRoll(`${result}`).result);
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
                        stack.push(diceMap[diceMap.length - 1].result);
                        break;
                    case "link":
                        const [, roll, link, block, header] = d.data.match(
                                /(?:(\d+)[Dd])?\[\[([\s\S]+?)#?\^([\s\S]+?)\]\]\|?([\s\S]+)?/
                            ),
                            file =
                                await this.app.metadataCache.getFirstLinkpathDest(
                                    link,
                                    ""
                                );
                        if (!file || !(file instanceof TFile))
                            reject(
                                "Could not read file cache. Is the link correct?\n\n" +
                                    link
                            );
                        const cache = await this.app.metadataCache.getFileCache(
                            file
                        );
                        if (!cache || !cache.blocks || !cache.blocks[block])
                            reject(
                                "Could not read file cache. Does the block reference exist?\n\n" +
                                    `${link} > ${block}`
                            );
                        const data = cache.blocks[block];

                        const content = (
                            await this.app.vault.read(file)
                        )?.slice(
                            data.position.start.offset,
                            data.position.end.offset
                        );
                        let table = extract(content);
                        let opts: string[];
                        if (header && table.columns[header]) {
                            opts = table.columns[header];
                        } else {
                            if (header)
                                reject(
                                    `Header ${header} was not found in table ${link} > ${block}.`
                                );
                            opts = table.rows;
                            /* opts = Object.entries(table).map(([, entries]) =>
                                entries.join(", ")
                            ); */
                        }

                        linkMap = new LinkRoll(
                            Number(roll ?? 1),
                            opts,
                            d.data,
                            link,
                            block
                        );
                        stack = [linkMap.result];

                        break parse;
                }
            }
            diceMap.forEach((diceInstance) => {
                text = text.replace(
                    `${diceInstance.dice}${diceInstance.modifiers.join("")}`,
                    diceInstance.display
                );
            });
            if (linkMap) {
                text = text.replace(
                    linkMap.text,
                    `${linkMap.link} > ${linkMap.block}`
                );
            }

            resolve({
                result: stack[0],
                text: text,
                link: `${linkMap?.link}#^${linkMap?.block}` ?? null
            });
        });
    }
    parse(input: string): ILexeme[] {
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
        const { width: ttWidth, height: ttHeight } =
            this.tooltip.getBoundingClientRect();
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
