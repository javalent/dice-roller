import {
    CachedMetadata,
    EventRef,
    Events,
    Notice,
    setIcon,
    TFile
} from "obsidian";
import DiceRollerPlugin from "src/main";
import { LexicalToken } from "src/parser/lexer";
import { COPY_DEFINITION, ICON_DEFINITION } from "src/utils/constants";

export abstract class Roller<T> extends Events {
    abstract roll(): Promise<T> | T;
    result: T;
    getRandomBetween(min: number, max: number): number {
        const randomBuffer = new Uint32Array(1);
        crypto.getRandomValues(randomBuffer);
        const rand = randomBuffer[0] / (0xffffffff + 1);
        return Math.floor(rand * (max - min + 1)) + min;
    }
}

abstract class BareRoller<T> extends Roller<T> {
    rolls: number;
    loaded: boolean = false;
    abstract build(): Promise<void>;
    abstract get tooltip(): string;
    containerEl = createSpan({
        cls: "dice-roller",
        attr: {
            "aria-label-position": "top",
            "data-dice": this.original
        }
    });
    resultEl = this.containerEl.createSpan("dice-roller-result");
    iconEl: HTMLSpanElement;
    setTooltip() {
        if (this.plugin.data.displayResultsInline) return;
        this.containerEl.setAttrs({
            "aria-label": this.tooltip
        });
    }
    getRandomBetween(min: number, max: number): number {
        const randomBuffer = new Uint32Array(1);
        crypto.getRandomValues(randomBuffer);
        const rand = randomBuffer[0] / (0xffffffff + 1);
        return Math.floor(rand * (max - min + 1)) + min;
    }
    async render() {
        this.setTooltip();
        await this.build();
    }
    constructor(
        public plugin: DiceRollerPlugin,
        public original = "",
        showDice = plugin.data.showDice
    ) {
        super();
        if (showDice) {
            this.iconEl = this.containerEl.createSpan({
                cls: "dice-roller-button"
            });
            setIcon(this.iconEl, ICON_DEFINITION);
            this.iconEl.onclick = this.onClick.bind(this);
        } else {
            this.containerEl.addClass("no-icon");
        }

        this.containerEl.onclick = this.onClick.bind(this);
    }

    async onClick(evt: MouseEvent) {
        evt.stopPropagation();
        evt.stopImmediatePropagation();
        if (window.getSelection()?.isCollapsed) {
            await this.roll();
        }
    }
}

export abstract class BasicRoller<T = any> extends BareRoller<T> {
    abstract getReplacer(): Promise<string>;
    save: boolean = false;

    get inlineText() {
        return `${this.tooltip.split("\n").join(" -> ")} -> `;
    }
    constructor(
        public plugin: DiceRollerPlugin,
        public original: string,
        public lexemes: LexicalToken[],
        public showDice = plugin.data.showDice
    ) {
        super(plugin, original, showDice);
    }

    abstract toResult(): { type: string; result: any };
    abstract applyResult(result: any): Promise<void>;
}

export abstract class GenericRoller<T> extends BasicRoller {
    abstract result: T;
    abstract roll(): Promise<T>;
}

export abstract class GenericFileRoller<T> extends GenericRoller<T> {
    path: string;
    file: TFile;
    cache: CachedMetadata;
    options: T[];
    results: T[];
    init: Promise<void>;
    constructor(
        public plugin: DiceRollerPlugin,
        public original: string,
        public lexeme: LexicalToken,
        public source: string,
        showDice = plugin.data.showDice
    ) {
        super(plugin, original, [lexeme], showDice);

        this.getPath();
        this.init = this.getFile();
    }
    abstract getPath(): void;
    async getFile() {
        this.file = this.plugin.app.metadataCache.getFirstLinkpathDest(
            this.path,
            this.source
        );
        if (!this.file || !(this.file instanceof TFile))
            throw new Error("Could not load file.");

        await this.load();
    }
    abstract load(): Promise<void>;
    abstract getOptions(): Promise<void>;
    watch: boolean = true;
}

export abstract class GenericEmbeddedRoller<T> extends GenericFileRoller<T> {
    copy: HTMLDivElement;
    abstract transformResultsToString(): string;
    getEmbedClass() {
        return this.plugin.data.displayAsEmbed ? "markdown-embed" : "";
    }
    constructor(
        public plugin: DiceRollerPlugin,
        public original: string,
        public lexeme: LexicalToken,
        source: string,
        public inline: boolean = true,
        showDice = plugin.data.showDice
    ) {
        super(plugin, original, lexeme, source, showDice);
        if (this.plugin.data.displayAsEmbed) {
            this.containerEl.addClasses(["has-embed", "markdown-embed"]);
            this.resultEl.addClass("internal-embed");
        }
        this.resultEl.setAttrs({ src: source });
        this.copy = this.containerEl.createDiv({
            cls: "dice-content-copy dice-roller-button no-show",
            attr: { "aria-label": "Copy Contents" }
        });
        this.copy.addEventListener("click", (evt) => {
            evt.stopPropagation();
            navigator.clipboard
                .writeText(this.transformResultsToString())
                .then(async () => {
                    new Notice("Result copied to clipboard.");
                });
        });
        setIcon(this.copy, COPY_DEFINITION);
    }
}
export class ArrayRoller<T = any> extends BareRoller<T> {
    result: any;
    results: any[];
    get tooltip() {
        return `${this.options.toString()}\n\n${this.results.toString()}`;
    }
    async roll() {
        const options = [...this.options];

        this.results = [...Array(this.rolls)]
            .map(() => {
                let option =
                    options[this.getRandomBetween(0, options.length - 1)];
                options.splice(options.indexOf(option), 1);
                return option;
            })
            .filter((r) => r);
        this.render();
        this.trigger("new-result");
        this.result = this.results[0];
        return this.results[0];
    }
    async build() {
        this.resultEl.empty();
        this.resultEl.setText(this.results.toString());
    }
    constructor(
        plugin: DiceRollerPlugin,
        public options: any[],
        public rolls: number
    ) {
        super(plugin, ``);
    }
}
