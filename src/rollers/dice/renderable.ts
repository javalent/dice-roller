import type { DiceShape } from "src/renderer/shapes";

export interface RenderableDice<T> {
    canRender(): boolean;

    getType(): RenderTypes;

    roll(): Promise<void>;
    rollSync(): void;

    render(): Promise<void>;
    shouldRender: boolean;

    getValue(shapes?: DiceShape[]): Promise<T>;
    getValueSync(): T;
}

export const RenderTypes = {
    /** Polyhedral */
    D4: "4",
    D6: "6",
    D8: "8",
    D10: "10",
    D12: "12",
    D20: "20",
    D100: "100",
    /** Special */
    FUDGE: "fudge",
    STUNT: "stunt",
    NONE: "none"
} as const;
export type RenderTypes = (typeof RenderTypes)[keyof typeof RenderTypes];
