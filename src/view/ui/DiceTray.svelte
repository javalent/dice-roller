<script lang="ts">
    import { Details } from "@javalent/components";
    import type { DiceRollerSettings } from "src/settings/settings.types";

    import { ExtraButtonComponent } from "obsidian";
    import { Icons } from "src/utils/icons";
    import { createEventDispatcher } from "svelte";
    import type DiceRollerPlugin from "src/main";
    import type DiceView from "../view";

    export let settings: DiceRollerSettings;
    export let plugin: DiceRollerPlugin;
    export let view: DiceView;

    const roll = (node: HTMLDivElement) => {
        new ExtraButtonComponent(node).setIcon(Icons.DICE);
    };
    const trash = (node: HTMLDivElement) => {
        new ExtraButtonComponent(node).setIcon(Icons.DELETE);
    };
</script>

{#if settings.customFormulas.length}
    <Details name="Saved Formulas" open={false}>
        <div class="saved-formulas">
            {#each settings.customFormulas as formula (formula)}
                <div class="formula-container">
                    <div class="formula-actions">
                        <div
                            use:roll
                            on:click={() => {
                                view.roll(formula);
                            }}
                        />
                        <span class="formula">{formula}</span>
                    </div>
                    <div
                        use:trash
                        on:click={async () => {
                            settings.customFormulas =
                                settings.customFormulas.filter(
                                    (f) => f != formula
                                );
                            plugin.saveSettings();
                        }}
                    />
                </div>
            {/each}
        </div>
    </Details>
{/if}

<style scoped>
    .saved-formulas {
        display: flex;
        flex-flow: column nowrap;
        gap: 0.5rem;
    }
    .formula-container {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .formula-actions {
        display: flex;
        align-items: center;
        gap: 0.25rem;
    }
</style>
