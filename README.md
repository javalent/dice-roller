# Dice Roller

Inline dice rolling for Obsidian.md.

# Usage

Simply place a code block with your formula in your note (such as `` `dice: XdX` ``) and in preview mode it will be replaced with the result of the dice rolls. The result can then be re-rolled by clicking on it.

# Formulas

[Dice formulas](#dice-formulas) can be added in settings, allowing you to define aliases for commonly used rolls. This works for _all_ dice types define below.

# Dice Rollers

The parser supports addition, subtraction, multiplication, division, and exponents of an arbitrary number of dice or static numbers. Spaces are removed before the formula is parsed.

There is full order-of-operations support, so it can even nested into parentheses!

| Examples                                  |
| ----------------------------------------- |
| `` `dice: 1d2` ``                         |
| `` `dice: 3d4 + 3` ``                     |
| `` `dice: 1d12 + 1d10 + 5` ``             |
| `` `dice: 3d4+3d4-(3d4 * 1d4) - 2^1d7` `` |

## Dataview Integration

The plugin has basic support for Dataview inline fields in number dice.

Please note that if you have multiple inline fields of the same name, the plugin will only use **one**, and it is not possible to control the one it uses - it will be the last field indexed by Dataview.

Example:

```md
field:: 3
field2:: 5
```

`` `dice: field` ``
`` `dice: 1d6 + field` ``
`` `dice: 1d6*field2 + field` ``

## Faces

The faces can be supplied as either a raw number or as a `[min, max]` array.

Example: `` `dice: 1d[3,5]` `` will roll 1 die between 3 and 5.

## Omitting Values

Both the number of rolls and the faces can be omitted.

Roll will default to `1`.

Faces will default to `100`.

These defaults can be changed in settings.

## Percentile Dice

The parser supports percentile dice. `` `dice: Xd%` `` will roll X d100 dice.

For a custom percent (such as those used for Traveller's `1d66`), you can use `XdX%` - see [the percent modifier](#custom-percent-dice).

## Fudge/Fate Dice

Use `` `dice: XdF` `` to roll a fudge/fate dice. See [here](<https://en.wikipedia.org/wiki/Fudge_(role-playing_game_system)#Fudge_dice>) for more info on this type of dice.

## Fantasy AGE Stunt Dice

Use `` `dice: 1dS` `` to roll a Fantasy AGE stunt dice. The result will show the total roll and also the stunt points if successful.

## Dice Modifiers

The parser supports several modifiers. If a die has been modified, it will display _how_ it has been modified in the tooltip.

**Modifiers are only supported on basic number dice.**

If a modifier has a parameter, it will default to 1 if not provided.

| Modifier          | Syntax         | Description                                                                                        |
| ----------------- | -------------- | -------------------------------------------------------------------------------------------------- |
| Min/Max           | `Xd[Y, Z]`     | Roll a dice with minimum Y, maximum Z.                                                             |
| Keep Highest      | `k{n}`/`kh{n}` | Keep highest `{n}` dice.                                                                           |
| Keep Lowest       | `kl{n}`        | Keep lowest `{n}` dice.                                                                            |
| Drop Lowest       | `dl{n}`        | Drop lowest `{n}` dice.                                                                            |
| Drop Highest      | `dh{n}`        | Drop highest `{n}` dice.                                                                           |
| Explode           | `!{n}`, `!i`   | Explode dice `{n}` times. If `i` is provided, will explode "infinitely" (capped at 100).           |
| Explode & Combine | `!!{n}`, `!!i` | Same as explode, but exploded dice are summed in the display instead of being shown individually.  |
| Re-roll           | `r{n}`, `ri`   | Re-roll a minimum dice `{n}` times. If `i` is provided, will re-roll "infinitely" (capped at 100). |

### Min/Max

#### Syntax: Xd[Y, Z]

Create a custom die, with a minimum of Y and a maximum of Z.

#### Example

| Formula            | Result         |
| ------------------ | -------------- |
| `dice: 4d[7, 8]`   | `[7, 7, 8, 7]` |
| `dice: 1d[20, 20]` | `[20]`         |

### Keep Highest

#### Syntax: XdXk{n} / XdXkh{n}

Keeps highest `{n}` rolls. `{n}` is optional, and will default to 1. Dropped dice will display as `Nd`.

#### Example

| Formula                          | Result                 |
| -------------------------------- | ---------------------- |
| `dice: 2d20k` / `dice: 2d20kh`   | `[7d, 18] = 18`        |
| `dice: 4d20k2` / `dice: 4d20kh2` | `[4d, 12, 15, 3d = 27` |

### Keep Lowest

#### Syntax: XdXkl{n}

Keeps lowest `{n}` rolls. `{n}` is optional, and will default to 1. Dropped dice will display as `Nd`.

#### Example

| Formula         | Result                 |
| --------------- | ---------------------- |
| `dice: 2d20kl`  | `[7, 18d] = 7`         |
| `dice: 4d20kl2` | `[4, 12d, 15d, 3] = 7` |

### Drop Lowest

#### Syntax: XdXdl{n}

Drops lowest `{n}` rolls. `{n}` is optional, and will default to 1. Dropped dice will display as `Nd`.

#### Example

| Formula         | Result                 |
| --------------- | ---------------------- |
| `dice: 2d20dl`  | `[7d, 18] = 18`        |
| `dice: 4d20dl2` | `[4d, 12, 15, 3d = 27` |

### Drop Highest

#### Syntax: XdXdh{n}

Keeps lowest `{n}` rolls. `{n}` is optional, and will default to 1. Dropped dice will display as `Nd`.

#### Example

| Formula         | Result                |
| --------------- | --------------------- |
| `dice: 2d20dh`  | `[7, 18d] = 7`        |
| `dice: 4d20dh2` | `[4, 12d, 15d, 3 = 7` |

### Explode

#### Syntax: XdX!{n|i}

Explode will roll an additional die for each maximum die roll. If `{n}` or `{i}` is provided, it will continue exploding until a number less than the maximum is rolled, or `{n}` attempts have been made. `{i}` is capped at 100 rolls to prevent abuse.

Exploded dice will display as `N!`.

#### Examples

| Formula       | Result                                |
| ------------- | ------------------------------------- |
| `dice: 2d20!` | `[7, 20!, 8] = 35`                    |
| `dice: 2d4!3` | `[3, 4!, 4!, 2] = 13`                 |
| `dice: 1d1!i` | `[1!, 1!, 1!, ... , 1!, 1!, 1] = 100` |

### Explode & Combine

#### Syntax: XdX!!{n|i}

Equivalent to explode, but exploded dice are combined in the tooltip display.

#### Examples

| Formula        | Result          |
| -------------- | --------------- |
| `dice: 2d20!!` | `[7, 28!] = 34` |
| `dice: 2d4!!3` | `[3, 10!] = 13` |
| `dice: 1d1!!i` | `[100!] = 100`  |

### Re-roll

#### Syntax: XdXr{n|i}

Re-roll a minimum dice. If `{n}` or `{i}` is provided, it will continue re-rolling until a number greater than the minimum is rolled, or `{n}` attempts have been made.

Re-rolled dice _replace_ their original roll, unlike explode, which _add_ new rolls.

Re-rolled dice will display as `Xr` in the tooltip.

#### Examples

| Formula       | Result          |
| ------------- | --------------- |
| `dice: 2d20r` | `[7r, 18] = 15` |
| `dice: 2d4r3` | `[3, 3r] = 6`   |
| `dice: 1d2ri` | `[2r] = 2`      |

### Custom Percent Dice

#### Syntax: XdX%

Customize the type of percent dice rolled. It will roll a dice for each face digit provided and combine them into a result.

#### Examples

| Formula         | Result                   |
| --------------- | ------------------------ |
| `dice: 1d66%`   | `[6, 3] = 6,3`           |
| `dice: 1d7367%` | `[4, 2, 4, 1] = 4,2,4,1` |

## Conditions

### Dice Conditions

Dice rolls support conditional parameters as of version 6.0.0. This allows you to specify a set of requirements, one of which the dice must meet to be included in the roll. If the dice meets this requirement, it will be considered a `1` (pass), and if it does not, it will be considered a `0` (failure).

Additionally, a `negative equals` condition may be supplied; if the dice meet this requirement, it will be considered a `-1`.

The following conditions are supported:

| Condition          | Effect                                                             |
| ------------------ | ------------------------------------------------------------------ |
| `={n}`             | Only rolls that are equal to `{n}` are successful.                 |
| `=!{n}`\*          | Only rolls that are not equal to `{n}` are successful.             |
| `>{n}`             | Only rolls that are greater than `{n}` are successful.             |
| `<{n}`             | Only rolls that are less than `{n}` are successful.                |
| `>={n}`            | Only rolls that are greater than or equal to `{n}` are successful. |
| `<={n}`            | Only rolls that are less than or equal to `{n}` are successful.    |
| `-={n}` or `=-{n}` | Rolls equal to `{n}` will be considered -1.                        |

\*Note that `!={n}` is supported as a dice condition due to a collision with [Explode](#explode). If necessary, use `=!{n}`.

### Modifier Conditions

The [Explode](#explode), [Explode and Combine](#explode--combine) and [Re-roll](#re-roll) modifiers each support an optional _condition_ operator. If provided, the condition operator
changes the die rolls that the modifier is applied to.

Supported Conditions:

| Condition | Effect                                                           |
| --------- | ---------------------------------------------------------------- |
| `={n}`    | Only rolls that are equal to `{n}` are modified.                 |
| `=!{n}`   | Only rolls that are not equal to `{n}` are modified.             |
| `>{n}`    | Only rolls that are greater than `{n}` are modified.             |
| `<{n}`    | Only rolls that are less than `{n}` are modified.                |
| `>={n}`   | Only rolls that are greater than or equal to `{n}` are modified. |
| `<={n}`   | Only rolls that are less than or equal to `{n}` are modified.    |

These conditions are fully chainable.

### Examples

| Formula          | Description                               | Result                                   |
| ---------------- | ----------------------------------------- | ---------------------------------------- |
| `dice: 1d4!=3`   | Explode rolls equal to 3                  | `[4, 2, 3!, 2] = 11`                     |
| `dice: 1d4!i=!3` | Explode rolls not equal to 3 infinitely   | `[4!, 2!, 3, 2!, 3, 2!, 1!, 4!, 3] = 24` |
| `dice: 1d4r<3`   | Re-roll rolls less than 3                 | `[4, 1, 2, 4] -> [4, 4r, 3r, 4] = 15`    |
| `dice: 1d4r<2>3` | Re-roll rolls less than 2, greater than 3 | `[4, 1, 2, 4] -> [3r, 2r, 2, 2r] = 9`    |

# Section Rollers

The Dice Roller can be given a link to a note or a tag, and it will return a random block from the note/notes.

This feature is still under development and may not work as expected.

<kbd>Ctrl</kbd> / <kbd>Command</kbd> - clicking a result will open the associated note.

Usage:
| Example | Result |
| --- | --- |
| `` `dice: [[Note]]` `` | Returns a single random block from `Note` |
| `` `dice: 3d[[Note]]` `` | Returns 3 random blocks from `Note` |

## Block Types

Obsidian has several "types" of blocks. Currently, the default behavior of the plugin is to filter out **thematicBreak** and **yaml** from the returned results.

To return a specific block type, you may append `|<type>` to the end of any block roller. These can be chained by separating them with a comma.

Usage:

| Example                                         | Result                                                                                   |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `` `dice: [[Note]]\|paragraph` ``               | Return `paragraph` blocks                                                                |
| `` `dice: #tag\|paragraph,heading,yaml` ``      | Return `paragraph`, `heading`, and `yaml` blocks                                         |
| `` `dice: #tag\|-\|paragraph,heading-3,yaml` `` | Return `paragraph`, level 3 `heading`s, and `yaml` blocks from a **single, random note** |

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

### Headings

Headings can be further filtered down by the heading size by appending the size to the end of the type:

`` `dice: [[Note]]|heading-2` ``

# Line Rollers

The Dice Roller can be told to return a random line from any note using the following syntax:

`` `dice: [[Note]]|line` ``

> Note: The plugin will filter out zero-length lines, but depending on note content, you may still get "blank" lines.

# Tag Rollers

The Dice Roller can also be told to return results from a tag if the [Dataview](https://github.com/blacksmithgu/obsidian-dataview) plugin is installed.

By default, this will return 1 result from _every_ file that has the tag. You can change this behavior in settings, or by using the following optional `+` and `-` parameters as shown below.

If results from multiple files are returned, the result **from that file** can be re-rolled by clicking on the block. Clicking on the container or the dice icon will re-roll **all returned results**.

Tag dice support the same block-type parameters as above.

| Example               | Result                                                                                                   |
| --------------------- | -------------------------------------------------------------------------------------------------------- |
| `` `dice: #tag` ``    | Return a single random block from notes with `#tag`, behavior depends on settings (default to **every**) |
| `` `dice: #tag\|-` `` | Return a single random block from **a single, random note** with `#tag`                                  |
| `` `dice: #tag\|+` `` | Return a single random block from **every note** with `#tag`                                             |

## Links

If the `Always Return Links for Tags` setting is on, or `|link` is appended to the end of the tag, a link to a random note will be returned instead of sections.

At the moment this will only return a single link regardless of the number of rolls specified. This may change in a later release.

# Table Rollers

The Dice Roller may also be given a link to a table in a note, which it will read and return a random result from the table.

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

To return multiple elements, use a [dice formula](#dice-rollers) before the wikilink:

- `` `dice: X[[Note^block-id]]` ``

- `` `dice: 1d4+1[[Note^block-id]]` ``

- `` `dice: Xd[[Note^block-id]]` ``

Note that, for backward compatibility reasons, `d` is interpreted as a `d1` and not as a `d100` like in regular dice formulas.


Once in preview mode, you may <kbd>Ctrl</kbd> - click on the result to open the block reference in a new pane.

## Multiple Headers

If a table provided to the plugin has multiple headers, the plugin will return the entire row unless you specify the header to use:

| Header | Header 2 |
| ------ | -------- |
| A      | D        |
| B      | E        |
| C      | F        |

^block-id

`` `dice: [[Note^block-id]]|Header 2` ``

## Lookup Tables

The dice roller can also be used as a lookup table by passing a block-id to a table with the following format:

```markdown
| dice: 1d20 | Heading  |
| ---------- | -------- |
| 1-2        | Option 1 |
| 3-4        | Option 2 |
| 5-10       | Option 3 |
| 11         | Option 4 |
| 13,14      | Option 5 |
| 15-20      | Option 6 |
```

Requirements:

1. The table must only be **two columns**.
2. The first column **must be a valid dice roll syntax**.

The Table roller will roll the supplied dice formula, and return the matching result.

The options can _also_ be a roller (of any type). This allows you to nest rollers: for example, you could supply a reference to different treasure tables, and when the treasure table is returned, the roller will get a random result from that table.

Example:

```markdown
| dice:1d% | Result                                 |
| -------- | -------------------------------------- |
| 01–50    | Nothing                                |
| 51–60    | `dice: [[Encounters^easy-encounters]]` |
| 61–100   | `dice: [[Encounters^hard-encounters]]` |

^encounter

`dice: [[ThisNote^encounter]]`
```

# List Rollers

The Dice Roller may also be given a link to a list in a note, which it will read and return a random result from the list.

Usage:

In a note (such as `Note.md`), create a list & optionally give it a block id:

```mardkwon
-   a
-   b
-   c
-   d

^block-id
```

Then, in the dice formula, use a wikilink to the block reference of the table:

`` `dice: [[Note^block-id]]` ``

The plugin will read the list and return a random result.

To return multiple elements, use:

`` `dice: Xd[[Note^block-id]]` ``

Once in preview mode, you may <kbd>Ctrl</kbd> - click on the result to open the block reference in a new pane.

# Tooltip

The result in preview mode has a tooltip that will appear when you hover over it.

It displays the formula used to calculate the result on the top line, and displays the calculated rolls on the bottom line.

# Saving Results

Results can be saved for dice rolls as of version 6.1.0 using either the [Globally Save Results](#globally-save-results) setting or the following syntax:

| Syntax       | Description                                                                |
| ------------ | -------------------------------------------------------------------------- |
| `dice+: ...` | Save result. Same as `dice: ...` if `Globally Save Results` is on.         |
| `dice-: ...` | Do not save result. Same as `dice: ...` if `Globally Save Results` is off. |

# Replacing Note Content

It is possible to tell the plugin to replace the file contents of the note with the calculated dice roll using the `dice-mod: <formula>` syntax.

The plugin will replace the contents of the note with the syntax:

`<formula> -> <full results> -> <combined results>`

Example:

`dice-mod: 3d100 + 12` => `3d100 + 12 -> [75, 20, 75] + 12 -> 182`

## Displaying Formula

By default, the plugin will display the formula along with the result.

This can be turned off globally by turning off `Add Formula When Modifying` in settings, or by appending `|noform` to a `dice-mod` roll.

## Replacing Blocks

If `dice-mod` is used on a section roller, the plugin will attempt to find a block id for the resulting section, so it can be embedded.

If a block id does not exist for that section, the plugin will attempt to create one for the section. This will modify the file being rolled.

# Dice Flags

There are flags that can be appended to the dice formulas shown below that will modify how the dice behave.

## `|nodice`

Don't want to see the dice button on results?

You can turn it off in settings, or by appending `|nodice` to **any** dice roll!

## `|form` and `|noform`

These two flags can be used to control whether or not the dice formula is displayed with a [`dice-mod`](#replacing-note-content) roll.

## `|render` and `|norender`

Want to roll graphical dice from your notes?

Use the `|render` flag at the end of a [dice roller](#dice-roller) formula, and the plugin will roll 3D dice to calculate the result.

See [Graphical Dice]() for more information.

## `|form` and `|noform`

These two flags can be used to control whether or not the dice formula is displayed with rolls.

They can be used for [`dice-mod`](#replacing-note-content) and [dice roller](#dice-roller).

This can be turned on or off globally in settings, using [Display Formula With Results](#display-formula-with-results) for [dice roller](#dice-roller) and [Add Formula when Using Modify Dice](#add-formula-when-using-modify-dice) for [`dice-mod`](#replacing-note-content).

## `|avg`

Want the initial dice value to be the average instead of rolling it?

Use the `|avg` flag at the end of a [dice roller](#dice-roller) formula, and the plugin will initialize the result using the average value of dice rolls.
The tooltip will indicate that the result is an average and show the averages.

Example: `dice: 2d6+3|avg` gives `10`as the result and displays `average: [3.5,3.5]+3` in the tooltip.

Next rolls will not use the average anymore but normal random dice roll results. On the other hand, using Alt-click to reroll forces average to be (re)used.

## `|none`

Want no value being displayed before clicking on the reroll icon?

Use the `|none` flag at the end of a [dice roller](#dice-roller) formula, and the plugin will initialize the result with an empty value.
The tooltip will indicate that the result is none.

Next rolls will display the normal result using random dice roll results. On the other hand, using Ctrl-click to reroll forces none to be (re)used.

## `|text(my text)`

Want to roll dice without displaying the result in your note?

Use the `|text(my text)` flag at the end of a [dice roller](#dice-roller) formula, and the plugin will display your 'my text' and let you click on it to trigger a roll.

The roll result is only visible in the tooltip.

Example for a DnD saving throw, use: `dice: 1d20 + 2|nodice|text(Dexterity +2)`
When hovering on top of `Dexterity +2`, you'll see a random saving throw result (click to reroll as usual).

# The Dice View

The plugin comes with a Dice View that can be added to the workspace.

If you have the [Open Dice View on Startup](#open-dice-view-on-startup) setting off or have closed the Dice View, it can be re-opened using the "Open Dice View" command in the command palette.

The Dice View has buttons for common D20 dice set, can be set to roll with advantage or disadvantage, and modifiers can be added.

Formulas can also just be written directly in the `Dice Formula` textbox. These formulas can be saved using the plus button under the text box for quick re-rolling.

# Graphical Dice

3D Dice can be rolled using the Dice View if [Display Graphics for Dice View Rolls](#display-graphics-for-dice-view-rolls) is turned on in settings, the or the [`|render` flag](#render-and-norender) is used in the dice formula.

> :pencil: Only the basic D20 set (D4, D6, D8, D10, D12, and D20) can be rolled graphically.

See [Graphical Dice](#graphical-dice-1) for settings.

# Usage in Other plugins

Plugins that have the ability to write JavaScript (such as DataView) can interface with the Dice Roller plugin in by accessing it on the Obsidian app object:

```js
const diceRollerPlugin = app.plugins.getPlugin("obsidian-dice-roller");
```

Once you have an instance of the plugin, you can then generate the various types of rollers, such as a dice roller, tag roller, etc, using the `getRoller` method:

```typescript
//definition
getRoller(diceString: string, sourceFile: string = ""): Promise<Roller>;

//example
const diceRoller = await diceRollerPlugin.getRoller("1d3+3d8");
```

## Array Roller

A special type of roller is available using the JavaScript interface, where you can directly pass in an array you want a result from. 

```ts
//definition
getArrayRoller(options: any[], rolls: number = 1): Promise<ArrayRoller>;

ArrayRoller {
    /** Roll the array roller and generate a new set of results. */
    roll(): Promise<any>

    /** Property containing the container element of the array roller. Use this to attach it to the note's DOM */
    containerEl: HTMLElement;

    /** Property containing the array of randomly-generated results. This will change every time the array roller is rolled. */
    results: any[]
}

//example
const diceRoller = await diceRollerPlugin.getArrayRoller([1, 2, 3, 4, 5], 2);

```

# Settings

## Generic Settings

### Globally Save Results

The plugin will attempt to save and reload the results for all dice rollers. Overridable using a `-` in the dice formula, like this: `` `dice-: ...` ``.

Please note that the plugin will **attempt** to save. Saving results of inline code blocks is tricky and difficult - the plugin has to remember _where_ in the note each dice roll was in order to properly save and reload the result. Any changes made to the note outside of Obsidian will cause the plugin to lose this state and the next time the note is re-opened, it will be rerolled.

If you have to have a permanent result, it is more reliable to use a `dice-mod` roll instead, which will actually modify the underlying note, making the result permanent. See [Replacing Note Content](#replacing-note-content) for more information.

## Dice Display

Settings to control how dice results are displayed.

### Display Formula with Results

The formula used to calculate the result will be displayed along with the result.

### Display Dice Button with Results

A dice button will appear next to the results, making it obvious this is a dice roller.

### Add Formula when Using Modify Dice

A `dice-mod` roll will append the formula used to calculate the result when writing the result to the note.

## Dice Rollers

Settings to control how [Dice Rollers](#dice-rollers) behave.

### Default Face

The plugin will use this number as the default face if it is omitted - see [Faces](#faces) for more information.

### Round Results

Determine the rounding behavior when decimal numbers are returned.

### Always Render Dice

Dice rolls in notes will always be rendered. Use the [`|norender`](#render-and-norender) flag to prevent this behavior.

## Table Rollers

Settings to control how [Table Rollers](#table-rollers) behave.

### Display Lookup Table Roll

Lookup table rolls will also display the number rolled along with the result from the table.

## Section Rollers

Settings to control how [Section Rollers](#section-rollers) behave.

### Add Copy Button to Section Results

Section roller results will have a "Copy Content" button added, allowing you to copy the note contents for that section to your clipboard.

## Tag Rollers

Settings to control how [Tag Rollers](#tag-rollers) behave.

### Roll All Files for Tags

A result from _each_ file with the specified tag will be returned. If this setting is off, a result from a _random_ file with the tag will be returned. Overrideable with `` `dice: #tag|-` ``

### Always Return Links for Tags

Tag rollers will behave like [Link Rollers](#links) by default. This option is the same as specifying `` `dice: #tag|link` ``.

## Dice View

### Open Dice View on Startup

The [Dice View](#the-dice-view) will automatically open on startup. Otherwise it may be opened with the command "Open Dice View".

## Graphical Dice

Settings to control how [graphical dice](#graphical-dice) behave.

### Display Graphics for Dice View Rolls

Rolls made in the [Dice View](#the-dice-view) will use graphics.

### Display Time for Dice Graphics

Controls how long dice graphics are displayed before fading away. This should be a number of **milliseconds.** If blank, a click is required to clear dice.

### Dice Base Color

This is the color of the actual dice bodies.

### Dice Text Color

This is the color of the numbers on the dice.

## Dice Formulas

Dice formulas can be created in settings. Formulas must be given an alias; when the plugin detects the formula alias, it will use the defined formula for the roll. This works for _all_ roller types.

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
-   [Initiative Tracker](https://github.com/valentine195/obsidian-initiative-tracker) - Track TTRPG Initiative in Obsidian

<a href="https://www.buymeacoffee.com/valentine195"><img src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=☕&slug=valentine195&button_colour=e3e7ef&font_colour=262626&font_family=Inter&outline_colour=262626&coffee_colour=ff0000"></a>
