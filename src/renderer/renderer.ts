import { Component, Events, debounce } from "obsidian";

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
} from "./geometries";

import {
    DiceShape,
    D10Dice,
    D4Dice,
    D6Dice,
    D8Dice,
    D12Dice,
    D20Dice
} from "./shapes";

import {
    Body,
    ContactMaterial,
    Material,
    NaiveBroadphase,
    Plane,
    Vec3,
    World
} from "cannon-es";
import {
    AmbientLight,
    BufferGeometry,
    DirectionalLight,
    Mesh,
    Object3D,
    PCFSoftShadowMap,
    PerspectiveCamera,
    PlaneGeometry,
    Scene,
    ShadowMaterial,
    SpotLight,
    Material as ThreeMaterial,
    Vector3,
    WebGLRenderer
} from "three";
import { ResourceTracker } from "./resource";

export type RendererData = {
    diceColor: string;
    textColor: string;
    colorfulDice: boolean;
    scaler: number;
    renderTime: number;
};

export default class DiceRenderer extends Component {
    event = new Events();
    tracker = new ResourceTracker();
    renderer: WebGLRenderer;
    scene: Scene;
    world: LocalWorld;
    camera: PerspectiveCamera;

    container: HTMLElement = createDiv("renderer-container");

    #current: Set<DiceShape[]> = new Set();
    directionalLight: DirectionalLight;
    ambientLight: AmbientLight;

    animation: number;

    light: SpotLight;
    shadows: boolean = true;
    desk: any;
    iterations: number = 0;

    frame_rate = 1 / 60;
    stack: StackRoller;
    loaded = false;

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

    #animating = false;
    setData(data: RendererData) {
        this.data = data;
        this.factory.width = this.WIDTH;
        this.factory.height = this.HEIGHT;
        this.factory.updateDice();
    }
    constructor(public data: RendererData) {
        super();
        this.renderer = new WebGLRenderer({
            alpha: true,
            antialias: true
        });
    }
    getDiceForRoller(roller: DiceRoller): DiceShape[] {
        return this.factory.getDiceForRoller(roller, this.getVector());
    }
    /**
     * Adding dice should start the rendering process immediately.
     * The renderer should unload itself after all dice have finished rendering.
     */
    #finished: WeakMap<DiceShape[], () => void> = new WeakMap();
    async addDice(dice: DiceShape[]): Promise<void> {
        return new Promise((resolve) => {
            if (!this.#animating) {
                this.start();
            }
            for (const shape of dice) {
                shape.recreate(this.getVector(), this.WIDTH, this.HEIGHT);
                this.scene.add(this.tracker.track(shape.geometry));
                this.world.add(shape);
            }
            this.#current.add(dice);
            this.#finished.set(dice, () => {
                resolve();
            });
        });
    }
    factory = new DiceFactory(this.WIDTH, this.HEIGHT, {
        diceColor: this.data.diceColor,
        textColor: this.data.textColor,
        colorfulDice: this.data.colorfulDice,
        scaler: this.data.scaler
    });

    onload() {
        this.loaded = true;
        this.addChild(this.factory);

        this.container.empty();
        this.container.style.opacity = `1`;
        this.renderer.shadowMap.enabled = this.shadows;
        this.renderer.shadowMap.type = PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);
        document.body.appendChild(this.container);

        this.renderer.setClearColor(0x000000, 0);

        this.scene = new Scene();

        this.initScene();
        this.initWorld();

        this.registerDomEvent(window, "resize", () => {
            this.initScene();
        });
    }

    onunload() {
        this.stop();
        this.loaded = false;
        cancelAnimationFrame(this.animation);

        this.container.detach();
        this.container.empty();
        this.renderer.domElement.detach();
        this.factory.dispose();
        this.renderer.renderLists.dispose();
        this.renderer.dispose();

        this.tracker.dispose();

        [...this.#current.values()].flat().forEach((dice) => {
            this.world.world.removeBody(dice.body);
        });
        this.#current = new Set();

        //causes white flash?
        //this.renderer.forceContextLoss();
    }

    start() {
        if (this.#animating) {
            this.unload();
        }
        if (!this.loaded) {
            this.load();
        }
        this.#animating = true;
        this.extraFrames = DiceRenderer.DEFAULT_EXTRA_FRAMES;
        this.render();
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

        this.factory.updateDice();

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
        this.scene.add(this.tracker.track(this.light));

        this.ambientLight = new AmbientLight(0xffffff, 0.9);
        this.scene.add(this.tracker.track(this.ambientLight));
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
        this.scene.add(this.tracker.track(this.desk));
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

    finishRender() {
        this.event.trigger("throw-finished");
    }
    #positions: WeakMap<DiceShape, Vec3> = new WeakMap();
    static Threshold = 5;
    throwFinished() {
        let res = true;
        for (const shapes of this.#current) {
            let finished = true;
            for (const dice of shapes) {
                if (dice.iterations > 10 / this.frame_rate) {
                    dice.stopped = true;
                }
                if (dice.stopped === true) continue;
                const a = dice.body.angularVelocity;
                const v = dice.body.velocity;
                if (
                    Math.abs(a.length()) < DiceRenderer.Threshold &&
                    Math.abs(v.length()) < DiceRenderer.Threshold
                ) {
                    if (this.iterations - dice.iterations > 5) {
                        dice.stopped = true;
                        continue;
                    }
                    finished = false;
                    res = false;
                } else {
                    dice.iterations++;
                    dice.stopped = false;
                    finished = false;
                    res = false;
                }
            }
            if (finished && this.#finished.has(shapes)) {
                this.#finished.get(shapes)();
                this.#finished.delete(shapes);
            }
        }
        return res;
    }
    extraFrames = DiceRenderer.DEFAULT_EXTRA_FRAMES;
    unrender() {
        this.container.style.opacity = `0`;
        cancelAnimationFrame(this.animation);
        this.registerInterval(
            window.setTimeout(() => {
                this.stop();
            }, 1000)
        );
    }
    stop() {
        if (this.#animating) {
            for (const dice of [...this.#current].flat()) {
                dice.stopped = true;
            }
        }
        this.#animating = false;
        this.unload();
    }
    resizeRendererToDisplaySize() {
        const canvas = this.renderer.domElement;
        const pixelRatio = window.devicePixelRatio;
        const width = (canvas.clientWidth * pixelRatio) | 0;
        const height = (canvas.clientHeight * pixelRatio) | 0;
        const needResize = canvas.width !== width || canvas.height !== height;
        if (needResize) {
            this.renderer.setSize(width, height, false);
        }
        return needResize;
    }
    render() {
        if (this.throwFinished()) {
            if (this.extraFrames > 10) {
                this.extraFrames--;
            } else {
                try {
                    if (!this.data.renderTime) {
                        const renderer = this;
                        function unrender() {
                            renderer.unload();
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
                                this.data.renderTime
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

        if (this.resizeRendererToDisplaySize()) {
            this.camera.aspect =
                this.canvasEl.clientWidth / this.canvasEl.clientHeight;
            this.camera.updateProjectionMatrix();
        }

        this.world.step(this.frame_rate);
        this.iterations++;
        [...this.#current.values()].forEach((g) => g.forEach((d) => d.set()));

        this.renderer.render(this.scene, this.camera);
    }
    getVector() {
        return {
            x: (Math.random() * 2 - 1) * this.WIDTH,
            y: -(Math.random() * 2 - 1) * this.HEIGHT
        };
    }
    dispose(...children: Object3D[]) {
        children.forEach((child) => {
            if (child.children) this.dispose(...child.children);

            child.clear();
        });
    }
}

class LocalWorld {
    add(...dice: DiceShape[]) {
        dice.forEach((die) => {
            this.world.addBody(die.body);
        });
    }
    remove(...dice: DiceShape[]) {
        dice.forEach((die) => this.world.removeBody(die.body));
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
    world = new World({ gravity: new Vec3(0, 0, -9.82 * 200) });
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
        const diceColor = this.options.diceColor;
        const textColor = this.options.textColor;

        // If we want colorful dice then just use the default colors in the geometry
        if (this.options.colorfulDice) {
            return undefined;
        }

        return {
            diceColor,
            textColor
        };
    }
    constructor(
        public width: number,
        public height: number,
        public options: {
            diceColor: string;
            textColor: string;
            scaler: number;
            colorfulDice: boolean;
        }
    ) {
        super();
        this.buildDice();
    }
    updateDice = debounce(() => {
        this.dispose();
        this.buildDice();
    }, 200);
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
                    new D4Dice(
                        this.width,
                        this.height,
                        this.clone("d4"),
                        vector
                    )
                );
                break;
            }
            case 1:
            case 6: {
                dice.push(
                    new D6Dice(
                        this.width,
                        this.height,
                        roller.fudge ? this.clone("fudge") : this.clone("d6"),
                        vector
                    )
                );
                break;
            }
            case 8: {
                dice.push(
                    new D8Dice(
                        this.width,
                        this.height,
                        this.clone("d8"),
                        vector
                    )
                );
                break;
            }
            case 10: {
                dice.push(
                    new D10Dice(
                        this.width,
                        this.height,
                        this.clone("d10"),
                        vector
                    )
                );
                break;
            }
            case 12: {
                dice.push(
                    new D12Dice(
                        this.width,
                        this.height,
                        this.clone("d12"),
                        vector
                    )
                );
                break;
            }
            case 20: {
                dice.push(
                    new D20Dice(
                        this.width,
                        this.height,
                        this.clone("d20"),
                        vector
                    )
                );
                break;
            }
            case 100: {
                dice.push(
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
                );
                break;
            }
        }
        return dice;
    }
    cloneDice(dice: DiceShape, vector: { x: number; y: number }): DiceShape[] {
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
        const map: Map<DiceRoller, DiceShape[]> = new Map();

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
            this.colors,
            this.options.scaler
        ).create();
        this.dice.d20 = new D20DiceGeometry(
            this.width,
            this.height,
            this.colors,
            this.options.scaler
        ).create();
        this.dice.d12 = new D12DiceGeometry(
            this.width,
            this.height,
            this.colors,
            this.options.scaler
        ).create();
        this.dice.d10 = new D10DiceGeometry(
            this.width,
            this.height,
            this.colors,
            this.options.scaler
        ).create();
        this.dice.d8 = new D8DiceGeometry(
            this.width,
            this.height,
            this.colors,
            this.options.scaler
        ).create();
        this.dice.d6 = new D6DiceGeometry(
            this.width,
            this.height,
            this.colors,
            this.options.scaler
        ).create();
        this.dice.d4 = new D4DiceGeometry(
            this.width,
            this.height,
            this.colors,
            this.options.scaler
        ).create();
        this.dice.fudge = new FudgeDiceGeometry(
            this.width,
            this.height,
            this.colors,
            this.options.scaler
        ).create();
        this.dice.boost = new GenesysBoostDiceGeometry(
            this.width,
            this.height,
            this.colors,
            this.options.scaler
        ).create();
        this.dice.ability = new GenesysAbilityDiceGeometry(
            this.width,
            this.height,
            this.colors,
            this.options.scaler
        ).create();
        this.dice.difficulty = new GenesysDifficultyDiceGeometry(
            this.width,
            this.height,
            this.colors,
            this.options.scaler
        ).create();
        this.dice.challenge = new GenesysChallengeDiceGeometry(
            this.width,
            this.height,
            this.colors,
            this.options.scaler
        ).create();
        this.dice.proficiency = new GenesysProficiencyDiceGeometry(
            this.width,
            this.height,
            this.colors,
            this.options.scaler
        ).create();
        this.dice.setback = new GenesysSetbackDiceGeometry(
            this.width,
            this.height,
            this.colors,
            this.options.scaler
        ).create();
    }
}
