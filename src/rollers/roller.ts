import {
    type CachedMetadata,
    Events,
    Notice,
    setIcon,
    TFile,
    MetadataCache,
    App,
    type EventRef,
    Component
} from "obsidian";

import type { LexicalToken } from "src/lexer/lexer";
import { DiceRenderer } from "src/renderer/renderer";
import type {
    ButtonPosition,
    DiceRollerSettings
} from "src/settings/settings.types";
import { Icons } from "src/utils/icons";
import type { RenderableDice } from "./dice/renderable";

export interface ComponentLike {
    addChild(child: Component): void;
}

export abstract class Roller<T> extends Component implements Events {
    on(name: string, callback: (...data: any) => any, ctx?: any): EventRef {
        return this.#events.on(name, callback);
    }
    once(name: string, callback: (...data: any) => any) {
        const ref = this.on(name, (...args: any) => {
            callback(...args);
            this.offref(ref);
        });
    }
    off(name: string, callback: (...data: any) => any): void {
        return this.#events.off(name, callback);
    }
    offref(ref: EventRef): void {
        return this.#events.offref(ref);
    }
    trigger(name: string, ...data: any[]): void {
        return this.#events.trigger(name, ...data);
    }
    tryTrigger(evt: EventRef, args: any[]): void {
        return this.#events.tryTrigger(evt, args);
    }
    abstract roll(): Promise<T> | T;

    components: ComponentLike[] = [];
    loaded: boolean = false;
    onload(): void {
        this.loaded = true;
        this.trigger("loaded");
    }
    onunload(): void {
        this.components = [];
    }
    addContexts(...components: ComponentLike[]) {
        this.components = components;
        for (const component of components) {
            component.addChild(this);
        }
    }

    result: T;
    #events = new Events();
    getRandomBetween(min: number, max: number): number {
        const randomBuffer = new Uint32Array(1);
        crypto.getRandomValues(randomBuffer);
        const rand = randomBuffer[0] / (0xffffffff + 1);
        return Math.floor(rand * (max - min + 1)) + min;
    }
}
interface BareRoller<T> {
    on(name: "loaded", callback: () => void): EventRef;
    trigger(name: "loaded"): void;
    on(name: "new-result", callback: () => void): EventRef;
    trigger(name: "new-result"): void;
}
abstract class BareRoller<T> extends Roller<T> {
    constructor(
        public data: DiceRollerSettings,
        public original = "",
        position: ButtonPosition = data.position
    ) {
        super();
        if (!this.original) this.original = "";
        this.containerEl = createSpan({
            cls: "dice-roller",
            attr: {
                "aria-label-position": "top",
                "data-dice": this.original
            }
        });
        this.resultEl = this.containerEl.createSpan("dice-roller-result");
        this.iconEl = createSpan({
            cls: "dice-roller-button"
        });
        setIcon(this.iconEl, Icons.DICE);
        this.iconEl.onclick = this.onClick.bind(this);
        switch (position) {
            case "LEFT": {
                this.containerEl.prepend(this.iconEl);
                break;
            }
            case "RIGHT": {
                this.containerEl.append(this.iconEl);
                break;
            }
            case "NONE": {
                this.containerEl.addClass("no-icon");
                break;
            }
        }

        this.containerEl.onclick = this.onClick.bind(this);
    }
    rolls: number;
    loaded: boolean = false;
    onLoad(callback: () => void) {
        if (this.loaded) {
            callback();
        } else {
            this.on("loaded", () => callback());
        }
    }
    onunload(): void {
        this.containerEl.empty();
        const pre = createEl("pre");
        pre.createEl("code", { text: this.original });
        this.containerEl.append(pre);
    }
    abstract build(): Promise<void>;
    abstract getTooltip(): string;
    containerEl: HTMLSpanElement;
    resultEl: HTMLSpanElement;
    iconEl: HTMLSpanElement;
    setTooltip() {
        if (this.data.displayResultsInline) return;
        this.containerEl.setAttrs({
            "aria-label": this.getTooltip()
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

    async onClick(evt: MouseEvent) {
        evt.stopPropagation();
        evt.stopImmediatePropagation();
        if (window.getSelection()?.isCollapsed) {
            await this.roll();
        }
    }
}

export abstract class BasicRoller<T = any> extends BareRoller<T> {
    source: string;
    abstract getReplacer(): Promise<string>;
    save: boolean = false;

    setSpinner() {
        this.resultEl.empty();
        setIcon(this.resultEl.createDiv("should-spin"), Icons.LOADING);
    }

    abstract result: T;
    abstract roll(): Promise<T>;

    public setSource(source: string) {
        this.source = source;
    }
    public getSource(): string {
        return this.source;
    }

    get inlineText() {
        return `${this.getTooltip().split("\n").join(" -> ")} -> `;
    }

    constructor(
        public data: DiceRollerSettings,
        public original: string,
        public lexemes: LexicalToken[],
        public position = data.position
    ) {
        super(data, original, position);
    }
}

export abstract class RenderableRoller<T = any> extends BasicRoller<T> {
    shouldRender: boolean = false;
    isRendering: boolean = false;
    hasRunOnce: boolean = false;
    override onunload(): void {
        if (this.isRendering) {
            DiceRenderer.stop();
        }
        super.onunload();
    }
    override async onClick(evt: MouseEvent) {
        evt.stopPropagation();
        evt.stopImmediatePropagation();

        if (this.isRendering) {
            DiceRenderer.stop();
        }
        this.#controller?.abort();
        if (evt.getModifierState("Shift")) {
            await this.roll(true);
            this.hasRunOnce = true;
        } else if (window.getSelection()?.isCollapsed) {
            await this.roll();
        }
    }

    abstract rollSync(): T;
    abstract roll(render?: boolean): Promise<T>;
    abstract getResultText(): string;

    children: RenderableDice<any>[];
    #controller: AbortController;
    async renderChildren(): Promise<void> {
        this.isRendering = true;
        this.setTooltip();
        this.setSpinner();
        const promises = [];
        this.#controller = new AbortController();
        for (const die of this.children) {
            promises.push(
                new Promise<void>(async (resolve, reject) => {
                    this.#controller.signal.addEventListener("abort", () => {
                        reject();
                    });
                    await die.render(this.#controller);
                    resolve();
                })
            );
        }
        try {
            await Promise.all(promises);
        } catch (e) {
            return;
        }

        this.isRendering = false;

        this.setTooltip();
    }
}
export abstract class GenericFileRoller<T> extends BasicRoller<T> {
    path: string;
    file: TFile;
    cache: CachedMetadata;
    options: T[];
    results: T[];
    dirtyEl = this.containerEl.createDiv({
        cls: "dice-roller-dirty dice-roller-button",
        attr: {
            "aria-label":
                "The underlying data source for this roller was modified"
        }
    });
    constructor(
        public data: DiceRollerSettings,
        public original: string,
        public lexeme: LexicalToken,
        public source: string,
        public app: App,
        position = data.position
    ) {
        super(data, original, [lexeme], position);
        this.getPath();
    }
    abstract getPath(): void;
    async getFile() {
        this.file = this.app.metadataCache.getFirstLinkpathDest(
            this.path,
            this.source
        );
        if (!this.file || !(this.file instanceof TFile))
            throw new Error("Could not load file.");
    }
    #hashedContent: string;

    override async render() {
        super.render();
        this.dirtyEl.empty();
    }

    async checkForDirtiness(content: string): Promise<boolean> {
        const hash = await this.hash(content);
        if (hash === this.#hashedContent) {
            this.dirtyEl.empty();
            return false; //not dirty
        } else if (this.#hashedContent) {
            setIcon(this.dirtyEl, Icons.WARNING);
        }
        this.#hashedContent = hash;
        return true;
    }

    async hash(content: string): Promise<string> {
        return Array.from(
            new Uint8Array(
                await crypto.subtle.digest(
                    "SHA-256",
                    new TextEncoder().encode(content)
                )
            ),
            (b) => b.toString(16).padStart(2, "0")
        ).join("");
    }
    #initialized = false;
    async onload() {
        if (this.#initialized) return;
        this.#initialized = true;
        await this.getFile();
        const cache = this.app.metadataCache.getFileCache(this.file);
        const data = await this.app.vault.cachedRead(this.file);
        await this.getOptions(cache, data);

        this.loaded = true;
        this.trigger("loaded");

        this.registerEvent(
            this.app.metadataCache.on("changed", async (file, data, cache) => {
                if (file === this.file) {
                    await this.getOptions(cache, data);
                }
            })
        );
    }

    abstract getOptions(cache: CachedMetadata, data: string): Promise<void>;
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
        position = data.position,
        public inline: boolean = true
    ) {
        super(data, original, lexeme, source, app, position);
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
    declare result: any;
    results: any[];
    getTooltip(): string {
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
