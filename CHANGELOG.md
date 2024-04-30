# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [11.0.2](https://github.com/javalent/dice-roller/compare/11.0.1...11.0.2) (2024-04-30)


### Bug Fixes

* Fixes issue where the default roll was 100 dice ([f69b188](https://github.com/javalent/dice-roller/commit/f69b1888c3076a1925ab9e941262b94591448bcb))

## [11.0.1](https://github.com/javalent/dice-roller/compare/11.0.0...11.0.1) (2024-04-23)


### Bug Fixes

* Fixes @javalent/utilities dependency ([98b2b7d](https://github.com/javalent/dice-roller/commit/98b2b7da40455c6fbba72d821a4b65b6db025039))

## [11.0.0](https://github.com/javalent/dice-roller/compare/10.5.0...11.0.0) (2024-04-23)


### ⚠ BREAKING CHANGES

* Dataview field lookups are now based on the **current active file**, not a cached set of fields.
* Attempting to save dice roller results has been removed.

### Features

* Attempting to save dice roller results has been removed. ([f879462](https://github.com/javalent/dice-roller/commit/f8794625ba9efb56ba1e590136bc37cb495cb004))
* Dataview field lookups are now based on the **current active file**, not a cached set of fields. ([d424df9](https://github.com/javalent/dice-roller/commit/d424df98760270164b857049754f2e098b14e1ff))
* Expose DiceRoller API directly on the window as `DiceRoller` ([377a35c](https://github.com/javalent/dice-roller/commit/377a35c3fe755ba584f9dc5d6011dc87bb50430a))
* Published npm package as `@javalent/dice-roller` ([1fad1f2](https://github.com/javalent/dice-roller/commit/1fad1f253f20ecf1d5579566dc582499b78ef783))
* Saves last 100 view results across sessions ([7073393](https://github.com/javalent/dice-roller/commit/70733931ace97f205f76bcf3e6893c528c9b428e))


### Bug Fixes

* All StackRollers add themselves to the dice view when rolled ([2373977](https://github.com/javalent/dice-roller/commit/237397741f221eeca5f61c656704f66f42a5d2f6))
* Deprecate the use of main plugin methods. Use the new DiceRoller API instead. ([8cd8524](https://github.com/javalent/dice-roller/commit/8cd8524ea9203b4a19ac104791059a7fda0edaaf))
* Export Rollers in API definition ([135cb43](https://github.com/javalent/dice-roller/commit/135cb435f4d371b13525205f70bfb3f98d1df9c3))
* Fixes module building ([5b6210f](https://github.com/javalent/dice-roller/commit/5b6210fb997939b865bb9f7091912fa6d47fe0a3))
* Fixes some icon definitions ([8a0cc2b](https://github.com/javalent/dice-roller/commit/8a0cc2be27aff9328548ce37a5f7acf47fc42304))
* Generalize Dataview inline field call ([0337fbd](https://github.com/javalent/dice-roller/commit/0337fbd7108a2bd7e085c3f56ea3e5dde8f41a2b))
* Made all dice roller objects stateless ([3f4b229](https://github.com/javalent/dice-roller/commit/3f4b2295a008dcf76314d799dac82627b9beba92))
* Make Lexer stateless and a singleton ([fcf495b](https://github.com/javalent/dice-roller/commit/fcf495b35c542ff981fc6a417a3104a7825cc148))
* Migrate dice post processor to encapsulated class ([99b2dc9](https://github.com/javalent/dice-roller/commit/99b2dc9b310b0aa981abd7ec7a1973a2e7fe0f1d))
* Mock DataviewManager due to Obsidian dependency ([56441ee](https://github.com/javalent/dice-roller/commit/56441ee5d3f482050e6348dbefc25dd21b06e6e0))
* Remove FontAwesome from the plugin ([6570ca0](https://github.com/javalent/dice-roller/commit/6570ca09bc294aeeaefe65b6d4032e8541a776be))
* Remove need for injecting plugin into the API ([d90519e](https://github.com/javalent/dice-roller/commit/d90519e6201e3f7afc1afb00df42b4b3970e51d5))
* Remove result duplication ([7080267](https://github.com/javalent/dice-roller/commit/7080267c6bdd3363e00972b0369480db1e6c7888))
* Remove unused file ([af5ed78](https://github.com/javalent/dice-roller/commit/af5ed78fcafc04bdc5e2af34122edf99c6759c7b))
* Reworks some aspects of the dice view to be more modular in the future ([d7b42bc](https://github.com/javalent/dice-roller/commit/d7b42bcdc22d0a1804fa549bfb9150885f9e5001))
* Switches to [@javalent](https://github.com/javalent) scoped utilities module ([d2b44a6](https://github.com/javalent/dice-roller/commit/d2b44a673d7a95584c8a178c6501f4374a355e92))
* Update lib typings ([9cb018f](https://github.com/javalent/dice-roller/commit/9cb018fc73d690661c654a79d98cf91d22b65ea8))

## [10.5.0](https://github.com/javalent/dice-roller/compare/10.4.6...10.5.0) (2024-04-15)


### Features

* New min/max syntax: `dice: 1d[5-10]` ([fc7ee80](https://github.com/javalent/dice-roller/commit/fc7ee80d3eacd2e95711d9c1ca7501a3bc58373a))

## [10.4.6](https://github.com/javalent/dice-roller/compare/10.4.5...10.4.6) (2024-03-19)


### Bug Fixes

* Fixes issue with folder suggester for template folders in settings ([dd4f87a](https://github.com/javalent/dice-roller/commit/dd4f87aa58927de066e1ae15b9edde08a4709388))

## [10.4.5](https://github.com/javalent/dice-roller/compare/10.4.4...10.4.5) (2024-02-22)


### Bug Fixes

* Fixes folder suggester not opening sometimes ([88c3a9a](https://github.com/javalent/dice-roller/commit/88c3a9ad49e6a706b0bfffa9fd405bd0e59399c8))
* Improves UI for dice mod template folders settings ([ec0a1e3](https://github.com/javalent/dice-roller/commit/ec0a1e382c5e7a6173c43456d712b5797bdaec7f))

## [10.4.4](https://github.com/javalent/dice-roller/compare/10.4.3...10.4.4) (2024-02-01)


### Bug Fixes

* allow backticks in lookup table rolls ([5a7500e](https://github.com/javalent/dice-roller/commit/5a7500ed9a9bd0f28b6439a2aece555f089f67f3))

## [10.4.3](https://github.com/javalent/dice-roller/compare/10.4.2...10.4.3) (2024-01-09)


### Bug Fixes

* upgrade esbuild ([7cd4737](https://github.com/javalent/dice-roller/commit/7cd47372d76d3191d64759bf53c59716e3cdb4a2))

## [10.4.2](https://github.com/javalent/dice-roller/compare/10.4.1...10.4.2) (2024-01-09)


### Bug Fixes

* revert dice-mod changes until a better solution is found ([bd06964](https://github.com/javalent/dice-roller/commit/bd06964809f0fd47dc1bae7e3fda0d06422074e4))

## [10.4.1](https://github.com/javalent/dice-roller/compare/10.4.0...10.4.1) (2024-01-03)


### Bug Fixes

* Fixes clicking on a section/table roller in LP enters the source (close [#283](https://github.com/javalent/dice-roller/issues/283)) ([43e93d7](https://github.com/javalent/dice-roller/commit/43e93d774e73d01127f002acb9fc6ce56e195b4a))
* Fixes custom percent dice (close [#280](https://github.com/javalent/dice-roller/issues/280)) ([e3bb922](https://github.com/javalent/dice-roller/commit/e3bb922fa6d24c0e036df1368ac71e7785643762))
* Fixes d4 dice formula for dice tray (close [#276](https://github.com/javalent/dice-roller/issues/276)) ([7f7aa17](https://github.com/javalent/dice-roller/commit/7f7aa17545a4d842e704bee50b82f0ac53a2cf6a))
* Fixes dice-mod race condition (close [#277](https://github.com/javalent/dice-roller/issues/277)) ([06a55a5](https://github.com/javalent/dice-roller/commit/06a55a5fcd00d72f90567e45852533927c6d2d1b))
* Stopping the renderer resolves in-process dice rolls (close [#285](https://github.com/javalent/dice-roller/issues/285)) ([74d33c6](https://github.com/javalent/dice-roller/commit/74d33c62e9c680689a3761b63fb608beaaa2093a))

## [10.4.0](https://github.com/javalent/dice-roller/compare/10.3.0...10.4.0) (2023-11-09)


### Features

* **dice-mod:** add setting for template folder to prevent applicatio… ([#263](https://github.com/javalent/dice-roller/issues/263)) ([0c02b78](https://github.com/javalent/dice-roller/commit/0c02b789b66021a73695957353d0c0639e6cf1a2))


### Bug Fixes

* Fixes bug where opening in source mode caused `dice-mod` to immediately fire ([3d9c19e](https://github.com/javalent/dice-roller/commit/3d9c19e9f0f57613c68b5fcc39eaee205d3bd908))
* Fixes issue where Link Rollers would modify notes ([3d98a75](https://github.com/javalent/dice-roller/commit/3d98a7506e1214313394fa4c7267f4d5d7cb7125))
* Fixes issue where the Escape Dice Mod setting wasn't respected by LP ([1183e34](https://github.com/javalent/dice-roller/commit/1183e341b9ccf6ecde685527566d2fcd9a69089b))
* Significantly improves Section Roller performance for large number of files ([4905d7c](https://github.com/javalent/dice-roller/commit/4905d7cb8899afe70f847c1c3d7909d274f9d7e6))

## [10.3.0](https://github.com/javalent/dice-roller/compare/10.2.0...10.3.0) (2023-11-01)


### Features

* Can now disable Notice for graphical rolls ([8e901b6](https://github.com/javalent/dice-roller/commit/8e901b6a813d75a3942a62c6591c6e68d96e8616))


### Bug Fixes

* **escapeDiceMod:** disabling option is not preventing evaluation anymore ([#266](https://github.com/javalent/dice-roller/issues/266)) ([53a64f1](https://github.com/javalent/dice-roller/commit/53a64f16ae32a2c96524f78c07d99a73b42bf382))

## [10.2.0](https://github.com/javalent/dice-roller/compare/10.1.2...10.2.0) (2023-10-27)


### Features

* Enables changing the font of rendered dice ([c16d3c0](https://github.com/javalent/dice-roller/commit/c16d3c07fd71675fd56facaf94045dca51eeecb1))


### Bug Fixes

* **dicetray:** error handling for roll button ([#264](https://github.com/javalent/dice-roller/issues/264)) ([0f2c599](https://github.com/javalent/dice-roller/commit/0f2c599c242b099d7bd3811314cc95486fffca7c))
* Fixes average calculation ([bf87aa8](https://github.com/javalent/dice-roller/commit/bf87aa80565b4e45cbb4c88cc9b89a3c49e82be5))
* **lexer:** handle unary minus operator ([#262](https://github.com/javalent/dice-roller/issues/262)) ([139cbfa](https://github.com/javalent/dice-roller/commit/139cbfa6c7927686a3d2bedda6732c3ce3df7fef))

## [10.1.2](https://github.com/javalent/dice-roller/compare/10.1.1...10.1.2) (2023-10-20)


### Bug Fixes

* Adds "None" as a possible shape for dice tray icons ([62cd320](https://github.com/javalent/dice-roller/commit/62cd32029192adbe0751dbb80da0a5f05c08d380))
* Buttons to add static values to Dice Tray formula work again ([ceae731](https://github.com/javalent/dice-roller/commit/ceae731fcd8e2443fc117b52fd2d74af86f2b9f7))
* Right clicking a dice-tray icon executes a roll immediately again ([ff54b9e](https://github.com/javalent/dice-roller/commit/ff54b9ec3b7191dec31764d2e8490fe001943f26))

## [10.1.1](https://github.com/javalent/dice-roller/compare/10.1.0...10.1.1) (2023-10-20)


### Bug Fixes

* adds missing dependencies ([f587a81](https://github.com/javalent/dice-roller/commit/f587a81094c959456a291d04a12279022d7c168c))

## [10.1.0](https://github.com/javalent/dice-roller/compare/10.0.3...10.1.0) (2023-10-20)


### Features

* Can now specify custom dice buttons for the Dice Tray view in settings ([f8a8a60](https://github.com/javalent/dice-roller/commit/f8a8a60a1f4b7cb497e43a9efaaaafdab28c6275))


### Bug Fixes

* Fixes decoration of dice when it is a negative roll ([da0fdb6](https://github.com/javalent/dice-roller/commit/da0fdb66b2bdf50975ab36892cf918d317c2bcf0))
* Fixes max/min decoration of dice when a static number is present in formula ([8c9538e](https://github.com/javalent/dice-roller/commit/8c9538e77a05f3eea2fc803ae0c7c655bb1b7bdf))
* improve visual appearance of dice roller settings ([7ec8bea](https://github.com/javalent/dice-roller/commit/7ec8beae2b0062b4c425d43617ef3031ef9514b0))
* Improves behavior when the first dice in a formula is negative ([249e13d](https://github.com/javalent/dice-roller/commit/249e13de753ac94ec687e281a89cc8622ffb7c2c))
* re-enable dice-based conditions ([059120f](https://github.com/javalent/dice-roller/commit/059120f23ba8b4f1a5c2e7abe47f6ba9c8468a7b))
* Rename Dice View to Dice Tray ([a3c24c7](https://github.com/javalent/dice-roller/commit/a3c24c73ac1c16762459db13377b4a8f8a3ebc70))

## [10.0.3](https://github.com/javalent/dice-roller/compare/10.0.2...10.0.3) (2023-10-16)


### Bug Fixes

* Dice rollers that roll min/max are decorated with the `is-min` or `is-max` css class (close [#244](https://github.com/javalent/dice-roller/issues/244)) ([6ab60d9](https://github.com/javalent/dice-roller/commit/6ab60d98bf3cbb82895b5447d691488e429b6b80))
* Enables a Fudge/Fate dice icon (toggleable in settings) (close [#251](https://github.com/javalent/dice-roller/issues/251)) ([fd5aabf](https://github.com/javalent/dice-roller/commit/fd5aabf4c774003da4af8d87125b8f33b362ee0a))
* fixes issue where rendered dice didn't match result (close [#252](https://github.com/javalent/dice-roller/issues/252)) ([21671ee](https://github.com/javalent/dice-roller/commit/21671ee13afa90e282e673143fe9903ceccd1e69))
* fixes issue with calculating Fate results ([7388384](https://github.com/javalent/dice-roller/commit/7388384bbfd8594018a43e3f605a11945857c76c))

## [10.0.2](https://github.com/javalent/dice-roller/compare/10.0.1...10.0.2) (2023-10-14)


### Bug Fixes

* fix issue where reroll could happen incorrectly ([ae212e4](https://github.com/javalent/dice-roller/commit/ae212e462d45467433c5c75d001350837f750559))
* fixes dice-mod not respecting form/noform in live preview ([c13922d](https://github.com/javalent/dice-roller/commit/c13922dbeeb0402eff82bc4270f55383b47ce717))
* improves rendering performance ([74f351d](https://github.com/javalent/dice-roller/commit/74f351df5199649f6ae52b7c5ab77c5e4a350dd8))

## [10.0.1](https://github.com/javalent/dice-roller/compare/10.0.0...10.0.1) (2023-10-11)


### Bug Fixes

* fixes unique modifier not working in renderer ([4232ae5](https://github.com/javalent/dice-roller/commit/4232ae53b794c62f15e3d0e8551913971b5ad1aa))

## [10.0.0](https://github.com/javalent/dice-roller/compare/9.4.1...10.0.0) (2023-10-11)


### ⚠ BREAKING CHANGES

* Rewrote renderer to allow for all dice modifiers to pass through

### Features

* Enables custom dice values using `Xd[...]` syntax ([af5ccf1](https://github.com/javalent/dice-roller/commit/af5ccf13c2c517e2126830dac2328570cd505531))
* Rewrote renderer to allow for all dice modifiers to pass through ([9be1207](https://github.com/javalent/dice-roller/commit/9be1207fc5b028532e7691bfdf5ee8239ad43b2c))

## [9.4.1](https://github.com/javalent/dice-roller/compare/9.4.0...9.4.1) (2023-09-11)


### Miscellaneous Chores

* release 9.4.1 ([dd2eb18](https://github.com/javalent/dice-roller/commit/dd2eb18c39aaf93c7e5990f5ab8b905fc43b2496))

## [9.4.0](https://github.com/javalent/dice-roller/compare/9.3.1...9.4.0) (2023-09-06)


### Features

* new `Add to View` setting for Dice rollers. when enabled, all dice roller results will be added to the Dice View ([70a11c4](https://github.com/javalent/dice-roller/commit/70a11c4743b384e465d6736079218bbdd53736d9))

## [9.3.1](https://github.com/javalent/dice-roller/compare/9.3.0...9.3.1) (2023-08-22)


### Bug Fixes

* Allow markdown character escaping to be turned off ([e12eb7e](https://github.com/javalent/dice-roller/commit/e12eb7e72a90f7b47ba55c0da5dbcfe0d41567e0))

## [9.3.0](https://github.com/javalent/dice-roller/compare/9.2.0...9.3.0) (2023-07-25)


### Features

* add initial display options ([#234](https://github.com/javalent/dice-roller/issues/234)) ([b3d5c60](https://github.com/javalent/dice-roller/commit/b3d5c60f2ca1e6960c6d665b0f5db3556f727381))

## [9.2.0](https://github.com/javalent/dice-roller/compare/9.1.0...9.2.0) (2023-07-17)


### Features

* Can now display '+' for positive results with `|signed` flag (close [#217](https://github.com/javalent/dice-roller/issues/217)) ([958ea0b](https://github.com/javalent/dice-roller/commit/958ea0b12aaa148d5b479a00397efe4d34fe0e8c))
* Can now resize graphical dice within a range (0.5 -&gt; 1.5 times) (close [#156](https://github.com/javalent/dice-roller/issues/156)) ([a0d61ed](https://github.com/javalent/dice-roller/commit/a0d61edea92590bbcea6647fceb44423e5be67aa))
* Can now specify flags to control rounding behavior (close [#218](https://github.com/javalent/dice-roller/issues/218)) ([e6045d9](https://github.com/javalent/dice-roller/commit/e6045d9ca624bbfca8acb773270b8bae5bc5eca3))
* Right clicking dice in the dice view now quick rolls (close [#229](https://github.com/javalent/dice-roller/issues/229)) ([bc8bcc6](https://github.com/javalent/dice-roller/commit/bc8bcc6499b4ab3f9f0565a5f44806941b2c5841))

## [9.1.0](https://github.com/javalent/dice-roller/compare/9.0.0...9.1.0) (2023-07-15)


### Features

* Add colorful dice setting and default colors for standard rpg dice ([#228](https://github.com/javalent/dice-roller/issues/228)) ([4ff934a](https://github.com/javalent/dice-roller/commit/4ff934aa50cd87068093c6b890d0752c61a79912))

## [9.0.0](https://github.com/javalent/dice-roller/compare/8.17.0...9.0.0) (2023-07-03)


### ⚠ BREAKING CHANGES

* Tag Rollers & Dataview Rollers now return 1 result per file. Xd... will now return multiple files.

### Features

* Tag Rollers & Dataview Rollers now return 1 result per file. Xd... will now return multiple files. ([ce55930](https://github.com/javalent/dice-roller/commit/ce55930d771ac838c72687cb0e875930339a0a01))

## [8.17.0](https://github.com/javalent/dice-roller/compare/8.16.1...8.17.0) (2023-07-02)


### Features

* Enables rolling based on a Dataview query using `dice: dv(...)` ([315a884](https://github.com/javalent/dice-roller/commit/315a884c1319eed8db781e71a532523252a9f61b))

## [8.16.1](https://github.com/javalent/dice-roller/compare/8.16.0...8.16.1) (2023-06-27)


### Bug Fixes

* fixes using integer as comparer in conditionals ([381ee58](https://github.com/javalent/dice-roller/commit/381ee58cee95711f8c942f712dee759c740e1404))

## [8.16.0](https://github.com/javalent/dice-roller/compare/8.15.1...8.16.0) (2023-06-23)


### Features

* enables exploding graphical dice ([1917329](https://github.com/javalent/dice-roller/commit/1917329abc5bad6efbe2b9d312f2c76cfa880ac8))


### Bug Fixes

* fixes reroll breaking when rendering dice ([19c00cf](https://github.com/javalent/dice-roller/commit/19c00cf9df1d2413312e96f3ba89ea72f4d3aebb))

## [8.15.1](https://github.com/javalent/dice-roller/compare/8.15.0...8.15.1) (2023-06-15)


### Bug Fixes

* fixes reroll & explode not parsing ([d5db7fc](https://github.com/javalent/dice-roller/commit/d5db7fc01e0b475578d8908aaed5f78a23227ef5))

## [8.15.0](https://github.com/javalent/dice-roller/compare/8.14.5...8.15.0) (2023-06-14)


### Features

* enables dice rollers to be specified in condition checks ([e6c8bc4](https://github.com/javalent/dice-roller/commit/e6c8bc410a84b2263deb18012e29205dab6c5fae))


### Bug Fixes

* fix renderMarkdown error ([1e91353](https://github.com/javalent/dice-roller/commit/1e91353622a80d50ad15cf5c41f8db2aacad107f))

## [8.14.5](https://github.com/javalent/dice-roller/compare/8.14.4...8.14.5) (2023-04-27)


### Bug Fixes

* dice-mod now respects rendering ([7a629fe](https://github.com/javalent/dice-roller/commit/7a629fe29ab22ba135827361aabd44788f82cca4))

## [8.14.4](https://github.com/javalent/dice-roller/compare/8.14.3...8.14.4) (2023-04-25)


### Bug Fixes

* fixes getRollerString text displays as null ([0339294](https://github.com/javalent/dice-roller/commit/0339294ab4d17730ffe1b327f0c654aabfbf4ec3))

## [8.14.3](https://github.com/javalent/dice-roller/compare/8.14.2...8.14.3) (2023-04-25)


### Bug Fixes

* add getRollerString api hook ([b4dc1ef](https://github.com/javalent/dice-roller/commit/b4dc1ef4a5a288073c91e4f27411d0df1e9dff1b))

## [8.14.2](https://github.com/javalent/dice-roller/compare/8.14.1...8.14.2) (2023-04-20)


### Bug Fixes

* fix type defs ([e1f1f4d](https://github.com/javalent/dice-roller/commit/e1f1f4d88631aebec4caa9ef126084aca47c6ae1))

## [8.14.1](https://github.com/javalent/dice-roller/compare/8.14.0...8.14.1) (2023-04-20)


### Bug Fixes

* properly export types ([beb18d1](https://github.com/javalent/dice-roller/commit/beb18d17632f10ddb907c4b4961b8f7ca118369e))

## [8.14.0](https://github.com/javalent/dice-roller/compare/8.13.14...8.14.0) (2023-04-20)


### Features

* Upgrading obsidian-dice-roller to latest ([21e3d8d](https://github.com/javalent/dice-roller/commit/21e3d8d6aef5fc1e586350fc5ed3af38939b022e))

## [8.13.14](https://github.com/javalent/dice-roller/compare/8.13.13...8.13.14) (2023-04-20)


### Bug Fixes

* fix upgrade secrets inheritance ([87bb16d](https://github.com/javalent/dice-roller/commit/87bb16dec694ae31a40b9a06411682c07cb74b07))

## [8.13.13](https://github.com/javalent/dice-roller/compare/8.13.12...8.13.13) (2023-04-20)


### Bug Fixes

* test upgrade ([91be65e](https://github.com/javalent/dice-roller/commit/91be65e25cd4aabbd2ff2b70b749f3cc0a9eaecb))

## [8.13.12](https://github.com/javalent/dice-roller/compare/8.13.11...8.13.12) (2023-04-20)


### Bug Fixes

* inherit secrets ([48e3a9f](https://github.com/javalent/dice-roller/commit/48e3a9f5954696fcc1f867443188b2a8a119ee94))

## [8.13.11](https://github.com/javalent/dice-roller/compare/8.13.10...8.13.11) (2023-04-20)


### Bug Fixes

* fix module name ([9164e58](https://github.com/javalent/dice-roller/commit/9164e584fda0b12503c502dddf185c152acb2a63))
* test overload upgrade ([e9aab68](https://github.com/javalent/dice-roller/commit/e9aab685dcb432fb7f47766d2e0b109620a27ad6))

## [8.13.10](https://github.com/valentine195/obsidian-dice-roller/compare/8.13.9...8.13.10) (2023-04-19)


### Bug Fixes

* point to es2022 ([69396ee](https://github.com/valentine195/obsidian-dice-roller/commit/69396ee90b04d06b156c35beb1c7bddceb4dde65))

## [8.13.9](https://github.com/valentine195/obsidian-dice-roller/compare/8.13.8...8.13.9) (2023-04-19)


### Bug Fixes

* fixes position property losing pointer ([f1752ad](https://github.com/valentine195/obsidian-dice-roller/commit/f1752ad712dc66fff354adc312c5b930376a5198))

## [8.13.8](https://github.com/valentine195/obsidian-dice-roller/compare/8.13.7...8.13.8) (2023-04-18)


### Bug Fixes

* Update types for npm package ([1978a32](https://github.com/valentine195/obsidian-dice-roller/commit/1978a32f71d826eac7c061edbdfbeb0ac0179faf))

## [8.13.7](https://github.com/valentine195/obsidian-dice-roller/compare/8.13.6...8.13.7) (2023-04-18)


### Bug Fixes

* fix output ([876be71](https://github.com/valentine195/obsidian-dice-roller/commit/876be715781be9796aec37ead3ff1c65c8620c2c))

## [8.13.6](https://github.com/valentine195/obsidian-dice-roller/compare/8.13.5...8.13.6) (2023-04-18)


### Bug Fixes

* fixes release action...maybe ([6b6ef8e](https://github.com/valentine195/obsidian-dice-roller/commit/6b6ef8eb823364ae1a83096d13025634015b8747))

## [8.13.5](https://github.com/valentine195/obsidian-dice-roller/compare/v8.13.4...8.13.5) (2023-04-18)


### Bug Fixes

* fixes release version ([1f73ac6](https://github.com/valentine195/obsidian-dice-roller/commit/1f73ac617e40a9550c12211292aca72ea8bad3aa))

## [8.13.4](https://github.com/valentine195/obsidian-dice-roller/compare/v8.13.3...v8.13.4) (2023-04-18)


### Bug Fixes

* adds npm types for use in overload ([3af9182](https://github.com/valentine195/obsidian-dice-roller/commit/3af9182283d7db5e3c8f9a332ce95740cfdc9405))

## [8.13.3](https://github.com/valentine195/obsidian-dice-roller/compare/8.13.2...v8.13.3) (2023-04-18)


### Bug Fixes

* adds release-please manifest ([cde32ae](https://github.com/valentine195/obsidian-dice-roller/commit/cde32aef84107317a94a687feca75483aad42b32))
* switch to release-please ([a106cad](https://github.com/valentine195/obsidian-dice-roller/commit/a106cad1b5302c2e77909caf0487e0e84cc342b3))

### [8.13.2](https://github.com/valentine195/obsidian-dice-roller/compare/8.13.1...8.13.2) (2023-04-17)


### Bug Fixes

* fixes call stack error ([fde014a](https://github.com/valentine195/obsidian-dice-roller/commit/fde014a8049f6581f84080b1a12039b0c5eb1303))

### [8.13.1](https://github.com/valentine195/obsidian-dice-roller/compare/8.13.0...8.13.1) (2023-03-23)


### Bug Fixes

* fixes copy button (close [#173](https://github.com/valentine195/obsidian-dice-roller/issues/173)) ([0e7bbc6](https://github.com/valentine195/obsidian-dice-roller/commit/0e7bbc696d3ffc9c517d099e37c54656cfa8de21))

## [8.13.0](https://github.com/valentine195/obsidian-dice-roller/compare/8.12.5...8.13.0) (2023-03-23)


### Features

* Adds new API ([96f7860](https://github.com/valentine195/obsidian-dice-roller/commit/96f7860ce21935fea5a758ed0496bc3c68613e9b))

### [8.12.5](https://github.com/valentine195/obsidian-dice-roller/compare/8.12.4...8.12.5) (2023-03-23)


### Bug Fixes

* fixes display formula setting not respected in LP ([34ab83b](https://github.com/valentine195/obsidian-dice-roller/commit/34ab83b6722c76104976a9a487ced1a13eee29a9))

### [8.12.4](https://github.com/valentine195/obsidian-dice-roller/compare/8.12.3...8.12.4) (2023-03-23)


### Bug Fixes

* Dice View now respects the Show Formula setting ([c4c3560](https://github.com/valentine195/obsidian-dice-roller/commit/c4c3560c44a44c475f870fadd47e52ccde622651))

### [8.12.3](https://github.com/valentine195/obsidian-dice-roller/compare/8.12.2...8.12.3) (2023-03-20)


### Bug Fixes

* fixes possible weirdness with uniques ([2e22194](https://github.com/valentine195/obsidian-dice-roller/commit/2e2219467652ea571799e0d8209b48794fc51a1a))

### [8.12.2](https://github.com/valentine195/obsidian-dice-roller/compare/8.12.1...8.12.2) (2023-03-20)


### Bug Fixes

* version bump ([447f06f](https://github.com/valentine195/obsidian-dice-roller/commit/447f06f96eb96a44d1c5c1a88efc2ded22a9d820))

### [8.12.1](https://github.com/valentine195/obsidian-dice-roller/compare/8.12.0...8.12.1) (2023-03-20)


### Bug Fixes

* Re-roll Dice command now works in LP (close [#171](https://github.com/valentine195/obsidian-dice-roller/issues/171)) ([4675203](https://github.com/valentine195/obsidian-dice-roller/commit/4675203142468c002d57f9a015de03fb6220ff01))

## [8.12.0](https://github.com/valentine195/obsidian-dice-roller/compare/8.11.1...8.12.0) (2023-03-19)


### Features

* Adds unique modifier ([8e41412](https://github.com/valentine195/obsidian-dice-roller/commit/8e41412416a2c64e7557e54217bdfb84a9731d44))

### [8.11.1](https://github.com/valentine195/obsidian-dice-roller/compare/8.11.0...8.11.1) (2023-03-12)


### Bug Fixes

* Fixes getRoller not rendering (close [#150](https://github.com/valentine195/obsidian-dice-roller/issues/150)) ([e6385fa](https://github.com/valentine195/obsidian-dice-roller/commit/e6385faaa3826a118f6acbdcaa7a1cfbd10ef45d))

## [8.11.0](https://github.com/valentine195/obsidian-dice-roller/compare/8.10.1...8.11.0) (2023-03-12)


### Features

* Can turn off embed styling for section rollers (close [#161](https://github.com/valentine195/obsidian-dice-roller/issues/161)) ([be9cdcf](https://github.com/valentine195/obsidian-dice-roller/commit/be9cdcf9ee3a420a6157dffc4e68b327f5ea27e6))
* On  demand dice roll rendering with Shfit Click ([018fdbf](https://github.com/valentine195/obsidian-dice-roller/commit/018fdbf8f51b3ab9d6e72fc3a178ef9850485003))


### Bug Fixes

* fixes double modifier application when rendering (close [#164](https://github.com/valentine195/obsidian-dice-roller/issues/164)) ([199439d](https://github.com/valentine195/obsidian-dice-roller/commit/199439d8c28c5513a351917d4b0d7d2bbf2bf924))

### [8.10.1](https://github.com/valentine195/obsidian-dice-roller/compare/8.10.0...8.10.1) (2023-03-10)


### Bug Fixes

* adds synchronous stack roller rolls ([87928c6](https://github.com/valentine195/obsidian-dice-roller/commit/87928c6ef82960f0013d1a2a3f80d3bd52904eca))

## [8.10.0](https://github.com/valentine195/obsidian-dice-roller/compare/8.9.1...8.10.0) (2023-03-09)


### Features

* adds xy table lookup ([21f0643](https://github.com/valentine195/obsidian-dice-roller/commit/21f06434d43748daf3fa46f3ad1d8743564dc0ce))

### [8.9.1](https://github.com/valentine195/obsidian-dice-roller/compare/8.9.0...8.9.1) (2023-03-09)


### Bug Fixes

* Escapes special characters in dice mod output ([06c33cc](https://github.com/valentine195/obsidian-dice-roller/commit/06c33cc33ff573b3facbf83c237461e3a922d6cc))

## [8.9.0](https://github.com/valentine195/obsidian-dice-roller/compare/8.8.3...8.9.0) (2023-02-16)


### Features

* adds ability to display formula after result ([a5d3cd7](https://github.com/valentine195/obsidian-dice-roller/commit/a5d3cd7066ee0a5cedfc28a0dd3f3f0607460c65))

### [8.8.3](https://github.com/valentine195/obsidian-dice-roller/compare/8.8.2...8.8.3) (2023-01-27)


### Bug Fixes

* Open Dice View reveals view if open ([844ecf5](https://github.com/valentine195/obsidian-dice-roller/commit/844ecf5c05c81e08ee08b824f1cefb0be2cf4ab5))

### [8.8.2](https://github.com/valentine195/obsidian-dice-roller/compare/8.8.1...8.8.2) (2023-01-12)


### Bug Fixes

* fixes issue rendering multiple dice in a initiative tracker view ([ee31423](https://github.com/valentine195/obsidian-dice-roller/commit/ee314237ec805420063a2bb574e2bef4cf0d0d90))

### [8.8.1](https://github.com/valentine195/obsidian-dice-roller/compare/8.8.0...8.8.1) (2023-01-11)


### Bug Fixes

* fixes issue rendering in initiative tracker view ([f6be201](https://github.com/valentine195/obsidian-dice-roller/commit/f6be201d5ba45434e6946cb703edd846c568d2aa))

## [8.8.0](https://github.com/valentine195/obsidian-dice-roller/compare/8.7.2...8.8.0) (2022-10-26)


### Features

* adds dice sorting (close [#143](https://github.com/valentine195/obsidian-dice-roller/issues/143)) ([5f47ed7](https://github.com/valentine195/obsidian-dice-roller/commit/5f47ed78c45b2375a32ebb613646eb3b7f070c8a))


### Bug Fixes

* removes bold from mod when show formula is on (close [#119](https://github.com/valentine195/obsidian-dice-roller/issues/119)) ([828a8bb](https://github.com/valentine195/obsidian-dice-roller/commit/828a8bb148011e51f38ce1c50c1ab23e68eeb710))
* removes file watcher causing massive memory leak (close [#117](https://github.com/valentine195/obsidian-dice-roller/issues/117)) ([deb0f1e](https://github.com/valentine195/obsidian-dice-roller/commit/deb0f1eea8a148af8e96984ad3b9f24fede07f37))

### [8.7.2](https://github.com/valentine195/obsidian-dice-roller/compare/8.7.1...8.7.2) (2022-10-25)


### Bug Fixes

* dice-mod async ([1439e07](https://github.com/valentine195/obsidian-dice-roller/commit/1439e0768398374efcfadb31ab315dcf8442c1a9))

### [8.7.1](https://github.com/valentine195/obsidian-dice-roller/compare/8.7.0...8.7.1) (2022-10-24)


### Bug Fixes

* fixes dice-mod behavior in live preview ([88a656e](https://github.com/valentine195/obsidian-dice-roller/commit/88a656ebd766acc89e5a3f45e3a3df74470fc989))

## [8.7.0](https://github.com/valentine195/obsidian-dice-roller/compare/8.6.9...8.7.0) (2022-10-21)


### Features

* live preview support ([3c4c8a6](https://github.com/valentine195/obsidian-dice-roller/commit/3c4c8a6a1ea85b0ed201517ca52ed44f6ed09033))

### [8.6.9](https://github.com/valentine195/obsidian-dice-roller/compare/8.6.8...8.6.9) (2022-09-27)


### Bug Fixes

* type guard parseDiceSync ([a340af4](https://github.com/valentine195/obsidian-dice-roller/commit/a340af42a3c889504afc8701bb8e648f54916e1c))

### [8.6.8](https://github.com/valentine195/obsidian-dice-roller/compare/8.6.7...8.6.8) (2022-09-27)


### Bug Fixes

* adds parseDiceSync ([298ee64](https://github.com/valentine195/obsidian-dice-roller/commit/298ee646299c28a3d428f0799e42688fe3fd8c07))

### [8.6.7](https://github.com/valentine195/obsidian-dice-roller/compare/8.6.6...8.6.7) (2022-09-18)


### Bug Fixes

* Switch to span elements to allow for copying text without line breaks ([223f33b](https://github.com/valentine195/obsidian-dice-roller/commit/223f33b1a18235837a08cf45e8a75357b7cf0fd7))

### [8.6.6](https://github.com/valentine195/obsidian-dice-roller/compare/8.6.5...8.6.6) (2022-09-10)


### Bug Fixes

* removed genesys imports ([bfbadc2](https://github.com/valentine195/obsidian-dice-roller/commit/bfbadc2f5a17b0440818f720553385a29eecbf90))

### [8.6.5](https://github.com/valentine195/obsidian-dice-roller/compare/8.6.4...8.6.5) (2022-09-10)


### Bug Fixes

* fixes load order issue with dataview ([e793d1d](https://github.com/valentine195/obsidian-dice-roller/commit/e793d1d468a8ae7295ab9739f4f1cbeb5e1084ff))

### [8.6.4](https://github.com/valentine195/obsidian-dice-roller/compare/8.6.3...8.6.4) (2022-08-25)


### Bug Fixes

* fixes Dataview interfacing issue (close [#141](https://github.com/valentine195/obsidian-dice-roller/issues/141)) ([a21c80a](https://github.com/valentine195/obsidian-dice-roller/commit/a21c80ae08560edaf5c3951fd4e0898e8b6f59e4))

### [8.6.3](https://github.com/valentine195/obsidian-dice-roller/compare/8.6.2...8.6.3) (2022-08-20)


### Bug Fixes

* Rendered dice no longer render on note-open, only click (close [#138](https://github.com/valentine195/obsidian-dice-roller/issues/138)) ([f5b6f98](https://github.com/valentine195/obsidian-dice-roller/commit/f5b6f98fc7b8e786e1f0a1c6fe637692426536a1))
* Show notice with rendered dice results (close [#130](https://github.com/valentine195/obsidian-dice-roller/issues/130)) ([6a5262c](https://github.com/valentine195/obsidian-dice-roller/commit/6a5262cf43c3ecbefef39085d607c19ae93773ed))

## [8.6.0](https://github.com/valentine195/obsidian-dice-roller/compare/8.5.2...8.6.0) (2022-06-08)


### Features

* added ArrayRoller interface ([4160dc6](https://github.com/valentine195/obsidian-dice-roller/commit/4160dc6e3e06c2d12668ecd5d24773542bafde1b))


### Bug Fixes

* fix typing on syncronous getRoller ([23a65ba](https://github.com/valentine195/obsidian-dice-roller/commit/23a65bad42a52f0d1aa460c35f2e838158ff69fc))
* hacky fix for ebullient's issue ([649285f](https://github.com/valentine195/obsidian-dice-roller/commit/649285fc48563e8c707412a672d82785a7791270))

## [8.5.0](https://github.com/valentine195/obsidian-dice-roller/compare/8.4.3...8.5.0) (2022-06-03)


### Bug Fixes

* Properly await file modification promises to resolve ([668bd7e](https://github.com/valentine195/obsidian-dice-roller/commit/668bd7e672e8dd50d57e1160693b44bc52a789a7))

### [8.3.1](https://github.com/valentine195/obsidian-dice-roller/compare/8.3.0...8.3.1) (2022-03-11)


### Bug Fixes

* Fixes layout of embedded table results if the results have line breaks ([5db4ff8](https://github.com/valentine195/obsidian-dice-roller/commit/5db4ff882775fa954fd0ed05471717db6b5d7367))

## [8.3.0](https://github.com/valentine195/obsidian-dice-roller/compare/8.2.1...8.3.0) (2022-03-10)


### Features

* Add rounding controls for dice (close [#86](https://github.com/valentine195/obsidian-dice-roller/issues/86)) ([946f8be](https://github.com/valentine195/obsidian-dice-roller/commit/946f8bebc8ac83fe525b5c467e5e35f4acacab22))
* Added `|render` flag to render dice rolls from notes (close [#85](https://github.com/valentine195/obsidian-dice-roller/issues/85)) ([11de860](https://github.com/valentine195/obsidian-dice-roller/commit/11de860f9396873b8a43b38c5d5afcc6a18b973c))
* Adds `|form` flag (close [#80](https://github.com/valentine195/obsidian-dice-roller/issues/80)) ([050998f](https://github.com/valentine195/obsidian-dice-roller/commit/050998f3ff6ac82de3e8d9bb826a127823f4adc0))
* Adds the Always Render Dice and the `|norender` flag ([39178ff](https://github.com/valentine195/obsidian-dice-roller/commit/39178ff1fb5e07e6c21c3b4a98f7e3baeaa1ef23))


### Bug Fixes

* Accidentally left starwars testing dice in production, whoops ([16078b1](https://github.com/valentine195/obsidian-dice-roller/commit/16078b1aed6b635a4c659ef9a0d9dbfbdd5dd523))

### [8.2.1](https://github.com/valentine195/obsidian-dice-roller/compare/8.2.0...8.2.1) (2022-01-24)


### Bug Fixes

* fixes regex collision with dataview variables (close [#72](https://github.com/valentine195/obsidian-dice-roller/issues/72)) ([59541f8](https://github.com/valentine195/obsidian-dice-roller/commit/59541f86ec58b6aba6b9282228ca71d6539071cd))

## [8.2.0](https://github.com/valentine195/obsidian-dice-roller/compare/8.1.0...8.2.0) (2022-01-20)


### Features

* supports markdown links in section and table rollers ([43abc5b](https://github.com/valentine195/obsidian-dice-roller/commit/43abc5bb4e416ea2345e3a0752097c27a6c45edb))


### Bug Fixes

* improves styling on embedded dice rollers ([d16a4a8](https://github.com/valentine195/obsidian-dice-roller/commit/d16a4a84c287a5efd37bf35316d88b630e2b76d9))

## [8.1.0](https://github.com/valentine195/obsidian-dice-roller/compare/8.0.0...8.1.0) (2022-01-17)


### Features

* adds reroll support to dice graphics ([5abbfa3](https://github.com/valentine195/obsidian-dice-roller/commit/5abbfa38b9009167c40054362e09fac582e24512))


### Bug Fixes

* fix advantage and disadvantage when rolling graphical dice (close [#69](https://github.com/valentine195/obsidian-dice-roller/issues/69)) ([9beeb41](https://github.com/valentine195/obsidian-dice-roller/commit/9beeb41e336f51a72770252ec40c9cd45d513120))
* fix issue with dataview inline fields in new lexical parser ([9ad0f6f](https://github.com/valentine195/obsidian-dice-roller/commit/9ad0f6f3fa96b578c0983897cf7052c5d032c233))

## [8.0.0](https://github.com/valentine195/obsidian-dice-roller/compare/7.13.2...8.0.0) (2022-01-17)


### ⚠ BREAKING CHANGES

* Lexical parser rewritten to be more extensible and faster

### Features

* Adds graphic display time setting (leave blank to require click) (close [#64](https://github.com/valentine195/obsidian-dice-roller/issues/64)) ([d95f3fa](https://github.com/valentine195/obsidian-dice-roller/commit/d95f3fabdbef6dff4553edfadba3c176607986aa))
* Lexical parser rewritten to be more extensible and faster ([fb25476](https://github.com/valentine195/obsidian-dice-roller/commit/fb25476b2580a23fe81fa35217a574b6064e63b8))


### Bug Fixes

* fixed issue with saving results (close [#65](https://github.com/valentine195/obsidian-dice-roller/issues/65), close [#56](https://github.com/valentine195/obsidian-dice-roller/issues/56)) ([6b885df](https://github.com/valentine195/obsidian-dice-roller/commit/6b885df2f00160f136624310cd9daf904c4035c1))
* removes modifiers from tooltip result ([73f9a71](https://github.com/valentine195/obsidian-dice-roller/commit/73f9a714377904bfe44a05ed42633f5ab1897112))

### [7.13.2](https://github.com/valentine195/obsidian-dice-roller/compare/7.13.1...7.13.2) (2022-01-14)


### Bug Fixes

* fix compatability issue with dataview integration ([66311e6](https://github.com/valentine195/obsidian-dice-roller/commit/66311e6bf84743f5349ea12d2a92d5b25ffa4a31))

### [7.13.1](https://github.com/valentine195/obsidian-dice-roller/compare/7.13.0...7.13.1) (2022-01-11)


### Bug Fixes

* remove styling from `|noform` option (close [#68](https://github.com/valentine195/obsidian-dice-roller/issues/68)) ([561554e](https://github.com/valentine195/obsidian-dice-roller/commit/561554e9dfa53df9f041fb46c03b102f0f94431e))

## [7.13.0](https://github.com/valentine195/obsidian-dice-roller/compare/7.12.0...7.13.0) (2022-01-07)


### Features

* added fudge/fate dice graphics ([c5ca4d2](https://github.com/valentine195/obsidian-dice-roller/commit/c5ca4d2ce5954f15600ee8da4456691dd36bc250))


### Bug Fixes

* improve renderer factory performance ([def8005](https://github.com/valentine195/obsidian-dice-roller/commit/def8005c25e9ea655074eef76fb547a74dc126c4))

## [7.12.0](https://github.com/valentine195/obsidian-dice-roller/compare/7.11.1...7.12.0) (2022-01-07)


### Features

* added custom percent dice ([7bc5469](https://github.com/valentine195/obsidian-dice-roller/commit/7bc5469b22aa465719474b88de5af8a3ad29c1ac))

### [7.11.1](https://github.com/valentine195/obsidian-dice-roller/compare/7.11.0...7.11.1) (2022-01-06)


### Bug Fixes

* make d100 icon consistent with others (close [#66](https://github.com/valentine195/obsidian-dice-roller/issues/66)) ([4a0c987](https://github.com/valentine195/obsidian-dice-roller/commit/4a0c987426a9649a9f845a35a36a4c904197cec8))

## [7.11.0](https://github.com/valentine195/obsidian-dice-roller/compare/7.10.2...7.11.0) (2021-12-26)


### Features

* `dice-mod` is now allowed on all roller types ([543eb63](https://github.com/valentine195/obsidian-dice-roller/commit/543eb631fe98fe2f829259c60e7b7432c505e130))


### Bug Fixes

* random renderer plugin error ([ed28efc](https://github.com/valentine195/obsidian-dice-roller/commit/ed28efc0bf15569118843af0440fb99ec54231f7))

### [7.10.2](https://github.com/valentine195/obsidian-dice-roller/compare/7.10.1...7.10.2) (2021-12-21)


### Bug Fixes

* rendering improvements ([12824a6](https://github.com/valentine195/obsidian-dice-roller/commit/12824a6517751cc4562745f6676cb8a3f3ebde7d))
* significantly softened spotlight on renderer ([b2b149b](https://github.com/valentine195/obsidian-dice-roller/commit/b2b149bd9dcc2c5de3fa6b158082d0f4a0586384))

### [7.10.1](https://github.com/valentine195/obsidian-dice-roller/compare/7.10.0...7.10.1) (2021-12-10)


### Bug Fixes

* api update ([e65f3eb](https://github.com/valentine195/obsidian-dice-roller/commit/e65f3eba894f4192200f23ba7b2670bf7d8eb2dd))

## [7.10.0](https://github.com/valentine195/obsidian-dice-roller/compare/7.9.0...7.10.0) (2021-12-10)


### Features

* added ability to roll heading types (closes [#60](https://github.com/valentine195/obsidian-dice-roller/issues/60)) ([7dd1bd3](https://github.com/valentine195/obsidian-dice-roller/commit/7dd1bd3add152888126315da85b9cb82aa7960e4))


### Bug Fixes

* update typings ([fcf3f1f](https://github.com/valentine195/obsidian-dice-roller/commit/fcf3f1f3caacd3643d88267076e171add42b9ce2))

## [7.9.0](https://github.com/valentine195/obsidian-dice-roller/compare/7.8.6...7.9.0) (2021-12-09)


### Features

* added ability to roll heading types (closes [#60](https://github.com/valentine195/obsidian-dice-roller/issues/60)) ([937a418](https://github.com/valentine195/obsidian-dice-roller/commit/937a4186d09bdc5ee86c420469228217b9756a52))

### [7.8.6](https://github.com/valentine195/obsidian-dice-roller/compare/7.8.5...7.8.6) (2021-12-02)


### Bug Fixes

* third-party api update ([fc80c07](https://github.com/valentine195/obsidian-dice-roller/commit/fc80c07d5e2fd2a3b688cd7ff13b463a8217c8cf))

### [7.8.5](https://github.com/valentine195/obsidian-dice-roller/compare/7.8.4...7.8.5) (2021-11-25)


### Bug Fixes

* fixed dataview inline tag greediness ([65bf26c](https://github.com/valentine195/obsidian-dice-roller/commit/65bf26c5f68d77e651399321d10102d56caf12a4))
* wait for dataview to be ready for tag rolling ([f0e0594](https://github.com/valentine195/obsidian-dice-roller/commit/f0e0594e3ea3dc1a7d43fea001ffa134244457e4))

### [7.8.4](https://github.com/valentine195/obsidian-dice-roller/compare/7.8.3...7.8.4) (2021-11-24)


### Bug Fixes

* improved dataview field functionality ([7cec730](https://github.com/valentine195/obsidian-dice-roller/commit/7cec7305100498c32169e5121785b6c46f68de59))

### [7.8.3](https://github.com/valentine195/obsidian-dice-roller/compare/7.8.2...7.8.3) (2021-11-23)


### Bug Fixes

* removed logs ([f3110a5](https://github.com/valentine195/obsidian-dice-roller/commit/f3110a535042b6e636fa6d82fb372ae4c1c93146))

### [7.8.2](https://github.com/valentine195/obsidian-dice-roller/compare/7.8.1...7.8.2) (2021-11-23)


### Bug Fixes

* another fix for dataview lex ([f441ba0](https://github.com/valentine195/obsidian-dice-roller/commit/f441ba086b590fa3357f6efcbba69978bb774952))

### [7.8.1](https://github.com/valentine195/obsidian-dice-roller/compare/7.8.0...7.8.1) (2021-11-23)


### Bug Fixes

* fixed issue where dataview inline field lex was too greedy ([3589a3f](https://github.com/valentine195/obsidian-dice-roller/commit/3589a3fde1a7262c383421a5ce2a5969d141dea8))

## [7.8.0](https://github.com/valentine195/obsidian-dice-roller/compare/7.7.0...7.8.0) (2021-11-23)


### Features

* Added basic Dataview inline field support ([f075fe9](https://github.com/valentine195/obsidian-dice-roller/commit/f075fe9c6e9f6254eba2a9ea3b90aba51057ff7e))

## [7.7.0](https://github.com/valentine195/obsidian-dice-roller/compare/7.6.0...7.7.0) (2021-11-23)


### Features

* added ability to not display formula using dice-mod ([5605aaa](https://github.com/valentine195/obsidian-dice-roller/commit/5605aaa0e37341541ef6eb60d6e595ce3d172531))

## [7.6.0](https://github.com/valentine195/obsidian-dice-roller/compare/7.5.1...7.6.0) (2021-11-23)


### Features

* added new `Line` roller (see the ReadMe for more info) ([4169790](https://github.com/valentine195/obsidian-dice-roller/commit/41697903f4e50ba882b3e870460f773046db4832))

### [7.5.1](https://github.com/valentine195/obsidian-dice-roller/compare/7.5.0...7.5.1) (2021-11-22)


### Bug Fixes

* added ability to override show dice setting in api ([5851750](https://github.com/valentine195/obsidian-dice-roller/commit/5851750d49d759341f569bf3481f300264a2cda3))

## [7.5.0](https://github.com/valentine195/obsidian-dice-roller/compare/7.4.2...7.5.0) (2021-11-22)


### Features

* table rollers now render results as markdown, allowing nested dice rollers in tables ([de42c17](https://github.com/valentine195/obsidian-dice-roller/commit/de42c17d2a780cb86986571419d13d905487d66c))


### Bug Fixes

* fixed line weight css issue on view buttons ([d31ce9f](https://github.com/valentine195/obsidian-dice-roller/commit/d31ce9fdbc89cbc3d911ffe01d89e382552624bf))

### [7.4.2](https://github.com/valentine195/obsidian-dice-roller/compare/7.4.1...7.4.2) (2021-11-18)


### Bug Fixes

* removed extra space when there is no icon ([5c3be4a](https://github.com/valentine195/obsidian-dice-roller/commit/5c3be4a4e88b8534565d4794fb5b4ee35d98c70b))

### [7.4.1](https://github.com/valentine195/obsidian-dice-roller/compare/7.4.0...7.4.1) (2021-11-18)


### Bug Fixes

* fixed escaped pipes ([75475e1](https://github.com/valentine195/obsidian-dice-roller/commit/75475e1cba62f7bb49f17d24bfc42d00788204f8))

## [7.4.0](https://github.com/valentine195/obsidian-dice-roller/compare/7.3.0...7.4.0) (2021-11-18)


### Features

* added `|nodice` parameter ([30547c6](https://github.com/valentine195/obsidian-dice-roller/commit/30547c6337be4374c215950d5d488c085e427f1a)), closes [#54](https://github.com/valentine195/obsidian-dice-roller/issues/54)
* added reroll button to dice view results ([4427eac](https://github.com/valentine195/obsidian-dice-roller/commit/4427eac37bf961889b9fe261bb864f271f5dfb87))
* added saved custom formulas into dice view (close [#47](https://github.com/valentine195/obsidian-dice-roller/issues/47)) ([6d78675](https://github.com/valentine195/obsidian-dice-roller/commit/6d786758c0941a26e7b35989023610b69f7662d9))
* dice without graphics are now just rolled, no longer roll a d20 ([1ba8778](https://github.com/valentine195/obsidian-dice-roller/commit/1ba8778a92807be962bd78ea3084ab75cb7081d9))


### Bug Fixes

* unicode characters are decoded when returning a lookup result (close [#55](https://github.com/valentine195/obsidian-dice-roller/issues/55)) ([1be1bd4](https://github.com/valentine195/obsidian-dice-roller/commit/1be1bd484e2ab208232da1d196544b04d160dc4f))

## [7.3.0](https://github.com/valentine195/obsidian-dice-roller/compare/7.2.2...7.3.0) (2021-11-17)


### Features

* added "reroll all dice" command to reroll all dice in note ([b87577f](https://github.com/valentine195/obsidian-dice-roller/commit/b87577fc93e9e1127f281c1b8629e342cdc561d0))

### [7.2.2](https://github.com/valentine195/obsidian-dice-roller/compare/7.2.1...7.2.2) (2021-11-16)


### Bug Fixes

* lookup tables now work with multiple rollers in a cell ([f0abb51](https://github.com/valentine195/obsidian-dice-roller/commit/f0abb5196b65a1b2272bd295fd620b55045c5055))

### [7.2.1](https://github.com/valentine195/obsidian-dice-roller/compare/7.2.0...7.2.1) (2021-11-16)


### Bug Fixes

* version merge ([d859040](https://github.com/valentine195/obsidian-dice-roller/commit/d8590404ce5ee49b8f4a1707b0493578cadbf62c))

### [7.1.5](https://github.com/valentine195/obsidian-dice-roller/compare/7.1.4...7.1.5) (2021-11-05)


### Bug Fixes

* several bugs related to renderer calculation ([928f431](https://github.com/valentine195/obsidian-dice-roller/commit/928f431df138f9fe477fb55ffa546cb4fe6b24bc))

### [7.1.4](https://github.com/valentine195/obsidian-dice-roller/compare/7.1.3...7.1.4) (2021-10-18)

## [7.2.0](https://github.com/valentine195/obsidian-dice-roller/compare/7.1.3...7.2.0) (2021-11-16)


### Features

* added setting to turn off lookup table roll ([8514fbc](https://github.com/valentine195/obsidian-dice-roller/commit/8514fbc70e325e458151d64f9777b62e3bfadca7))
## [7.1.5](https://github.com/valentine195/obsidian-dice-roller/compare/7.1.4...7.1.5) (2021-11-05)


### Bug Fixes

* several bugs related to renderer calculation ([928f431](https://github.com/valentine195/obsidian-dice-roller/commit/928f431df138f9fe477fb55ffa546cb4fe6b24bc))
