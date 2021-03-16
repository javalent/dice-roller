## Dice Roller
Dice rolling for Obsidian.md

### Usage
Simply place a code block with your formula in your note (such as ` ```dice XdX``` `) and in preview mode it will be replaced with the result of the dice rolls. The result can then be re-rolled by clicking on it.

#### Dice Formula

The parser supports addition, subtraction, multiplication, division, and exponents of an arbitrary number of dice or static numbers. Spaces are removed before the formula is parsed.

There is full order-of-operations support, so it can even nested into parentheses!

| Examples                            |
| ----------------------------------- |
| ` ```dice 1d2``` `                         |
| ` ```dice 3d4 + 2``` `                    |
| ` ```dice 1d12 + 1d10 + 2``` `             |
| ` ```dice 3d4+3d4-(3d4 * 1d4) - 2^1d2``` ` |

#### Customization

The result is given the `.dice-roller` class. Override it to customize the look of the result.

The dice button has the `.dice-roller-button` class. The button icon cannot be customized, but you can use this class to change how it is displayed.

### Coming Soon

- Preview of actual dice results when hovered
## Installation


### From GitHub
- Download the Latest Release from the Releases section of the GitHub Repository
- Extract the plugin folder from the zip to your vault's plugins folder: `<vault>/.obsidian/plugins/`  
Note: On some machines the `.obsidian` folder may be hidden. On MacOS you should be able to press `Command+Shift+Dot` to show the folder in Finder.
- Reload Obsidian
- If prompted about Safe Mode, you can disable safe mode and enable the plugin.
Otherwise head to Settings, third-party plugins, make sure safe mode is off and
enable the plugin from there.

#### Updates
You can follow the same procedure to update the plugin

## Warning

This plugin comes with no guarantee of stability and bugs may delete data.
Please ensure you have automated backups.
## TTRPG plugins

If you're using Obsidian to run/plan a TTRPG, you may find my other plugin useful:

- [Obsidian Leaflet](https://github.com/valentine195/obsidian-leaflet-plugin) - Add interactive maps to Obsidian.md notes
   

