import {
    type CachedMetadata,
    Events,
    Notice,
    setIcon,
    TFile,
    MetadataCache,
    App
} from "obsidian";

import type { LexicalToken } from "src/lexer/lexer";
import type { DiceRollerSettings } from "src/settings/settings.types";
import { Icons } from "src/utils/icons";

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
        if (this.data.displayResultsInline) return;
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
        public data: DiceRollerSettings,
        public original = "",
        showDice = data.showDice
    ) {
        super();
        if (showDice) {
            this.iconEl = this.containerEl.createSpan({
                cls: "dice-roller-button"
            });
            setIcon(this.iconEl, Icons.DICE);
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
        public data: DiceRollerSettings,
        public original: string,
        public lexemes: LexicalToken[],
        public showDice = data.showDice
    ) {
        super(data, original, showDice);
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
        public data: DiceRollerSettings,
        public original: string,
        public lexeme: LexicalToken,
        public source: string,
        public app: App,
        showDice = data.showDice
    ) {
        super(data, original, [lexeme], showDice);

        this.getPath();
        this.init = this.getFile();
    }
    abstract getPath(): void;
    async getFile() {
        this.file = this.app.metadataCache.getFirstLinkpathDest(
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
        return this.data.displayAsEmbed ? "markdown-embed" : "";
    }
    constructor(
        public data: DiceRollerSettings,
        public original: string,
        public lexeme: LexicalToken,
        source: string,
        public app: App,
        public inline: boolean = true,
        showDice = data.showDice
    ) {
        super(data, original, lexeme, source, app, showDice);
        if (this.data.displayAsEmbed) {
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
        setIcon(this.copy, Icons.COPY);
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
        data: DiceRollerSettings,
        public options: any[],
        public rolls: number
    ) {
        super(data, ``);
    }
}
