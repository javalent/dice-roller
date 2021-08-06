# Dice Roller

Inline dice rolling for Obsidian.md.

## Usage

Simply place a code block with your formula in your note (such as `` `dice: XdX` ``) and in preview mode it will be replaced with the result of the dice rolls. The result can then be re-rolled by clicking on it.

### Dice Formula

The parser supports addition, subtraction, multiplication, division, and exponents of an arbitrary number of dice or static numbers. Spaces are removed before the formula is parsed.

There is full order-of-operations support, so it can even nested into parentheses!

| Examples                                  |
| ----------------------------------------- |
| `` `dice: 1d2` ``                         |
| `` `dice: 3d4 + 3` ``                     |
| `` `dice: 1d12 + 1d10 + 5` ``             |
| `` `dice: 3d4+3d4-(3d4 * 1d4) - 2^1d7` `` |

### Random Blocks

The Dice Roller can be given a link to a note or a tag, and it will return a random block from the note/notes.

This feature is still under development and may not work as expected.

<kbd>Ctrl</kbd> / <kbd>Command</kbd> - clicking a result will open the associated note.

Usage:
| Example | Result |
| --- | --- |
| `` `dice: [[Note]]` `` | Returns a single random block from `Note` |
| `` `dice: 3d[[Note]]` `` | Returns 3 random blocks from `Note` |

#### Tags

The Dice Roller can also be told to return results from a tag if the [Dataview](https://github.com/blacksmithgu/obsidian-dataview) plugin is installed.

By default, this will return 1 result from _every_ file that has the tag. You can change this behavior in settings, or by using the following optional `+` and `-` parameters as shown below.

If results from multiple files are returned, the result **from that file** can be re-rolled by clicking on the block. Clicking on the container or the dice icon will re-roll **all returned results**.

| Example               | Result                                                                                                   |
| --------------------- | -------------------------------------------------------------------------------------------------------- |
| `` `dice: #tag` ``    | Return a single random block from notes with `#tag`, behavior depends on settings (default to **every**) |
| `` `dice: #tag\|-` `` | Return a single random block from **a single, random note** with `#tag`                                  |
| `` `dice: #tag\|+` `` | Return a single random block from **every note** with `#tag`                                             |

#### Links

If the `Always Return Links for Tags` setting is on, or `|link` is appended to the end of the tag, a link to a random note will be returned instead of sections.

At the moment this will only return a single link regardless of the number of rolls specified. This may change in a later release.

#### Block Types

Obsidian has several "types" of blocks. Currently, the default behavior of the plugin is to filter out **thematicBreak** and **yaml** from the returned results.

To return a specific block type, you may append `|<type>` to the end of any block roller.

Usage:

| Example                                       | Result                                                                          |
| --------------------------------------------- | ------------------------------------------------------------------------------- |
| `` `dice: [[Note]]\|paragraph` ``             | Return `paragraph` blocks                                                       |
| `` `dice: #tag\|paragraph,heading,yaml` ``    | Return `paragraph`, `heading`, and `yaml` blocks                                |
| `` `dice: #tag\|-\|paragraph,heading,yaml` `` | Return `paragraph`, `heading`, and `yaml` blocks from a **single, random note** |

I do not have any control over what Obsidian consider's each block (for instance, images may be returned as `paragraph`).

I _believe_ that this is a list of block types defined in Obsidian, but use this with a grain of salt.

| Type                 |
| -------------------- |
| `blockquote`         |
| `break`              |
| `code`               |
| `delete`             |
| `emphasis`           |
| `footnoteReference`  |
| `footnote`           |
| `heading`            |
| `html`               |
| `imageReference`     |
| `image`              |
| `inlineCode`         |
| `linkReference`      |
| `link`               |
| `listItem`           |
| `list`               |
| `paragraph`          |
| `root`               |
| `strong`             |
| `table`              |
| `text`               |
| `thematicBreak`      |
| `toml`               |
| `yaml`               |
| `definition`         |
| `footnoteDefinition` |

### Random Tables

The Dice Roller may also be given a link to a table in a note, which it will read and return a random result from the table.

This feature is still under development and may not work as expected.

Usage:

In a note (such as `Note.md`), create a table & optionally give it a block id:

| Header |
| ------ |
| A      |
| B      |
| C      |

^block-id

Then, in the dice formula, use a wikilink to the block reference of the table:

`` `dice: [[Note^block-id]]` ``

The plugin will read the table and return a random result.

To return multiple elements, use:

`` `dice: Xd[[Note^block-id]]` ``

Once in preview mode, you may <kbd>Ctrl</kbd> - click on the result to open the block reference in a new pane.

#### Multiple Headers

If a table provided to the plugin has multiple headers, the plugin will return the entire row unless you specify the header to use:

| Header | Header 2 |
| ------ | -------- |
| A      | D        |
| B      | E        |
| C      | F        |

^block-id

`` `dice: [[Note^block-id]]|Header 2` ``

### Tooltip

The result in preview mode has a tooltip that will appear when you hover over it.

It displays the formula used to calculate the result on the top line, and displays the calculated rolls on the bottom line.

### Percentile Dice

The parser supports percentile dice. `` `dice: Xd%` `` will roll X d100 dice.

### Fudge/Fate Dice

Use `` `dice: XdF` `` to roll a fudge/fate dice. See [here](<https://en.wikipedia.org/wiki/Fudge_(role-playing_game_system)#Fudge_dice>) for more info on this type of dice.

### Fantasy AGE Stunt Dice

Use `` `dice: 1dS` `` to roll a Fantasy AGE stunt dice. The result will show the total roll and also the stunt points if successful.

# Dice Modifiers

The parser supports several modifiers. If a die has been modified, it will display _how_ it has been modified in the tooltip.

**Modifiers are only supported on basic number dice.**

If a modifier has a parameter, it will default to 1 if not provided.

| Modifier          | Syntax         | Description                                                                                        |
| ----------------- | -------------- | -------------------------------------------------------------------------------------------------- |
| Min/Max           | `Xd[Y, Z]`     | Roll a dice with minimum Y, maximum Z.                                                             |
| Keep Highest      | `k{n}`/`kh{n}` | Keep highest `{n}` dice.                                                                           |
| Keep Lowest       | `kl{n}`        | Keep lowest `{n}` dice.                                                                            |
| Drop Lowest       | `d{n}`/`dl{n}` | Drop lowest `{n}` dice.                                                                            |
| Drop Highest      | `dh{n}`        | Drop highest `{n}` dice.                                                                           |
| Explode           | `!{n}`, `!i`   | Explode dice `{n}` times. If `i` is provided, will explode "infinitely" (capped at 100).           |
| Explode & Combine | `!!{n}`, `!!i` | Same as explode, but exploded dice are summed in the display instead of being shown individually.  |
| Re-roll           | `r{n}`, `ri`   | Re-roll a minimum dice `{n}` times. If `i` is provided, will re-roll "infinitely" (capped at 100). |

## Min/Max

### Syntax: Xd[Y, Z]

Create a custom die, with a minimum of Y and a maximum of Z.

### Example

| Formula            | Result         |
| ------------------ | -------------- |
| `dice: 4d[7, 8]`   | `[7, 7, 8, 7]` |
| `dice: 1d[20, 20]` | `[20]`         |

## Keep Highest

### Syntax: XdXk{n} / XdXkh{n}

Keeps highest `{n}` rolls. `{n}` is optional, and will default to 1. Dropped dice will display as `Nd`.

### Example

| Formula                          | Result                 |
| -------------------------------- | ---------------------- |
| `dice: 2d20k` / `dice: 2d20kh`   | `[7d, 18] = 18`        |
| `dice: 4d20k2` / `dice: 4d20kh2` | `[4d, 12, 15, 3d = 27` |

## Keep Lowest

### Syntax: XdXkl{n}

Keeps lowest `{n}` rolls. `{n}` is optional, and will default to 1. Dropped dice will display as `Nd`.

### Example

| Formula         | Result                 |
| --------------- | ---------------------- |
| `dice: 2d20kl`  | `[7, 18d] = 7`         |
| `dice: 4d20kl2` | `[4, 12d, 15d, 3] = 7` |

## Drop Lowest

### Syntax: XdXd{n} / XdXdl{n}

Drops lowest `{n}` rolls. `{n}` is optional, and will default to 1. Dropped dice will display as `Nd`.

### Example

| Formula                          | Result                 |
| -------------------------------- | ---------------------- |
| `dice: 2d20d` / `dice: 2d20dl`   | `[7d, 18] = 18`        |
| `dice: 4d20d2` / `dice: 4d20dl2` | `[4d, 12, 15, 3d = 27` |

## Drop Highest

### Syntax: XdXdh{n}

Keeps lowest `{n}` rolls. `{n}` is optional, and will default to 1. Dropped dice will display as `Nd`.

### Example

| Formula         | Result                |
| --------------- | --------------------- |
| `dice: 2d20dh`  | `[7, 18d] = 7`        |
| `dice: 4d20dh2` | `[4, 12d, 15d, 3 = 7` |

## Explode

### Syntax: XdX!{n|i}

Explode will roll an additional die for each maximum die roll. If `{n}` or `{i}` is provided, it will continue exploding until a number less than the maximum is rolled, or `{n}` attempts have been made. `{i}` is capped at 100 rolls to prevent abuse.

Exploded dice will display as `N!`.

### Examples

| Formula       | Result                                |
| ------------- | ------------------------------------- |
| `dice: 2d20!` | `[7, 20!, 8] = 35`                    |
| `dice: 2d4!3` | `[3, 4!, 4!, 2] = 13`                 |
| `dice: 1d1!i` | `[1!, 1!, 1!, ... , 1!, 1!, 1] = 100` |

## Explode & Combine

### Syntax: XdX!!{n|i}

Equivalent to explode, but exploded dice are combined in the tooltip display.

### Examples

| Formula        | Result          |
| -------------- | --------------- |
| `dice: 2d20!!` | `[7, 28!] = 34` |
| `dice: 2d4!!3` | `[3, 10!] = 13` |
| `dice: 1d1!!i` | `[100!] = 100`  |

## Re-roll

### Syntax: XdXr{n|i}

Re-roll a minimum dice. If `{n}` or `{i}` is provided, it will continue re-rolling until a number greater than the minimum is rolled, or `{n}` attempts have been made.

Re-rolled dice _replace_ their original roll, unlike explode, which _add_ new rolls.

Re-rolled dice will display as `Xr` in the tooltip.

### Examples

| Formula       | Result          |
| ------------- | --------------- |
| `dice: 2d20r` | `[7r, 18] = 15` |
| `dice: 2d4r3` | `[3, 3r] = 6`   |
| `dice: 1d2ri` | `[2r] = 2`      |

# Conditions

The [Explode](#explode), [Explode and Combine](#explode--combine) and [Re-roll](#re-roll) modifiers each support an optional _condition_ operator. If provided, the condition operator
changes the die rolls that the modifier is applied to.

Supported Conditions:

| Condition           | Effect                                                           |
| ------------------- | ---------------------------------------------------------------- |
| `={n}`              | Only rolls that are equal to `{n}` are modified.                 |
| `!={n}*` or `=!{n}` | Only rolls that are not equal to `{n}` are modified.             |
| `>{n}`              | Only rolls that are greater than `{n}` are modified.             |
| `<{n}`              | Only rolls that are less than `{n}` are modified.                |
| `>={n}`             | Only rolls that are greater than or equal to `{n}` are modified. |
| `<={n}`             | Only rolls that are less than or equal to `{n}` are modified.    |

\*Not supported as the first conditional on a parameterless [Explode](#explode) due to a collision with [Explode and Combine](#explode--combine). If necessary, use `=!{n}`.

These conditions are fully chainable.

## Examples

| Formula          | Description                               | Result                                   |
| ---------------- | ----------------------------------------- | ---------------------------------------- |
| `dice: 1d4!=3`   | Explode rolls equal to 3                  | `[4, 2, 3!, 2] = 11`                     |
| `dice: 1d4!i!=3` | Explode rolls not equal to 3 infinitely   | `[4!, 2!, 3, 2!, 3, 2!, 1!, 4!, 3] = 24` |
| `dice: 1d4r<3`   | Re-roll rolls less than 3                 | `[4, 1, 2, 4] -> [4, 4r, 3r, 4] = 15`    |
| `dice: 1d4r<2>3` | Re-roll rolls less than 2, greater than 3 | `[4, 1, 2, 4] -> [3r, 2r, 2, 2r] = 9`    |

# Customization

The following CSS is applied:

```css
.dice-roller {
    position: relative;
    display: inline-block;
    cursor: pointer;
    margin: 0 0.25em 0 0;
    font-weight: bolder;
}
.dice-roller > .dice-roller-button {
    display: inline-block;
    position: relative;
    font-size: inherit;
    margin-left: 0.25em;
}
.dice.tooltip {
    max-width: unset !important;
}
```

The dice icon cannot be changed, but setting the `.dice-roller-button` to to `display: none` will hide it.

# Coming Soon

-   [x] Preview of actual dice results when hovered
-   [x] Drop X number of lowest or highest results
-   [x] Conditionals for modifiers (e.g., changing "maximum" to explode on)
-   [x] Fudge/fate die
-   [ ] Pass/fail states for entire result
-   [ ] Pass/fail states for individual rolls

# Installation

## From within Obsidian

From Obsidian v0.9.8, you can activate this plugin within Obsidian by doing the following:

-   Open Settings > Third-party plugin
-   Make sure Safe mode is **off**
-   Click Browse community plugins
-   Search for this plugin
-   Click Install
-   Once installed, close the community plugins window and activate the newly installed plugin

## From GitHub

-   Download the Latest Release from the Releases section of the GitHub Repository
-   Extract the plugin folder from the zip to your vault's plugins folder: `<vault>/.obsidian/plugins/`  
    Note: On some machines the `.obsidian` folder may be hidden. On MacOS you should be able to press `Command+Shift+Dot` to show the folder in Finder.
-   Reload Obsidian
-   If prompted about Safe Mode, you can disable safe mode and enable the plugin.
    Otherwise head to Settings, third-party plugins, make sure safe mode is off and
    enable the plugin from there.

### Updates

You can follow the same procedure to update the plugin

# Warning

This plugin comes with no guarantee of stability and bugs may delete data.
Please ensure you have automated backups.

# TTRPG plugins

If you're using Obsidian to run/plan a TTRPG, you may find my other plugin useful:

-   [Obsidian Leaflet](https://github.com/valentine195/obsidian-leaflet-plugin) - Add interactive maps to Obsidian.md notes
-   [5e Statblocks](https://github.com/valentine195/obsidian-5e-statblocks/) - Create 5e-styled statblocks inside notes


<a href="https://www.buymeacoffee.com/valentine195"><img src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=&slug=valentine195&button_colour=acd9fb&font_colour=000000&font_family=Inter&outline_colour=000000&coffee_colour=FFDD00"></a>