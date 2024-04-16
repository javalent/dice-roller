import type { Link } from "obsidian-dataview";

/** Functional return type for error handling. */
export declare class Success<T, E> {
    value: T;
    successful: true;
    constructor(value: T);
    map<U>(f: (a: T) => U): Result<U, E>;
    flatMap<U>(f: (a: T) => Result<U, E>): Result<U, E>;
    orElse(_value: T): T;
    orElseThrow(_message?: (e: E) => string): T;
}
/** Functional return type for error handling. */
export declare class Failure<T, E> {
    error: E;
    successful: false;
    constructor(error: E);
    map<U>(_f: (a: T) => U): Result<U, E>;
    flatMap<U>(_f: (a: T) => Result<U, E>): Result<U, E>;
    orElse(value: T): T;
    orElseThrow(message?: (e: E) => string): T;
}
export declare type Result<T, E> = Success<T, E> | Failure<T, E>;
/** Monadic 'Result' type which encapsulates whether a procedure succeeded or failed, as well as it's return value. */
export declare namespace Result {
    function success<T, E>(value: T): Result<T, E>;
    function failure<T, E>(error: E): Result<T, E>;
    function flatMap2<T1, T2, O, E>(
        first: Result<T1, E>,
        second: Result<T2, E>,
        f: (a: T1, b: T2) => Result<O, E>
    ): Result<O, E>;
    function map2<T1, T2, O, E>(
        first: Result<T1, E>,
        second: Result<T2, E>,
        f: (a: T1, b: T2) => O
    ): Result<O, E>;
}

declare module "obsidian-dataview" {
    interface DataviewAPI {
        query(source: string): Promise<Result<{ values: Link[] }, string>>;
    }
}
