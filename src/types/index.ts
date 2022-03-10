import { SectionCache } from "obsidian";

export interface SectionCacheWithFile extends SectionCache {
    file: string;
}
export interface Lexeme {
    original: string;
    type: string;
    data: string;
    conditionals: Conditional[];
    parenedDice?: boolean;
}

export interface Conditional {
    operator: string;
    comparer: number;
    value: string;
}

export type ResultMapInterface<T> = Map<number, ResultInterface<T>>;
export type ResultInterface<T> = {
    usable: boolean;
    value: T;
    display: string;
    modifiers?: Set<string>;
};

export enum Round {
    None = "None",
    Normal = "Normal",
    Up = "Up",
    Down = "Down"
}
