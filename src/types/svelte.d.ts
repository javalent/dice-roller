import type { SvelteComponent } from "svelte";

declare module "*.svelte" {
    declare const component: SvelteComponent;
    export = component;
}
