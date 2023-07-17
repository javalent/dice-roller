import { EventRef } from "obsidian";

//expose dataview plugin for tags
declare module "obsidian" {
    interface Workspace {
        on(name: "dice-roller:update-dice", callback: () => void): EventRef;
        on(
            name: "dice-roller:render-dice",
            callback: (roll: string) => void
        ): EventRef;
        on(
            name: "dice-roller:rendered-result",
            callback: (result: number) => void
        ): EventRef;
    }
    interface MetadataCache {
        on(name: "dataview:api-ready", callback: () => void): EventRef;
        on(
            name: "dataview:metadata-change",
            callback: (type: "update", file: TFile) => void
        ): EventRef;
    }
}
