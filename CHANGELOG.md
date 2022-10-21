# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

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
