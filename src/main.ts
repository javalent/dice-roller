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
import {
    DiceRoll,
    TableRoll,
    SectionRoller,
    StuntRoll,
    FileRoller
} from "./roller";
import { Parser } from "./parser";
import { Conditional, Lexeme } from "src/types";
import { extract } from "./util";
import { MATH_REGEX, SECTION_REGEX, TABLE_REGEX, TAG_REGEX } from "./constants";
import SettingTab from "./settings";

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
//expose dataview plugin for tags
declare module "obsidian" {
    interface App {
        plugins: {
            plugins: {
                dataview: {
                    index: {
                        tags: {
                            invMap: Map<string, Set<string>>;
                            map: Map<string, Set<string>>;
                        };
                        etags: {
                            invMap: Map<string, Set<string>>;
                            map: Map<string, Set<string>>;
                        };
                    };
                };
            };
        };
    }
}

export default class DiceRoller extends Plugin {
    lexer: lexer;
    parser: Parser;
    returnAllTags: boolean;
    rollLinksForTags: boolean;
    async onload() {
        console.log("DiceRoller plugin loaded");

        const data = Object.assign(
            {
                returnAllTags: true,
                rollLinksForTags: false
            },
            await this.loadData()
        );
        this.returnAllTags = data.returnAllTags ?? true;
        this.rollLinksForTags = data.rollLinksForTags ?? false;

        this.addSettingTab(new SettingTab(this.app, this));

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

                        let { text, link, renderMap, tableMap, type, fileMap } =
                            await this.parseDice(content);

                        let container = createDiv().createDiv({
                            cls: "dice-roller",
                            attr: {
                                "aria-label": `${content}\n${text}`,
                                "aria-label-position": "top",
                                "data-dice": content
                            }
                        });

                        if (type === "render") {
                            container.addClasses([
                                "has-embed",
                                "markdown-embed"
                            ]);
                        }

                        let resultEl = container.createDiv();
                        this.reroll(
                            null,
                            container,
                            resultEl,
                            content,
                            link,
                            renderMap,
                            tableMap,
                            fileMap,
                            type,
                            ctx.sourcePath
                        );

                        const icon = container.createDiv({
                            cls: "dice-roller-button"
                        });
                        setIcon(icon, ICON_DEFINITION);

                        node.replaceWith(container);

                        container.onclick = (evt) =>
                            this.reroll(
                                evt,
                                container,
                                resultEl,
                                content,
                                link,
                                renderMap,
                                tableMap,
                                fileMap,
                                type,
                                ctx.sourcePath
                            );
                        icon.onclick = (evt) =>
                            this.reroll(
                                evt,
                                container,
                                resultEl,
                                content,
                                link,
                                renderMap,
                                tableMap,
                                fileMap,
                                type,
                                ctx.sourcePath
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
    async reroll(
        evt: MouseEvent,
        container: HTMLElement,
        resultEl: HTMLElement,
        content: string,
        link: string,
        renderMap: Map<string, SectionRoller[]>,
        tableMap: TableRoll,
        fileMap: FileRoller,
        type: "dice" | "table" | "render" | "file",
        sourcePath: string
    ) {
        resultEl.empty();
        if (type === "dice") {
            let { result, text } = await this.parseDice(content);
            container.setAttrs({
                "aria-label": `${content}\n${text}`
            });
            resultEl.setText(
                result.toLocaleString(navigator.language, {
                    maximumFractionDigits: 2
                })
            );
        } else if (type === "table") {
            if (link && evt && evt.getModifierState("Control")) {
                await this.app.workspace.openLinkText(
                    link.replace("^", "#^").split(/\|/).shift(),
                    this.app.workspace.getActiveFile()?.path,
                    true
                );
                return;
            }
            resultEl.empty();
            tableMap.roll();
            const split = tableMap.result.split(/(\[\[(?:[\s\S]+?)\]\])/);

            for (let str of split) {
                if (/\[\[(?:[\s\S]+?)\]\]/.test(str)) {
                    //link;
                    const [, match] = str.match(/\[\[([\s\S]+?)\]\]/);
                    const internal = resultEl.createEl("a", {
                        cls: "internal-link",
                        text: match
                    });
                    internal.onmouseover = () => {
                        this.app.workspace.trigger(
                            "link-hover",
                            this, //not sure
                            internal, //targetEl
                            match.replace("^", "#^").split("|").shift(), //linkText
                            this.app.workspace.getActiveFile()?.path //source
                        );
                    };
                    internal.onclick = async (ev: MouseEvent) => {
                        ev.stopPropagation();
                        await this.app.workspace.openLinkText(
                            match.replace("^", "#^").split(/\|/).shift(),
                            this.app.workspace.getActiveFile()?.path,
                            ev.getModifierState("Control")
                        );
                    };
                    continue;
                }
                resultEl.createSpan({ text: str });
            }
        } else if (type === "render") {
            resultEl.empty();
            resultEl.addClass("internal-embed");
            for (let [file, elements] of Array.from(renderMap)) {
                const holder = resultEl.createDiv({
                    attr: {
                        "aria-label": file
                    }
                });
                if (renderMap.size > 1) {
                    holder.createEl("h5", {
                        cls: "dice-file-name",
                        text: file
                    });
                }

                for (let el of elements) {
                    el.roll();
                    el.element(holder.createDiv());
                    el.on("open-link", async (link) => {
                        if (link) {
                            await this.app.workspace.openLinkText(
                                link.replace("^", "#^").split(/\|/).shift(),
                                this.app.workspace.getActiveFile()?.path,
                                true
                            );
                        }
                    });
                }
            }
        } else if (type === "file") {
            fileMap.roll();
            container.setAttrs({
                "aria-label": `${content}\n${fileMap.display}`
            });

            const link = await fileMap.element(sourcePath);
            link.onclick = async (evt) => {
                evt.stopPropagation();
                this.app.workspace.openLinkText(
                    fileMap.result.replace("^", "#^").split(/\|/).shift(),
                    this.app.workspace.getActiveFile()?.path,
                    true
                );
            };
            resultEl.empty();
            resultEl.appendChild(link);
        }
    }

    addLexerRules() {
        this.lexer.addRule(/\s+/, function () {
            /* skip whitespace */
        });
        this.lexer.addRule(/[{}]+/, function () {
            /* skip brackets */
        });
        this.lexer.addRule(MATH_REGEX, function (lexeme: string): Lexeme {
            return {
                type: "math",
                data: lexeme,
                original: lexeme,
                conditionals: null
            };
        });

        this.lexer.addRule(TABLE_REGEX, function (lexeme: string): Lexeme {
            return {
                type: "table",
                data: lexeme,
                original: lexeme,
                conditionals: null
            };
        });
        this.lexer.addRule(SECTION_REGEX, function (lexeme: string): Lexeme {
            return {
                type: "section",
                data: lexeme,
                original: lexeme,
                conditionals: null
            };
        });

        this.lexer.addRule(TAG_REGEX, function (lexeme: string): Lexeme {
            return {
                type: "tag",
                data: lexeme,
                original: lexeme,
                conditionals: null
            };
        });

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
        this.lexer.addRule(/1[Dd]S/, function (lexeme: string): Lexeme {
            const [, dice] = lexeme.match(/1[Dd]S/) ?? [, "1"];
            return {
                type: "stunt",
                data: dice,
                original: lexeme,
                conditionals: []
            }; // symbols
        });

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
    async parseDice(text: string): Promise<{
        result: string | number;
        text: string;
        link?: string;
        tableMap: TableRoll;
        fileMap: FileRoller;
        renderMap: Map<string, SectionRoller[]>;
        type: "dice" | "table" | "render" | "file";
    }> {
        return new Promise(async (resolve, reject) => {
            let stack: Array<DiceRoll | StuntRoll> = [],
                diceMap: DiceRoll[] = [],
                tableMap: TableRoll,
                renderMap: Map<string, SectionRoller[]> = new Map(),
                fileMap: FileRoller,
                type: "dice" | "table" | "render" | "file" = "dice";
            const parsed = this.parse(text);
            let stunted: string = "";
            for (const d of parsed) {
                if (d.type === "table") {
                    type = "table";
                    const [, roll = 1, link, block, header] =
                            d.data.match(TABLE_REGEX),
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
                    if (
                        !cache ||
                        !cache.blocks ||
                        !cache.blocks[block.toLowerCase()]
                    )
                        reject(
                            "Could not read file cache. Does the block reference exist?\n\n" +
                                `${link} > ${block}`
                        );
                    const data = cache.blocks[block.toLowerCase()];

                    const content = (await this.app.vault.read(file))?.slice(
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
                    }

                    tableMap = new TableRoll(
                        Number(roll ?? 1),
                        opts,
                        d.data,
                        link,
                        block
                    );

                    if (parsed.length > 1) {
                        new Notice(
                            `Random tables cannot be used with modifiers.`
                        );
                    }
                    break;
                } else if (d.type === "section") {
                    type = "render";
                    const [, roll = 1, link, filter] =
                            d.data.match(SECTION_REGEX),
                        file =
                            await this.app.metadataCache.getFirstLinkpathDest(
                                link,
                                ""
                            );
                    let types: string[];
                    if (filter && filter.length) {
                        types = filter.split(",");
                    }
                    if (!file || !(file instanceof TFile))
                        reject(
                            "Could not read file cache. Is the link correct?\n\n" +
                                link
                        );
                    const cache = await this.app.metadataCache.getFileCache(
                        file
                    );
                    if (!cache || !cache.sections || !cache.sections.length)
                        reject("Could not read file cache.");
                    const content = await this.app.vault.read(file);
                    const data = cache.sections
                        .filter(({ type }) =>
                            types
                                ? types.includes(type)
                                : !["yaml", "thematicBreak"].includes(type)
                        )
                        .map((cache) => {
                            return {
                                ...cache,
                                file: file.basename
                            };
                        });

                    const roller = new SectionRoller(
                        Number(roll),
                        data,
                        new Map([[file.basename, content]]),
                        file.basename
                    );

                    renderMap.set(file.basename, [
                        ...(renderMap.get(file.basename) ?? []),
                        roller
                    ]);

                    break;
                } else if (d.type === "tag") {
                    type = "render";
                    if (!this.app.plugins.plugins.dataview) {
                        new Notice(
                            "Tags are only supported with the Dataview plugin installed."
                        );
                        return;
                    }
                    const [, roll = 1, tag, collapseTrigger, filter] =
                        d.data.match(TAG_REGEX);

                    const collapse =
                        collapseTrigger === "-"
                            ? true
                            : collapseTrigger === "+"
                            ? false
                            : !this.returnAllTags;

                    let types: string[];
                    if (filter && filter.length) {
                        types = filter.split(",");
                    }
                    const files =
                        this.app.plugins.plugins.dataview.index.tags.invMap.get(
                            tag
                        );
                    if (!files || !files.size) {
                        reject(
                            "No files found with that tag. Is the tag correct?\n\n" +
                                tag
                        );
                    }

                    if (
                        filter === "link" ||
                        (this.rollLinksForTags && !types?.length)
                    ) {
                        fileMap = new FileRoller(
                            1,
                            [...files],
                            this.app.metadataCache
                        );
                        type = "file";
                    } else {
                        const couldNotRead = [],
                            noCache = [];
                        for (let link of files) {
                            let file =
                                await this.app.metadataCache.getFirstLinkpathDest(
                                    link,
                                    ""
                                );
                            if (!file || !(file instanceof TFile))
                                couldNotRead.push(link);
                            const cache =
                                await this.app.metadataCache.getFileCache(file);
                            if (
                                !cache ||
                                !cache.sections ||
                                !cache.sections.length
                            )
                                noCache.push(link);

                            const content = await this.app.vault.read(file);
                            const data = cache.sections
                                .filter(({ type }) =>
                                    types
                                        ? types.includes(type)
                                        : !["yaml", "thematicBreak"].includes(
                                              type
                                          )
                                )
                                .map((cache) => {
                                    return {
                                        ...cache,
                                        file: file.basename
                                    };
                                });

                            if (collapse) {
                                let roller;
                                const rollers = renderMap.get("all");
                                if (rollers && rollers.length) {
                                    roller = rollers.shift();
                                    roller.options = [
                                        ...roller.options,
                                        ...data
                                    ];
                                    roller.content.set(file.basename, content);
                                } else {
                                    roller = new SectionRoller(
                                        Number(roll),
                                        data,
                                        new Map([[file.basename, content]]),
                                        "all"
                                    );
                                }
                                renderMap.set("all", [
                                    ...(renderMap.get("all") ?? []),
                                    roller
                                ]);
                            } else {
                                const roller = new SectionRoller(
                                    Number(roll),
                                    data,
                                    new Map([[file.basename, content]]),
                                    file.basename
                                );
                                renderMap.set(file.basename, [
                                    ...(renderMap.get(file.basename) ?? []),
                                    roller
                                ]);
                            }
                        }
                    }
                    break;
                } else {
                    switch (d.type) {
                        case "+":
                        case "-":
                        case "*":
                        case "/":
                        case "^":
                        case "math":
                            const b = stack.pop(),
                                a = stack.pop(),
                                result = this.operators[d.data](
                                    a.result,
                                    b.result
                                );

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

                            diceInstance.explodeAndCombine(
                                data,
                                d.conditionals
                            );
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
                        case "stunt":
                            let stunt = new StuntRoll(d.original);
                            diceMap.push(stunt);

                            if (stunt.doubles) {
                                stunted = ` - ${
                                    stunt.results.get(0).value
                                } Stunt Points`;
                            }

                            stack.push(diceMap[diceMap.length - 1]);
                    }
                }
            }
            diceMap.forEach((diceInstance) => {
                text = text.replace(
                    `${diceInstance.dice}${diceInstance.modifiers.join("")}`,
                    diceInstance.display
                );
            });
            if (tableMap) {
                text = text.replace(
                    tableMap.text,
                    `${tableMap.link} > ${tableMap.block}`
                );
            }
            if (renderMap && renderMap.size) {
                text = `Results from ${renderMap.size} file${
                    renderMap.size != 1 ? "s" : ""
                }`;
            }

            if (fileMap) {
                text = fileMap.result;
            }

            resolve({
                result: stack.length ? `${stack[0].text}${stunted}` : null,
                text: text,
                link: `${tableMap?.link}#^${tableMap?.block}` ?? null,
                type,
                tableMap,
                renderMap,
                fileMap
            });
        });
    }
    parse(input: string): Lexeme[] {
        this.lexer.setInput(input);
        var tokens = [],
            token;
        while ((token = this.lexer.lex())) tokens.push(token);
        return this.parser.parse(tokens);
    }
}
