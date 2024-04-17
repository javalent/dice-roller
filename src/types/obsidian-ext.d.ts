import { Plugins } from "obsidian-overload";
import type { StackRoller } from "src/roller";
import type { DiceRollerSettings } from "src/settings/settings.types";

//expose dataview plugin for tags
declare module "obsidian" {
    interface App {
        plugins: {
            getPlugin<T extends keyof Plugins>(plugin: T): Plugins[T];
        };
    }
    interface Workspace {
        on(
            name: "dice-roller:render-dice",
            callback: (roll: string) => void
        ): EventRef;
        on(
            name: "dice-roller:rendered-result",
            callback: (result: number) => void
        ): EventRef;
        on(
            name: "dice-roller:settings-change",
            callback: (data: DiceRollerSettings) => void
        ): EventRef;
        on(
            name: "dice-roller:new-result",
            callback: (data: StackRoller) => void
        ): EventRef;
        trigger(name: "dice-roller:new-result", data: StackRoller): void;
        trigger(name: "dice-roller:rendered-result", data: number): void;
        trigger(name: "dice-roller:loaded"): void;
        trigger(name: "dice-roller:unloaded"): void;
    }
    interface MetadataCache {
        on(name: "dataview:api-ready", callback: () => void): EventRef;
        on(
            name: "dataview:metadata-change",
            callback: (type: "update", file: TFile) => void
        ): EventRef;
    }

    interface MarkdownEditView {
        sourceMode: boolean;
    }
    interface MarkdownView {
        editMode?: MarkdownEditView;
    }
}
