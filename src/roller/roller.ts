import { CachedMetadata, Events, setIcon, TFile } from "obsidian";
import DiceRollerPlugin from "src/main";
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
    abstract roll(): Promise<any>;
    result: any;
    containerEl = createDiv({
        cls: "dice-roller",
        attr: {
            "aria-label-position": "top",
            "data-dice": this.original
        }
    });
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
    abstract build(): Promise<void>;
    constructor(
        public plugin: DiceRollerPlugin,
        public original: string,
        public lexemes: Lexeme[]
    ) {
        super();
        const icon = this.containerEl.createDiv({
            cls: "dice-roller-button"
        });
        setIcon(icon, ICON_DEFINITION);

        this.containerEl.onclick = this.onClick.bind(this);

        icon.onclick = this.onClick.bind(this);
    }

    async onClick(evt: MouseEvent) {
        evt.stopPropagation();
        evt.stopImmediatePropagation();
        if (window.getSelection()?.isCollapsed) {
            await this.roll();
        }
    }
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
    constructor(
        public plugin: DiceRollerPlugin,
        public original: string,
        public lexeme: Lexeme,
        public source: string
    ) {
        super(plugin, original, [lexeme]);

        this.getPath();
        this.getFile();
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
    registerFileWatcher() {
        this.plugin.registerEvent(
            this.plugin.app.vault.on("modify", async (file) => {
                if (file !== this.file) return;
                await this.getOptions();
            })
        );
    }
}
