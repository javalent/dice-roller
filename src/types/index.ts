import { SectionCache } from "obsidian";

export interface SectionCacheWithFile extends SectionCache {
    file: string;
}
export interface Lexeme {
    original: string;
    type: string;
    data: string;
    conditionals: Conditional[];
}

export interface Conditional {
    operator: string;
    comparer: number;
}

export type ResultMapInterface<T> = Map<number, ResultInterface<T>>;
export type ResultInterface<T> = {
    usable: boolean;
    value: T;
    modifiers?: Set<string>;
};

export abstract class Roller<T> {
    display: string;
    result: T;
    resultArray: T[];
    rolls: number;
    abstract roll: () => T[];
}
