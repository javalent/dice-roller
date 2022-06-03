import { CachedMetadata, EventRef, Events, setIcon, TFile } from "obsidian";
import DiceRollerPlugin from "src/main";
import { LexicalToken } from "src/parser/lexer";
import { Lexeme } from "src/types";
import { ICON_DEFINITION } from "src/utils/constants";

export abstract class BaseRoller {
    abstract get display(): string;
    abstract get text(): string;
    abstract get rolls(): number;
    _getRandomBetween(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}

export abstract class Roller<T> {
    display: string;
    text: string;
    result: T;
    resultArray: T[];
    rolls: number;
    abstract roll: () => T[];
    abstract element: (
        parent?: HTMLElement
    ) => Promise<HTMLElement> | HTMLElement;
}

export abstract class BasicRoller extends Events {
    rolls: number;
    loaded: boolean = false;
    abstract roll(): Promise<any>;
    result: any;
    abstract replacer: string;
    containerEl = createDiv({
        cls: "dice-roller",
        attr: {
            "aria-label-position": "top",
            "data-dice": this.original
        }
    });
    save: boolean = false;
    resultEl = this.containerEl.createDiv("dice-roller-result");
    setTooltip() {
        if (this.plugin.data.displayResultsInline) return;
        this.containerEl.setAttrs({
            "aria-label": this.tooltip
        });
    }
    getRandomBetween(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    async render() {
        this.setTooltip();
        await this.build();
    }
    abstract get tooltip(): string;
    get inlineText() {
        return `${this.tooltip.split("\n").join(" -> ")} -> `;
    }
    abstract build(): Promise<void>;
    constructor(
        public plugin: DiceRollerPlugin,
        public original: string,
        public lexemes: LexicalToken[],
        public showDice = plugin.data.showDice
    ) {
        super();
        if (this.showDice) {
            const icon = this.containerEl.createDiv({
                cls: "dice-roller-button"
            });
            setIcon(icon, ICON_DEFINITION);
            icon.onclick = this.onClick.bind(this);
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

    abstract toResult(): { type: string; result: any };
    abstract applyResult(result: any): Promise<void>;
}

export abstract class GenericRoller<T> extends BasicRoller {
    abstract result: T;
    abstract roll(): Promise<T>;
    loaded: boolean;
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
        this.registerFileWatcher();
    }
    abstract load(): Promise<void>;
    abstract getOptions(): Promise<void>;
    watch: boolean = true;
    registerFileWatcher() {
        this.plugin.registerEvent(
            this.plugin.app.vault.on("modify", async (file) => {
                if (!this.watch) return;
                if (this.save) return;
                if (file !== this.file) return;
                await this.getOptions();
            })
        );
    }
}
