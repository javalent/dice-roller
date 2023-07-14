import { Component, Events } from "obsidian";

import { DiceRoller, StackRoller } from "src/roller";
import DiceGeometry, {
    D100DiceGeometry,
    D10DiceGeometry,
    D12DiceGeometry,
    D20DiceGeometry,
    D4DiceGeometry,
    D6DiceGeometry,
    D8DiceGeometry,
    FudgeDiceGeometry,
    GenesysAbilityDiceGeometry,
    GenesysBoostDiceGeometry,
    GenesysChallengeDiceGeometry,
    GenesysDifficultyDiceGeometry,
    GenesysProficiencyDiceGeometry,
    GenesysSetbackDiceGeometry
} from "./renderer/geometries";
import DiceRollerPlugin from "src/main";
import {
    Dice,
    D10Dice,
    D4Dice,
    D6Dice,
    D8Dice,
    D12Dice,
    D20Dice
} from "./renderer/shapes";

/* import {
    WebGLRenderer,
    Scene,
    PerspectiveCamera,
    DirectionalLight,
    AmbientLight,
    SpotLight,
    PCFSoftShadowMap,
    Vector3,
    ShadowMaterial,
    Mesh,
    PlaneGeometry
} from "three"; */
import {
    Body,
    ContactMaterial,
    Material,
    NaiveBroadphase,
    Plane,
    Vec3,
    World
} from "cannon-es";
import { WebGLRenderer } from "three/src/renderers/WebGLRenderer";
import { Scene } from "three/src/scenes/Scene";
import { PerspectiveCamera } from "three/src/cameras/PerspectiveCamera";
import { DirectionalLight } from "three/src/lights/DirectionalLight";
import { AmbientLight } from "three/src/lights/AmbientLight";
import { SpotLight } from "three/src/lights/SpotLight";
import { PCFSoftShadowMap } from "three/src/constants";
import { Vector3 } from "three/src/math/Vector3";
import { ShadowMaterial } from "three/src/materials/ShadowMaterial";
import { Mesh } from "three/src/objects/Mesh";
import { PlaneGeometry } from "three/src/geometries/PlaneGeometry";

export default class DiceRenderer extends Component {
    event = new Events();

    renderer: WebGLRenderer;
    scene: Scene;
    world: LocalWorld;
    camera: PerspectiveCamera;

    container: HTMLElement = createDiv("renderer-container");

    current: Map<DiceRoller, Dice[]>;
    directionalLight: DirectionalLight;
    ambientLight: AmbientLight;

    animation: number;

    light: SpotLight;
    shadows: boolean = true;
    desk: any;
    iterations: number = 0;

    frame_rate = 1 / 60;
    stack: StackRoller;

    get WIDTH() {
        return this.container.clientWidth / 2;
    }
    get HEIGHT() {
        return this.container.clientHeight / 2;
    }
    get ASPECT() {
        return this.WIDTH / this.HEIGHT;
    }
    get scale() {
        return (this.WIDTH * this.WIDTH + this.HEIGHT * this.HEIGHT) / 13;
    }
    get canvasEl() {
        if (!this.renderer) return null;
        return this.renderer.domElement;
    }

    animating = false;

    constructor(public plugin: DiceRollerPlugin) {
        super();
        this.renderer = new WebGLRenderer({
            alpha: true,
            antialias: true
        });
    }

    setDice(stack: StackRoller) {
        if (this.animating) {
            this.unload();
            this.load();
        }
        this.stack = stack;
        this.current = this.factory.getDice(this.stack, {
            x: (Math.random() * 2 - 1) * this.WIDTH,
            y: -(Math.random() * 2 - 1) * this.HEIGHT
        });
        this.scene.add(
            ...[...this.current.values()].flat().map((d) => d.geometry)
        );
        this.world.add(...[...this.current.values()].flat());
    }
    factory = new DiceFactory(this.WIDTH, this.HEIGHT, this.plugin);
    onload() {
        this.addChild(this.factory);

        this.container.empty();
        this.container.style.opacity = `1`;
        document.body.appendChild(this.container);

        this.renderer.shadowMap.enabled = this.shadows;
        this.renderer.shadowMap.type = PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);
        this.renderer.setClearColor(0x000000, 0);

        this.scene = new Scene();

        this.initScene();

        this.registerDomEvent(window, "resize", () => {
            this.initScene();
        });

        this.initWorld();
    }

    async start(): Promise<StackRoller> {
        return new Promise(async (resolve, reject) => {
            if (!this.current.size) reject();
            this.event.on("throw-finished", (result) => {
                resolve(result);
            });
            this.event.on("error", (e) => {
                reject(e);
            });
            this.animating = true;
            this.extraFrames = DiceRenderer.DEFAULT_EXTRA_FRAMES;
            this.render();
        });
    }
    static DEFAULT_EXTRA_FRAMES = 30;
    enableShadows() {
        this.shadows = true;
        if (this.renderer) this.renderer.shadowMap.enabled = this.shadows;
        if (this.light) this.light.castShadow = this.shadows;
        if (this.desk) this.desk.receiveShadow = this.shadows;
    }
    disableShadows() {
        this.shadows = false;
        if (this.renderer) this.renderer.shadowMap.enabled = this.shadows;
        if (this.light) this.light.castShadow = this.shadows;
        if (this.desk) this.desk.receiveShadow = this.shadows;
    }
    colors = {
        ambient: 0xffffff,
        spotlight: 0xffffff
    };

    get mw() {
        return Math.max(this.WIDTH, this.HEIGHT);
    }
    display: { [key: string]: number } = {
        currentWidth: null,
        currentHeight: null,
        containerWidth: null,
        containerHeight: null,
        aspect: null,
        scale: null
    };
    cameraHeight: { [key: string]: number } = {
        max: null,
        close: null,
        medium: null,
        far: null
    };
    setDimensions(dimensions?: { w: number; h: number }) {
        this.display.currentWidth = this.container.clientWidth / 2;
        this.display.currentHeight = this.container.clientHeight / 2;
        if (dimensions) {
            this.display.containerWidth = dimensions.w;
            this.display.containerHeight = dimensions.h;
        } else {
            this.display.containerWidth = this.display.currentWidth;
            this.display.containerHeight = this.display.currentHeight;
        }
        this.display.aspect = Math.min(
            this.display.currentWidth / this.display.containerWidth,
            this.display.currentHeight / this.display.containerHeight
        );
        this.display.scale =
            Math.sqrt(
                this.display.containerWidth * this.display.containerWidth +
                    this.display.containerHeight * this.display.containerHeight
            ) / 13;

        this.renderer.setSize(
            this.display.currentWidth * 2,
            this.display.currentHeight * 2
        );

        this.cameraHeight.max =
            this.display.currentHeight /
            this.display.aspect /
            Math.tan((10 * Math.PI) / 180);

        this.factory.width = this.display.currentWidth;
        this.factory.height = this.display.currentHeight;

        this.cameraHeight.medium = this.cameraHeight.max / 1.5;
        this.cameraHeight.far = this.cameraHeight.max;
        this.cameraHeight.close = this.cameraHeight.max / 2;
    }

    initCamera() {
        if (this.camera) this.scene.remove(this.camera);
        this.camera = new PerspectiveCamera(
            20,
            this.display.currentWidth / this.display.currentHeight,
            1,
            this.cameraHeight.max * 1.3
        );

        this.camera.position.z = this.cameraHeight.far;

        this.camera.lookAt(new Vector3(0, 0, 0));
    }
    initLighting() {
        const maxwidth = Math.max(
            this.display.containerWidth,
            this.display.containerHeight
        );

        if (this.light) this.scene.remove(this.light);
        if (this.ambientLight) this.scene.remove(this.ambientLight);
        this.light = new SpotLight(this.colors.spotlight, 0.25);
        this.light.position.set(-maxwidth / 2, maxwidth / 2, maxwidth * 3);
        this.light.target.position.set(0, 0, 0);
        this.light.distance = maxwidth * 5;
        this.light.angle = Math.PI / 4;
        this.light.castShadow = this.shadows;
        this.light.shadow.camera.near = maxwidth / 10;
        this.light.shadow.camera.far = maxwidth * 5;
        this.light.shadow.camera.fov = 50;
        this.light.shadow.bias = 0.001;
        this.light.shadow.mapSize.width = 1024;
        this.light.shadow.mapSize.height = 1024;
        this.scene.add(this.light);

        this.ambientLight = new AmbientLight(0xffffff, 0.9);
        this.scene.add(this.ambientLight);
    }
    initDesk() {
        if (this.desk) this.scene.remove(this.desk);
        let shadowplane = new ShadowMaterial();
        shadowplane.opacity = 0.5;
        this.desk = new Mesh(
            new PlaneGeometry(
                this.display.containerWidth * 6,
                this.display.containerHeight * 6,
                1,
                1
            ),
            shadowplane
        );
        this.desk.receiveShadow = this.shadows;
        this.scene.add(this.desk);
    }
    initScene() {
        this.setDimensions();
        this.initCamera();
        this.initLighting();
        this.initDesk();

        this.camera.updateProjectionMatrix();

        this.renderer.render(this.scene, this.camera);
    }
    initWorld() {
        this.world = new LocalWorld(this.WIDTH, this.HEIGHT);
        this.iterations = 0;
    }
    getResultsForRoller(roller: DiceRoller) {
        const diceArray = this.current.get(roller);

        //todo remove double loop
        const percentile = diceArray.filter(
            (d) => d instanceof D10Dice && d.isPercentile
        );
        const chunked: Array<[Dice, Dice]> = [];
        for (let i = 0; i < percentile.length; i += 2) {
            chunked.push(percentile.slice(i, i + 2) as [Dice, Dice]);
        }
        /* possibly... need to test
        const resultsArr = [];
        for (let i = 0; i < diceArray.length; i++) {
            const dice = diceArray[i];
            if (dice instanceof D10Dice && dice.isPercentile) {
                let tens = dice.getUpsideValue();
                let onesDice;
                const next = diceArray[i + 1];
                if (next && next instanceof D10Dice && next.isPercentile) {
                    onesDice = next;
                    i++;
                }
                if (!onesDice) resultsArr.push(tens);
                let ones = onesDice.getUpsideValue();

                if (tens === 10 && ones == 10) {
                    resultsArr.push(100);
                } else {
                    if (ones == 10) ones = 0;
                    if (tens == 10) tens = 0;
                    resultsArr.push(tens * 10 + ones);
                }
            } else {
                resultsArr.push(dice.getUpsideValue());
            }
        } */

        let results = [
            ...diceArray
                .filter((d) => !(d instanceof D10Dice && d.isPercentile))
                .map((dice) => {
                    return dice.getUpsideValue();
                })
                .filter((r) => r),
            ...chunked
                .map(([tensDice, onesDice]) => {
                    let tens = tensDice.getUpsideValue();
                    if (!onesDice) return tens;
                    let ones = onesDice.getUpsideValue();

                    if (tens === 10 && ones == 10) {
                        return 100;
                    } else {
                        if (ones == 10) ones = 0;
                        if (tens == 10) tens = 0;
                        return tens * 10 + ones;
                    }
                })
                .filter((r) => r)
        ];
        return results;
    }
    returnResult() {
        for (const roller of this.stack.dynamic) {
            if (!this.current.has(roller)) {
                continue;
            }

            let results = this.getResultsForRoller(roller);
            if (!results) continue;

            roller.setResults(results);
        }
        this.event.trigger("throw-finished", this.stack);
    }
    extraFrames = DiceRenderer.DEFAULT_EXTRA_FRAMES;
    unrender(plugin = this) {
        plugin.container.style.opacity = `0`;
        plugin.registerInterval(
            window.setTimeout(() => {
                plugin.animating = false;
                plugin.unload();
            }, 1000)
        );
    }
    render() {
        if (this.throwFinished()) {
            if (this.extraFrames > 10) {
                this.extraFrames--;
            } else {
                try {
                    for (const [roller, dice] of this.current) {
                        if (!roller.modifiers.size) continue;

                        let results = this.getResultsForRoller(roller);
                        if (!results) continue;
                        let shouldRerender = false;
                        if (
                            roller.modifiers.has("!") ||
                            roller.modifiers.has("!!")
                        ) {
                            const modifier = roller.modifiers.has("!")
                                ? "!"
                                : "!!";
                            //check explode
                            const explode = dice.filter((d) => {
                                if (
                                    !roller.modifiers.get(modifier).conditionals
                                        .length
                                ) {
                                    roller.modifiers
                                        .get(modifier)
                                        .conditionals.push({
                                            operator: "=",
                                            comparer: roller.faces.max,
                                            value: "",
                                            lexemes: [
                                                {
                                                    value: `${roller.faces.max}`,
                                                    text: `${roller.faces.max}`,
                                                    type: "dice"
                                                }
                                            ]
                                        });
                                }
                                return (
                                    roller.checkCondition(
                                        d.result,
                                        roller.modifiers.get(modifier)
                                            .conditionals
                                    ) && !d.exploded
                                );
                            });
                            if (
                                explode.length &&
                                explode.length <=
                                    roller.modifiers.get(modifier)!.data
                            ) {
                                explode.forEach((dice) => {
                                    dice.exploded = true;
                                    const vector = {
                                        x: (Math.random() * 2 - 1) * this.WIDTH,
                                        y:
                                            -(Math.random() * 2 - 1) *
                                            this.HEIGHT
                                    };
                                    const newDice = this.factory.cloneDice(
                                        dice,
                                        vector
                                    );
                                    this.current.set(roller, [
                                        ...this.current.get(roller)!,
                                        ...newDice
                                    ]);
                                    this.world.add(...newDice);
                                    this.scene.add(
                                        ...newDice.map((d) => d.geometry)
                                    );
                                });
                                shouldRerender = true;
                            }
                        }

                        if (roller.modifiers.has("r")) {
                            //check reroll
                            if (
                                !roller.modifiers.get("r").conditionals.length
                            ) {
                                roller.modifiers.get("r").conditionals.push({
                                    operator: "=",
                                    comparer: roller.faces.min,
                                    value: "",
                                    lexemes: [
                                        {
                                            value: `${roller.faces.min}`,
                                            text: `${roller.faces.min}`,
                                            type: "dice"
                                        }
                                    ]
                                });
                            }
                            const reroll = dice.filter((d) => {
                                return (
                                    roller.checkCondition(
                                        d.result,
                                        roller.modifiers.get("r").conditionals
                                    ) &&
                                    d.rerolled < roller.modifiers.get("r")!.data
                                );
                            });
                            if (reroll.length) {
                                reroll.forEach((dice) => {
                                    dice.rerolled++;
                                    const vector = {
                                        x: (Math.random() * 2 - 1) * this.WIDTH,
                                        y:
                                            -(Math.random() * 2 - 1) *
                                            this.HEIGHT
                                    };
                                    dice.vector = dice.generateVector(vector);
                                    dice.create();
                                    dice.set();
                                    dice.stopped = false;
                                });
                                shouldRerender = true;
                            }
                        }
                        if (shouldRerender) {
                            this.animation = requestAnimationFrame(() =>
                                this.render()
                            );
                            return;
                        }
                    }

                    this.returnResult();
                    if (!this.plugin.data.renderTime) {
                        const plugin = this;
                        function unrender() {
                            plugin.unrender(plugin);
                            document.body.removeEventListener(
                                "click",
                                unrender
                            );
                        }
                        this.registerDomEvent(document.body, "click", unrender);
                    } else {
                        this.registerInterval(
                            window.setTimeout(
                                () => this.unrender(),
                                this.plugin.data.renderTime
                            )
                        );
                    }
                } catch (e) {
                    this.event.trigger("error", e);
                }

                return;
            }
        }
        this.animation = requestAnimationFrame(() => this.render());

        this.world.step(this.frame_rate);
        this.iterations++;
        this.current.forEach((dice) => {
            dice.map((d) => d.set());
        });

        this.renderer.render(this.scene, this.camera);
    }
    dispose(...children: any[]) {
        children.forEach((child) => {
            if ("dispose" in child) child.dispose();
            if (child.children) this.dispose(...child.children);
        });
    }
    detach() {}
    onunload() {
        cancelAnimationFrame(this.animation);

        this.container.detach();
        this.container.empty();
        this.renderer.domElement.detach();
        this.renderer.dispose();
        this.factory.dispose();

        this.ambientLight.dispose();
        this.light.dispose();

        this.scene.children.forEach((child) => this.dispose(child));

        this.scene.remove(
            this.scene,
            ...this.scene.children,
            ...[...this.current.values()].flat().map((d) => d.geometry)
        );

        this.current.forEach((arr) => {
            arr.forEach((dice) => {
                let materials = [
                    ...(Array.isArray(dice.geometry.material)
                        ? dice.geometry.material
                        : [dice.geometry.material])
                ];
                materials.forEach((material) => material && material.dispose());
                this.world.world.removeBody(dice.body);
            });
        });
        this.current = new Map();

        //causes white flash?
        //this.renderer.forceContextLoss();
    }

    onThrowFinished() {}

    throwFinished() {
        let res = true;
        const threshold = 4;
        if (this.iterations < 10 / this.frame_rate) {
            for (const diceArray of this.current.values()) {
                /* const dice = this.current[i]; */
                for (const dice of diceArray) {
                    if (dice.stopped === true) continue;
                    const a = dice.body.angularVelocity,
                        v = dice.body.velocity;

                    if (
                        Math.abs(a.x) < threshold &&
                        Math.abs(a.y) < threshold &&
                        Math.abs(a.z) < threshold &&
                        Math.abs(v.x) < threshold &&
                        Math.abs(v.y) < threshold &&
                        Math.abs(v.z) < threshold
                    ) {
                        if (dice.stopped) {
                            if (this.iterations - dice.stopped > 3) {
                                dice.stopped = true;
                                continue;
                            }
                        } else {
                            dice.stopped = this.iterations;
                        }
                        res = false;
                    } else {
                        dice.stopped = undefined;
                        res = false;
                    }
                }
            }
        }
        return res;
    }
}

class LocalWorld {
    add(...dice: Dice[]) {
        dice.forEach((die) => {
            this.world.addBody(die.body);
        });
    }
    lastCallTime: number;
    step(step: number = 1 / 60) {
        const time = performance.now() / 1000; // seconds
        if (!this.lastCallTime) {
            this.world.step(step);
        } else {
            const dt = time - this.lastCallTime;
            this.world.step(step, dt);
        }
        this.lastCallTime = time;
    }
    world = new World({ gravity: new Vec3(0, 0, -9.82 * 400) });
    ground = this.getPlane();
    constructor(public WIDTH: number, public HEIGHT: number) {
        this.world.broadphase = new NaiveBroadphase();
        this.world.allowSleep = true;
        this.ground.position.set(0, 0, 0);
        this.world.addBody(this.ground);
        this.buildWalls();
    }

    diceMaterial = new Material();
    deskMaterial = new Material();
    barrierMaterial = new Material();

    buildWalls() {
        this.world.addContactMaterial(
            new ContactMaterial(this.deskMaterial, this.diceMaterial, {
                friction: 0.01,
                restitution: 0.5,
                contactEquationRelaxation: 3,
                contactEquationStiffness: 1e8
            })
        );
        this.world.addContactMaterial(
            new ContactMaterial(this.barrierMaterial, this.diceMaterial, {
                friction: 0.01,
                restitution: 1,
                contactEquationRelaxation: 3,
                contactEquationStiffness: 1e8
            })
        );
        this.world.addContactMaterial(
            new ContactMaterial(this.diceMaterial, this.diceMaterial, {
                friction: 0.1,
                restitution: 0.5,
                contactEquationRelaxation: 3,
                contactEquationStiffness: 1e8
            })
        );
        this.world.addBody(
            new Body({
                allowSleep: false,
                mass: 0,
                shape: new Plane(),
                material: this.deskMaterial
            })
        );

        let barrier = new Body({
            allowSleep: false,
            mass: 0,
            shape: new Plane(),
            material: this.barrierMaterial
        });
        barrier.quaternion.setFromAxisAngle(new Vec3(1, 0, 0), Math.PI / 2);
        barrier.position.set(0, this.HEIGHT * 0.93, 0);
        this.world.addBody(barrier);

        barrier = new Body({
            allowSleep: false,
            mass: 0,
            shape: new Plane(),
            material: this.barrierMaterial
        });
        barrier.quaternion.setFromAxisAngle(new Vec3(1, 0, 0), -Math.PI / 2);
        barrier.position.set(0, -this.HEIGHT * 0.93, 0);
        this.world.addBody(barrier);

        barrier = new Body({
            allowSleep: false,
            mass: 0,
            shape: new Plane(),
            material: this.barrierMaterial
        });
        barrier.quaternion.setFromAxisAngle(new Vec3(0, 1, 0), -Math.PI / 2);
        barrier.position.set(this.WIDTH * 0.93, 0, 0);
        this.world.addBody(barrier);

        barrier = new Body({
            allowSleep: false,
            mass: 0,
            shape: new Plane(),
            material: this.barrierMaterial
        });
        barrier.quaternion.setFromAxisAngle(new Vec3(0, 1, 0), Math.PI / 2);
        barrier.position.set(-this.WIDTH * 0.93, 0, 0);
        this.world.addBody(barrier);
    }
    getPlane() {
        return new Body({
            type: Body.STATIC,
            shape: new Plane()
        });
    }
}

class DiceFactory extends Component {
    dice: Record<string, DiceGeometry> = {};
    get colors() {
        const diceColor = this.plugin.data.diceColor;
        const textColor = this.plugin.data.textColor;

        // If we want colorful dice then just use the default colors in the geometry
        if (this.plugin.data.colorfulDice) {
            return undefined
        }

        return {
            diceColor,
            textColor,
        }
    }
    constructor(
        public width: number,
        public height: number,
        public plugin: DiceRollerPlugin
    ) {
        super();
        this.buildDice();
    }
    updateColors() {
        this.dispose();
        this.buildDice();
    }
    onunload() {
        this.dispose();
    }
    disposeChildren(...children: any[]) {
        children.forEach((child) => {
            if ("dispose" in child) child.dispose();
            if (child.children) this.disposeChildren(...child.children);
        });
    }
    dispose() {
        for (const dice of Object.values(this.dice))
            this.disposeChildren(dice.geometry.children);
    }
    getDiceForRoller(roller: DiceRoller, vector: { x: number; y: number }) {
        const dice = [];
        switch (roller.faces.max) {
            case 4: {
                dice.push(
                    ...new Array(roller.rolls)
                        .fill(0)
                        .map(
                            (r) =>
                                new D4Dice(
                                    this.width,
                                    this.height,
                                    this.clone("d4"),
                                    vector
                                )
                        )
                );
                break;
            }
            case 1:
            case 6: {
                dice.push(
                    ...new Array(roller.rolls)
                        .fill(0)
                        .map(
                            (r) =>
                                new D6Dice(
                                    this.width,
                                    this.height,
                                    roller.fudge
                                        ? this.clone("fudge")
                                        : this.clone("d6"),
                                    vector
                                )
                        )
                );
                break;
            }
            case 8: {
                dice.push(
                    ...new Array(roller.rolls)
                        .fill(0)
                        .map(
                            (r) =>
                                new D8Dice(
                                    this.width,
                                    this.height,
                                    this.clone("d8"),
                                    vector
                                )
                        )
                );
                break;
            }
            case 10: {
                dice.push(
                    ...new Array(roller.rolls)
                        .fill(0)
                        .map(
                            (r) =>
                                new D10Dice(
                                    this.width,
                                    this.height,
                                    this.clone("d10"),
                                    vector
                                )
                        )
                );
                break;
            }
            case 12: {
                dice.push(
                    ...new Array(roller.rolls)
                        .fill(0)
                        .map(
                            (r) =>
                                new D12Dice(
                                    this.width,
                                    this.height,
                                    this.clone("d12"),
                                    vector
                                )
                        )
                );
                break;
            }
            case 20: {
                dice.push(
                    ...new Array(roller.rolls)
                        .fill(0)
                        .map(
                            (r) =>
                                new D20Dice(
                                    this.width,
                                    this.height,
                                    this.clone("d20"),
                                    vector
                                )
                        )
                );
                break;
            }
            case 100: {
                dice.push(
                    ...new Array(roller.rolls)
                        .fill(0)
                        .map((r) => [
                            new D10Dice(
                                this.width,
                                this.height,
                                this.clone("d100"),
                                vector,
                                true
                            ),
                            new D10Dice(
                                this.width,
                                this.height,
                                this.clone("d10"),
                                vector,
                                true
                            )
                        ])
                        .flat()
                );
                break;
            }
        }
        return dice;
    }
    cloneDice(dice: Dice, vector: { x: number; y: number }): Dice[] {
        switch (dice.sides) {
            case 4: {
                return [
                    new D4Dice(
                        this.width,
                        this.height,
                        this.clone("d4"),
                        vector
                    )
                ];
            }
            case 1: {
                return [
                    new D6Dice(
                        this.width,
                        this.height,
                        this.clone("fudge"),
                        vector
                    )
                ];
            }
            case 6: {
                return [
                    new D6Dice(
                        this.width,
                        this.height,
                        this.clone("d6"),
                        vector
                    )
                ];
            }
            case 8: {
                return [
                    new D8Dice(
                        this.width,
                        this.height,
                        this.clone("d8"),
                        vector
                    )
                ];
            }
            case 10: {
                return [
                    new D10Dice(
                        this.width,
                        this.height,
                        this.clone("d10"),
                        vector
                    )
                ];
            }
            case 12: {
                return [
                    new D12Dice(
                        this.width,
                        this.height,
                        this.clone("d12"),
                        vector
                    )
                ];
            }
            case 20: {
                return [
                    new D20Dice(
                        this.width,
                        this.height,
                        this.clone("d20"),
                        vector
                    )
                ];
            }
            case 100: {
                return [
                    new D10Dice(
                        this.width,
                        this.height,
                        this.clone("d100"),
                        vector,
                        true
                    ),
                    new D10Dice(
                        this.width,
                        this.height,
                        this.clone("d10"),
                        vector,
                        true
                    )
                ];
            }
        }
    }
    getDice(stack: StackRoller, vector: { x: number; y: number }) {
        const map: Map<DiceRoller, Dice[]> = new Map();

        for (const roller of stack.dynamic) {
            const dice = this.getDiceForRoller(roller, vector);
            if (dice.length) map.set(roller, dice);
        }
        return map;
    }
    clone(dice: string) {
        if (!(dice in this.dice)) {
            throw new Error("That dice type does not exist!");
        }
        return this.dice[dice].clone();
    }
    private buildDice() {
        this.dice.d100 = new D100DiceGeometry(
            this.width,
            this.height,
            this.colors
        ).create();
        this.dice.d20 = new D20DiceGeometry(
            this.width,
            this.height,
            this.colors
        ).create();
        this.dice.d12 = new D12DiceGeometry(
            this.width,
            this.height,
            this.colors
        ).create();
        this.dice.d10 = new D10DiceGeometry(
            this.width,
            this.height,
            this.colors
        ).create();
        this.dice.d8 = new D8DiceGeometry(
            this.width,
            this.height,
            this.colors
        ).create();
        this.dice.d6 = new D6DiceGeometry(
            this.width,
            this.height,
            this.colors
        ).create();
        this.dice.d4 = new D4DiceGeometry(
            this.width,
            this.height,
            this.colors
        ).create();
        this.dice.fudge = new FudgeDiceGeometry(
            this.width,
            this.height,
            this.colors
        ).create();
        this.dice.boost = new GenesysBoostDiceGeometry(
            this.width,
            this.height,
            this.colors
        ).create();
        this.dice.ability = new GenesysAbilityDiceGeometry(
            this.width,
            this.height,
            this.colors
        ).create();
        this.dice.difficulty = new GenesysDifficultyDiceGeometry(
            this.width,
            this.height,
            this.colors
        ).create();
        this.dice.challenge = new GenesysChallengeDiceGeometry(
            this.width,
            this.height,
            this.colors
        ).create();
        this.dice.proficiency = new GenesysProficiencyDiceGeometry(
            this.width,
            this.height,
            this.colors
        ).create();
        this.dice.setback = new GenesysSetbackDiceGeometry(
            this.width,
            this.height,
            this.colors
        ).create();
    }
}
