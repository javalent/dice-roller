import { SectionCache } from "obsidian";
import { LexicalToken } from "src/parser/lexer";
import { DiceShape } from "src/renderer/shapes";

export interface RollerOptions {
    showDice?: boolean;
    shouldRender?: boolean;
    showFormula?: boolean;
    expectedValue?: ExpectedValue;
    round?: Round;
    text?: string;
    showParens?: boolean;
    formulaAfter?: boolean;
    signed?: boolean;
}
export interface SectionCacheWithFile extends SectionCache {
    file: string;
}

export interface Conditional {
    operator: string;
    comparer: string | number;
    lexemes: LexicalToken[];
    value: string;
    result?: number;
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

export enum ExpectedValue {
    None = "None",
    Average = "Average",
    Roll = "Roll"
}
