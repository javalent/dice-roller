import {
    App,
    type FuzzyMatch,
    FuzzySuggestModal,
    Scope,
    SuggestModal
} from "obsidian";
import { createPopper, type Instance as PopperInstance } from "@popperjs/core";
declare module "obsidian" {
    interface App {
        keymap: {
            pushScope(scope: Scope): void;
            popScope(scope: Scope): void;
        };
    }
}
declare global {
    var app: App;
}
class Suggester<T> {
    owner: SuggestModal<T>;
    items: T[];
    suggestions: HTMLElement[];
    selectedItem: number;
    containerEl: HTMLElement;
    constructor(
        owner: SuggestModal<T>,
        containerEl: HTMLElement,
        scope: Scope
    ) {
        this.containerEl = containerEl;
        this.owner = owner;
        containerEl.on(
            "click",
            ".suggestion-item",
            this.onSuggestionClick.bind(this)
        );
        containerEl.on(
            "mousemove",
            ".suggestion-item",
            this.onSuggestionMouseover.bind(this)
        );

        scope.register([], "ArrowUp", () => {
            this.setSelectedItem(this.selectedItem - 1, true);
            return false;
        });

        scope.register([], "ArrowDown", () => {
            this.setSelectedItem(this.selectedItem + 1, true);
            return false;
        });

        scope.register([], "Enter", (evt) => {
            this.useSelectedItem(evt);
            return false;
        });

        scope.register([], "Tab", (evt) => {
            this.chooseSuggestion(evt);
            return false;
        });
    }
    chooseSuggestion(evt: KeyboardEvent) {
        if (!this.items || !this.items.length) return;
        const currentValue = this.items[this.selectedItem];
        if (currentValue) {
            this.owner.onChooseSuggestion(currentValue, evt);
        }
    }
    onSuggestionClick(event: MouseEvent, el: HTMLElement): void {
        event.preventDefault();
        if (!this.suggestions || !this.suggestions.length) return;

        const item = this.suggestions.indexOf(el);
        this.setSelectedItem(item, false);
        this.useSelectedItem(event);
    }

    onSuggestionMouseover(event: MouseEvent, el: HTMLElement): void {
        if (!this.suggestions || !this.suggestions.length) return;
        const item = this.suggestions.indexOf(el);
        this.setSelectedItem(item, false);
    }
    empty() {
        this.containerEl.empty();
    }
    setSuggestions(items: T[]) {
        this.containerEl.empty();
        const els: HTMLDivElement[] = [];

        items.forEach((item) => {
            const suggestionEl = this.containerEl.createDiv("suggestion-item");
            this.owner.renderSuggestion(item, suggestionEl);
            els.push(suggestionEl);
        });
        this.items = items;
        this.suggestions = els;
        this.setSelectedItem(0, false);
    }
    useSelectedItem(event: MouseEvent | KeyboardEvent) {
        if (!this.items || !this.items.length) return;
        const currentValue = this.items[this.selectedItem];
        if (currentValue) {
            this.owner.selectSuggestion(currentValue, event);
        }
    }
    wrap(value: number, size: number): number {
        return ((value % size) + size) % size;
    }
    setSelectedItem(index: number, scroll: boolean) {
        const nIndex = this.wrap(index, this.suggestions.length);
        const prev = this.suggestions[this.selectedItem];
        const next = this.suggestions[nIndex];

        if (prev) prev.removeClass("is-selected");
        if (next) next.addClass("is-selected");

        this.selectedItem = nIndex;

        if (scroll) {
            next.scrollIntoView(false);
        }
    }
}

export abstract class SuggestionModal<T> extends FuzzySuggestModal<T> {
    items: T[] = [];
    item: T;
    suggestions: HTMLDivElement[];
    popper: PopperInstance;
    scope: Scope = new Scope();
    suggester: Suggester<FuzzyMatch<T>>;
    suggestEl: HTMLDivElement;
    promptEl: HTMLDivElement;
    emptyStateText: string = "No match found";
    limit: number = 100;
    shouldNotOpen: boolean;
    constructor(app: App, inputEl: HTMLInputElement, items: T[]) {
        super(app);
        this.shouldNotOpen = !this.items.length;
        this.inputEl = inputEl;
        this.items = items;

        this.suggestEl = createDiv("suggestion-container");

        this.contentEl = this.suggestEl.createDiv("suggestion");

        this.suggester = new Suggester(this, this.contentEl, this.scope);

        this.scope.register([], "Escape", this.onEscape.bind(this));

        this.inputEl.addEventListener("input", this.onInputChanged.bind(this));
        this.inputEl.addEventListener("focus", this.onFocus.bind(this));
        this.inputEl.addEventListener("blur", this.close.bind(this));
        this.suggestEl.on(
            "mousedown",
            ".suggestion-container",
            (event: MouseEvent) => {
                event.preventDefault();
            }
        );
    }
    empty() {
        this.suggester.empty();
    }
    onInputChanged(): void {
        if (this.shouldNotOpen) return;
        const inputStr = this.modifyInput(this.inputEl.value);
        const suggestions = this.getSuggestions(inputStr ?? "");
        if (suggestions.length > 0) {
            this.suggester.setSuggestions(suggestions.slice(0, this.limit));
        } else {
            this.onNoSuggestion();
        }
        this.open();
    }
    onFocus(): void {
        this.shouldNotOpen = false;
        this.onInputChanged();
    }
    modifyInput(input: string): string | undefined {
        return input;
    }
    onNoSuggestion() {
        this.empty();
    }
    open(): void {
        // TODO: Figure out a better way to do this. Idea from Periodic Notes plugin
        this.app.keymap.pushScope(this.scope);

        document.body.appendChild(this.suggestEl);
        this.popper = createPopper(this.inputEl, this.suggestEl, {
            placement: "bottom-start",
            modifiers: [
                {
                    name: "offset",
                    options: {
                        offset: [0, 10]
                    }
                },
                {
                    name: "flip",
                    options: {
                        fallbackPlacements: ["top"]
                    }
                }
            ]
        });
    }

    onEscape(): void {
        this.close();
        this.shouldNotOpen = true;
    }
    close(): void {
        // TODO: Figure out a better way to do this. Idea from Periodic Notes plugin
        this.app.keymap.popScope(this.scope);

        this.suggester.setSuggestions([]);
        if (this.popper) {
            this.popper.destroy();
        }

        this.suggestEl.detach();
    }
    createPrompt(prompts: HTMLSpanElement[]) {
        if (!this.promptEl)
            this.promptEl = this.suggestEl.createDiv("prompt-instructions");
        let prompt = this.promptEl.createDiv("prompt-instruction");
        for (let p of prompts) {
            prompt.appendChild(p);
        }
    }
    abstract onChooseItem(item: T, evt: MouseEvent | KeyboardEvent): void;
    abstract getItemText(arg: T): string;

    getItems() {
        return this.items;
    }
}
