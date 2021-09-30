import { Component, Events } from "obsidian";
import * as THREE from "three";
import * as CANNON from "cannon-es";

import { OrbitControls } from "./orbit";
import { DiceRoller } from "src/roller";

type DiceSize = "d4" | "d6" | "d8" | "d10" | "d12" | "d20";

const FLOOR = 0;

export default class DiceRenderer extends Component {
    event = new Events();

    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    world: World;
    camera: THREE.PerspectiveCamera;
    container: HTMLElement = createDiv("renderer-container");
    cube: THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhongMaterial[]>;
    geometry: THREE.BufferGeometry;
    poly: THREE.PolyhedronGeometry;

    diceColor = "#202020";
    labelColor = "#aaaaaa";

    current: Dice[] = [];
    body: CANNON.ConvexPolyhedron;
    directionalLight: THREE.DirectionalLight;
    ambientLight: THREE.HemisphereLight;
    animation: number;
    sphereMesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshNormalMaterial>;
    sphereBody: CANNON.Body;
    light: THREE.SpotLight;
    controls: OrbitControls;
    shadows: boolean = true;
    desk: any;
    iterations: number = 0;

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

    constructor(public dice?: DiceRoller[]) {
        super();
    }

    setDice(dice: DiceRoller[]) {
        this.dice = dice;
    }

    onload() {
        this.container.empty();
        this.container.style.opacity = `1`;
        document.body.appendChild(this.container);

        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true
        });
        this.renderer.shadowMap.enabled = this.shadows;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);
        this.renderer.setClearColor(0x000000, 0);

        this.initScene();
        this.initWorld();
        this.initDice();
    }

    async start(): Promise<Array<[number, number[]]>> {
        return new Promise(async (resolve) => {
            this.event.on("throw-finished", (result) => {
                resolve(result);
            });
            this.render();
        });
    }
    initDice() {
        for (let dice of this.dice) {
            switch (dice.faces.max) {
                case 4: {
                    this.current.push(
                        ...new Array(dice.rolls)
                            .fill(0)
                            .map(
                                (r) =>
                                    new D4Dice(
                                        this.WIDTH,
                                        this.HEIGHT,
                                        dice.result
                                    )
                            )
                    );
                    break;
                }
                case 6: {
                    this.current.push(
                        ...new Array(dice.rolls)
                            .fill(0)
                            .map(
                                (r) =>
                                    new D6Dice(
                                        this.WIDTH,
                                        this.HEIGHT,
                                        dice.result
                                    )
                            )
                    );
                    break;
                }
                case 8: {
                    this.current.push(
                        ...new Array(dice.rolls)
                            .fill(0)
                            .map(
                                (r) =>
                                    new D8Dice(
                                        this.WIDTH,
                                        this.HEIGHT,
                                        dice.result
                                    )
                            )
                    );
                    break;
                }
                case 10: {
                    this.current.push(
                        ...new Array(dice.rolls)
                            .fill(0)
                            .map(
                                (r) =>
                                    new D10Dice(
                                        this.WIDTH,
                                        this.HEIGHT,
                                        dice.result
                                    )
                            )
                    );
                    break;
                }
                case 12: {
                    this.current.push(
                        ...new Array(dice.rolls)
                            .fill(0)
                            .map(
                                (r) =>
                                    new D12Dice(
                                        this.WIDTH,
                                        this.HEIGHT,
                                        dice.result
                                    )
                            )
                    );
                    break;
                }
                case 20:
                default: {
                    this.current.push(
                        ...new Array(dice.rolls)
                            .fill(0)
                            .map(
                                (r) =>
                                    new D20Dice(
                                        this.WIDTH,
                                        this.HEIGHT,
                                        dice.result
                                    )
                            )
                    );
                    break;
                }
            }
        }

        if (!this.current) {
            this.unload();
            return;
        }

        this.scene.add(...this.current.map((d) => d.geometry));
        this.world.add(...this.current);
    }

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

        this.cameraHeight.medium = this.cameraHeight.max / 1.5;
        this.cameraHeight.far = this.cameraHeight.max;
        this.cameraHeight.close = this.cameraHeight.max / 2;
    }
    initCamera() {
        if (this.camera) this.scene.remove(this.camera);
        this.camera = new THREE.PerspectiveCamera(
            20,
            this.display.currentWidth / this.display.currentHeight,
            1,
            this.cameraHeight.max * 1.3
        );

        this.camera.position.z = this.cameraHeight.far;

        this.camera.lookAt(new THREE.Vector3(0, 0, 0));
    }
    initLighting() {
        const maxwidth = Math.max(
            this.display.containerWidth,
            this.display.containerHeight
        );

        if (this.light) this.scene.remove(this.light);
        if (this.ambientLight) this.scene.remove(this.ambientLight);
        this.light = new THREE.SpotLight(this.colors.spotlight, 0.5);
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

        this.ambientLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
        this.scene.add(this.ambientLight);
    }
    initDesk() {
        if (this.desk) this.scene.remove(this.desk);
        let shadowplane = new THREE.ShadowMaterial();
        shadowplane.opacity = 0.5;
        this.desk = new THREE.Mesh(
            new THREE.PlaneGeometry(
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
        this.scene = new THREE.Scene();

        this.setDimensions();
        this.initCamera();
        this.initLighting();
        this.initDesk();

        this.camera.updateProjectionMatrix();

        this.renderer.render(this.scene, this.camera);

        /*         this.camera = new THREE.PerspectiveCamera(
            45,
            this.ASPECT,
            1,
            (this.HEIGHT / this.ASPECT / Math.tan((10 * Math.PI) / 180)) * 1.3
        );

        this.camera.position.set(0, 0, 1275);
        this.camera.rotation.set(0, 0, 0); */

        /* this.startThrow();
         */

        /*         const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);

        this.controls = new OrbitControls(
            this.camera,
            this.renderer.domElement
        );
        this.camera.getWorldPosition(this.controls.target);
        this.controls.target.addScaledVector(direction, 5);
        this.controls.enablePan = true;
        this.controls.enableZoom = true;
        this.controls.update();
        this.controls.target = new THREE.Vector3(0, 0, 0); */
    }
    initWorld() {
        this.world = new World(this.WIDTH, this.HEIGHT);
        this.iterations = 0;
        this.buildWalls();
    }

    dice_body_material = new CANNON.Material();
    desk_body_material = new CANNON.Material();
    barrier_body_material = new CANNON.Material();

    buildWalls() {
        this.world.world.addContactMaterial(
            new CANNON.ContactMaterial(
                this.desk_body_material,
                this.dice_body_material,
                { friction: 0.01, restitution: 0.5 }
            )
        );
        this.world.world.addContactMaterial(
            new CANNON.ContactMaterial(
                this.barrier_body_material,
                this.dice_body_material,
                { friction: 0, restitution: 1.0 }
            )
        );
        this.world.world.addContactMaterial(
            new CANNON.ContactMaterial(
                this.dice_body_material,
                this.dice_body_material,
                { friction: 0, restitution: 0.5 }
            )
        );
        this.world.world.addBody(
            new CANNON.Body({
                allowSleep: false,
                mass: 0,
                shape: new CANNON.Plane(),
                material: this.desk_body_material
            })
        );

        let barrier = new CANNON.Body({
            allowSleep: false,
            mass: 0,
            shape: new CANNON.Plane(),
            material: this.barrier_body_material
        });
        barrier.quaternion.setFromAxisAngle(
            new CANNON.Vec3(1, 0, 0),
            Math.PI / 2
        );
        barrier.position.set(0, this.HEIGHT * 0.93, 0);
        this.world.world.addBody(barrier);

        barrier = new CANNON.Body({
            allowSleep: false,
            mass: 0,
            shape: new CANNON.Plane(),
            material: this.barrier_body_material
        });
        barrier.quaternion.setFromAxisAngle(
            new CANNON.Vec3(1, 0, 0),
            -Math.PI / 2
        );
        barrier.position.set(0, -this.HEIGHT * 0.93, 0);
        this.world.world.addBody(barrier);

        barrier = new CANNON.Body({
            allowSleep: false,
            mass: 0,
            shape: new CANNON.Plane(),
            material: this.barrier_body_material
        });
        barrier.quaternion.setFromAxisAngle(
            new CANNON.Vec3(0, 1, 0),
            -Math.PI / 2
        );
        barrier.position.set(this.WIDTH * 0.93, 0, 0);
        this.world.world.addBody(barrier);

        barrier = new CANNON.Body({
            allowSleep: false,
            mass: 0,
            shape: new CANNON.Plane(),
            material: this.barrier_body_material
        });
        barrier.quaternion.setFromAxisAngle(
            new CANNON.Vec3(0, 1, 0),
            Math.PI / 2
        );
        barrier.position.set(-this.WIDTH * 0.93, 0, 0);
        this.world.world.addBody(barrier);
    }

    render() {
        if (this.throwFinished()) {
            const map: { [key: number]: number[] } = {};
            this.current.forEach((dice) => {
                map[dice.sides] = [
                    ...(map[dice.sides] ?? []),
                    dice.getUpsideValue()
                ];
            });
            const sorted = Object.entries(map).sort((a, b) => b[0] - a[0]);
            this.event.trigger("throw-finished", sorted);
            this.registerInterval(
                window.setTimeout(() => {
                    this.container.style.opacity = `0`;
                    this.registerInterval(
                        window.setTimeout(() => this.unload(), 2000)
                    );
                }, 2000)
            );

            return;
        }
        this.animation = requestAnimationFrame(() => this.render());

        this.world.step(1 / 60);
        this.current.forEach((dice) => {
            dice.set();
        });

        this.controls?.update();
        this.renderer.render(this.scene, this.camera);
    }
    dispose(...children: any[]) {
        children.forEach((child) => {
            if ("dispose" in child) child.dispose();
            if (child.children) this.dispose(...child.children);
        });
    }
    onunload() {
        cancelAnimationFrame(this.animation);

        this.container.detach();
        this.container.empty();
        this.renderer.domElement.detach();
        this.renderer.dispose();

        this.ambientLight.dispose();
        this.light.dispose();

        this.controls?.dispose();

        this.scene.children.forEach((child) => this.dispose(child));

        this.scene.remove(
            this.scene,
            ...this.scene.children,
            ...this.current.map((d) => d.geometry)
        );

        this.current.forEach((dice) => {
            let materials = [
                ...(Array.isArray(dice.geometry.material)
                    ? dice.geometry.material
                    : [dice.geometry.material])
            ];
            materials.forEach((material) => material && material.dispose());
            this.world.world.removeBody(dice.body);
        });
        this.current = [];
        //causes white flash?
        //this.renderer.forceContextLoss();
    }

    onThrowFinished() {}

    throwFinished() {
        return (
            this.current?.every((d) => d.isFinished()) ??
            this.iterations > 1000 ??
            false
        );
    }
}

interface Vector {
    x: number;
    y: number;
    z?: number;
}
interface Quarternion extends Vector {
    w: number;
}

const MATERIAL_OPTIONS = {
    specular: 0x172022,
    color: 0xf0f0f0,
    shininess: 40,
    flatShading: true
    //shading: THREE.FlatShading,
};

class World {
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
    world = new CANNON.World({ gravity: new CANNON.Vec3(0, 0, -9.82 * 100) });
    ground = this.getPlane();
    constructor(public WIDTH: number, public HEIGHT: number) {
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.allowSleep = true;
        this.ground.position.set(0, 0, FLOOR);
        this.world.addBody(this.ground);
    }
    getPlane() {
        return new CANNON.Body({
            type: CANNON.Body.STATIC,
            shape: new CANNON.Plane()
        });
    }
}

const DEFAULT_DICE_OPTIONS = {
    radius: 1,
    diceColor: "#202020",
    textColor: "#aaaaaa"
};

// dice from https://github.com/byWulf/threejs-dice/blob/cd36a626f3f3f11576eb1d694223f07a36371b3b/lib/dice.js
abstract class Dice {
    geometry: THREE.Mesh;
    shape: CANNON.ConvexPolyhedron;

    scale = 50;

    abstract af: number;
    abstract chamfer: number;
    abstract faces: number[][];

    labels = [
        " ",
        "0",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "11",
        "12",
        "13",
        "14",
        "15",
        "16",
        "17",
        "18",
        "19",
        "20"
    ];

    abstract margin: number;

    abstract mass: number;

    abstract sides: number;
    abstract scaleFactor: number;
    abstract tab: number;

    abstract values: number[];
    abstract vertices: number[][];
    body: CANNON.Body;
    chamferGeometry: { vectors: THREE.Vector3[]; faces: any[][] };

    constructor(
        public w: number,
        public h: number,
        public result?: number,
        public options = {
            radius: 1,
            diceColor: "#202020",
            textColor: "#aaaaaa"
        }
    ) {
        this.options = {
            ...DEFAULT_DICE_OPTIONS,
            ...options
        };
    }

    get radius() {
        return this.options.radius * this.scale * this.scaleFactor;
    }
    get diceColor() {
        return this.options.diceColor;
    }
    get textColor() {
        return this.options.textColor;
    }
    get vectors() {
        return;
    }

    isFinished() {
        let threshold = 0.5;

        let angularVelocity = this.body.angularVelocity;
        let velocity = this.body.velocity;

        return (
            Math.abs(angularVelocity.x) < threshold &&
            Math.abs(angularVelocity.y) < threshold &&
            Math.abs(angularVelocity.z) < threshold &&
            Math.abs(velocity.x) < threshold &&
            Math.abs(velocity.y) < threshold &&
            Math.abs(velocity.z) < threshold
        );
    }
    get buffer() {
        return this.geometry.geometry;
    }
    getUpsideValue() {
        let vector = new THREE.Vector3(0, 0, this.sides == 4 ? -1 : 1);
        let closest_face,
            closest_angle = Math.PI * 2;
        const normals = this.buffer.getAttribute("normal").array;
        for (let i = 0, l = this.buffer.groups.length; i < l; ++i) {
            const face = this.buffer.groups[i];
            if (face.materialIndex == 0) continue;
            let startVertex = i * 9;
            const normal = new THREE.Vector3(
                normals[startVertex],
                normals[startVertex + 1],
                normals[startVertex + 2]
            );
            const angle = normal
                .clone()
                .applyQuaternion(
                    new THREE.Quaternion(
                        this.body.quaternion.x,
                        this.body.quaternion.y,
                        this.body.quaternion.z,
                        this.body.quaternion.w
                    )
                )
                .angleTo(vector);
            if (angle < closest_angle) {
                closest_angle = angle;
                closest_face = face;
            }
        }
        let matindex = closest_face.materialIndex - 1;
        if (this.sides == 10 && matindex == 0) matindex = 10;
        return matindex;
    }

    shiftUpperValue(to: number) {
        let geometry = this.geometry.geometry.clone();

        let from = this.getUpsideValue();
        for (let i = 0, l = geometry.groups.length; i < l; ++i) {
            let materialIndex = geometry.groups[i].materialIndex;
            if (materialIndex === 0) continue;

            materialIndex += to - from - 1;
            while (materialIndex > this.sides) materialIndex -= this.sides;
            while (materialIndex < 1) materialIndex += this.sides;

            geometry.groups[i].materialIndex = materialIndex + 1;
        }

        /* this.updateMaterialsForValue(toValue - fromValue);

        this.geometry.geometry = geometry; */
    }

    generateVector() {}

    set() {
        this.geometry.position.set(
            this.body.position.x,
            this.body.position.y,
            this.body.position.z
        );
        this.geometry.quaternion.set(
            this.body.quaternion.x,
            this.body.quaternion.y,
            this.body.quaternion.z,
            this.body.quaternion.w
        );
    }

    create() {
        this.geometry = new THREE.Mesh(this.getGeometry(), this.getMaterials());
        this.geometry.receiveShadow = true;
        this.geometry.castShadow = true;

        this.body.position.set(
            0 + this.radius * 2 * Math.random(),
            0 + this.radius * 2 * Math.random(),
            FLOOR + this.radius * 4
        );
        this.body.velocity.x = 500 * Math.random() * 2 - 1;
        this.body.velocity.y = 500 * Math.random() * 2 - 1;
        this.body.angularVelocity.x = 100 * Math.random();
        this.body.angularVelocity.y = 100 * Math.random();
    }
    getGeometry() {
        let vectors = new Array(this.vertices.length);
        for (let i = 0; i < this.vertices.length; ++i) {
            vectors[i] = new THREE.Vector3()
                .fromArray(this.vertices[i])
                .normalize();
        }

        this.chamferGeometry = this.getChamferGeometry(vectors);
        let geometry = this.makeGeometry(
            this.chamferGeometry.vectors,
            this.chamferGeometry.faces
        );

        this.shape = this.makeShape(vectors);

        this.body = new CANNON.Body({
            mass: this.mass,
            shape: this.shape
        });

        return geometry;
    }
    makeShape(vertices: THREE.Vector3[]): CANNON.ConvexPolyhedron {
        let cv = new Array(vertices.length),
            cf = new Array(this.faces.length);
        for (let i = 0; i < vertices.length; ++i) {
            let v = vertices[i];
            cv[i] = new CANNON.Vec3(
                v.x * this.radius,
                v.y * this.radius,
                v.z * this.radius
            );
        }
        for (let i = 0; i < this.faces.length; ++i) {
            cf[i] = this.faces[i].slice(0, this.faces[i].length - 1);
        }
        return new CANNON.ConvexPolyhedron({ vertices: cv, faces: cf });
    }
    getChamferGeometry(vectors: THREE.Vector3[]) {
        let chamfer_vectors = [],
            chamfer_faces = [],
            corner_faces = new Array(vectors.length);
        for (let i = 0; i < vectors.length; ++i) corner_faces[i] = [];
        for (let i = 0; i < this.faces.length; ++i) {
            let ii = this.faces[i],
                fl = ii.length - 1;
            let center_point = new THREE.Vector3();
            let face = new Array(fl);
            for (let j = 0; j < fl; ++j) {
                let vv = vectors[ii[j]].clone();
                center_point.add(vv);
                corner_faces[ii[j]].push(
                    (face[j] = chamfer_vectors.push(vv) - 1)
                );
            }
            center_point.divideScalar(fl);
            for (let j = 0; j < fl; ++j) {
                let vv = chamfer_vectors[face[j]];
                vv.subVectors(vv, center_point)
                    .multiplyScalar(this.chamfer)
                    .addVectors(vv, center_point);
            }
            face.push(ii[fl]);
            chamfer_faces.push(face);
        }
        for (let i = 0; i < this.faces.length - 1; ++i) {
            for (let j = i + 1; j < this.faces.length; ++j) {
                let pairs = [],
                    lastm = -1;
                for (let m = 0; m < this.faces[i].length - 1; ++m) {
                    let n = this.faces[j].indexOf(this.faces[i][m]);
                    if (n >= 0 && n < this.faces[j].length - 1) {
                        if (lastm >= 0 && m !== lastm + 1)
                            pairs.unshift([i, m], [j, n]);
                        else pairs.push([i, m], [j, n]);
                        lastm = m;
                    }
                }
                if (pairs.length !== 4) continue;
                chamfer_faces.push([
                    chamfer_faces[pairs[0][0]][pairs[0][1]],
                    chamfer_faces[pairs[1][0]][pairs[1][1]],
                    chamfer_faces[pairs[3][0]][pairs[3][1]],
                    chamfer_faces[pairs[2][0]][pairs[2][1]],
                    -1
                ]);
            }
        }
        for (let i = 0; i < corner_faces.length; ++i) {
            let cf = corner_faces[i],
                face = [cf[0]],
                count = cf.length - 1;
            while (count) {
                for (let m = this.faces.length; m < chamfer_faces.length; ++m) {
                    let index = chamfer_faces[m].indexOf(face[face.length - 1]);
                    if (index >= 0 && index < 4) {
                        if (--index === -1) index = 3;
                        let next_vertex = chamfer_faces[m][index];
                        if (cf.indexOf(next_vertex) >= 0) {
                            face.push(next_vertex);
                            break;
                        }
                    }
                }
                --count;
            }
            face.push(-1);
            chamfer_faces.push(face);
        }
        return { vectors: chamfer_vectors, faces: chamfer_faces };
    }
    makeGeometry(vertices: THREE.Vector3[], faces: number[][]) {
        let geom = new THREE.BufferGeometry();

        for (let i = 0; i < vertices.length; ++i) {
            vertices[i] = vertices[i].multiplyScalar(this.radius);
        }

        let positions = [];
        const normals = [];
        const uvs = [];

        const cb = new THREE.Vector3();
        const ab = new THREE.Vector3();
        let materialIndex;
        let faceFirstVertexIndex = 0;

        for (let i = 0; i < faces.length; ++i) {
            let ii = faces[i],
                fl = ii.length - 1;
            let aa = (Math.PI * 2) / fl;
            materialIndex = ii[fl] + 1;
            for (let j = 0; j < fl - 2; ++j) {
                //Vertices
                positions.push(...vertices[ii[0]].toArray());
                positions.push(...vertices[ii[j + 1]].toArray());
                positions.push(...vertices[ii[j + 2]].toArray());

                // Flat face normals
                cb.subVectors(vertices[ii[j + 2]], vertices[ii[j + 1]]);
                ab.subVectors(vertices[ii[0]], vertices[ii[j + 1]]);
                cb.cross(ab);
                cb.normalize();

                // Vertex Normals
                normals.push(...cb.toArray());
                normals.push(...cb.toArray());
                normals.push(...cb.toArray());

                //UVs
                uvs.push(
                    (Math.cos(this.af) + 1 + this.tab) / 2 / (1 + this.tab),
                    (Math.sin(this.af) + 1 + this.tab) / 2 / (1 + this.tab)
                );
                uvs.push(
                    (Math.cos(aa * (j + 1) + this.af) + 1 + this.tab) /
                        2 /
                        (1 + this.tab),
                    (Math.sin(aa * (j + 1) + this.af) + 1 + this.tab) /
                        2 /
                        (1 + this.tab)
                );
                uvs.push(
                    (Math.cos(aa * (j + 2) + this.af) + 1 + this.tab) /
                        2 /
                        (1 + this.tab),
                    (Math.sin(aa * (j + 2) + this.af) + 1 + this.tab) /
                        2 /
                        (1 + this.tab)
                );
            }

            //Set Group for face materials.
            let numOfVertices = (fl - 2) * 3;
            for (let i = 0; i < numOfVertices / 3; i++) {
                geom.addGroup(faceFirstVertexIndex, 3, materialIndex);
                faceFirstVertexIndex += 3;
            }
        }

        geom.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(positions, 3)
        );
        geom.setAttribute(
            "normal",
            new THREE.Float32BufferAttribute(normals, 3)
        );
        geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
        geom.boundingSphere = new THREE.Sphere(
            new THREE.Vector3(),
            this.radius
        );
        return geom;
    }
    getMaterials() {
        let materials: THREE.MeshPhongMaterial[] = [];
        for (let i = 0; i < this.labels.length; ++i) {
            let texture = null;
            texture = this.createTextTexture(i);

            materials.push(
                new THREE.MeshPhongMaterial(
                    Object.assign({}, MATERIAL_OPTIONS, { map: texture })
                )
            );
        }
        return materials;
    }
    calculateTextureSize(approx: number) {
        return Math.max(
            128,
            Math.pow(2, Math.floor(Math.log(approx) / Math.log(2)))
        );
    }
    createTextTexture(index: number) {
        let text = this.labels[index];
        if (text == undefined) return null;
        let canvas = document.createElement("canvas");
        let ctx = canvas.getContext("2d");
        let ts =
            this.calculateTextureSize(
                this.radius + this.radius * 2 * this.margin
            ) * 2;
        canvas.width = canvas.height = ts;
        let textstarty = canvas.height / 2;
        let textstartx = canvas.width / 2;
        let fontsize = ts / (1 + 2 * this.margin);

        if (this.sides == 10) {
            fontsize = fontsize * 0.75;
            textstarty = textstarty * 1.25;
            textstartx = textstartx * 0.9;
        } else if (this.sides == 20) {
            textstartx = textstartx * 0.98;
        }

        ctx.font = fontsize + "pt Arial";
        ctx.fillStyle = this.diceColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = this.textColor;
        if (this.sides == 10) {
            ctx.translate(textstartx, textstarty);
            ctx.rotate((75 * Math.PI) / 180);
            ctx.translate(-textstartx, -textstarty);
        }
        ctx.fillText(text, textstartx, textstarty);
        if (text == "6" || text == "9") {
            ctx.fillText("  .", canvas.width / 2, canvas.height / 2);
        }
        var texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        return texture;
    }
}

class D20Dice extends Dice {
    sides = 20;
    tab = -0.2;
    af = -Math.PI / 4 / 2;
    chamfer = 0.955;
    vertices: number[][] = [];
    faces = [
        [0, 11, 5, 1],
        [0, 5, 1, 2],
        [0, 1, 7, 3],
        [0, 7, 10, 4],
        [0, 10, 11, 5],
        [1, 5, 9, 6],
        [5, 11, 4, 7],
        [11, 10, 2, 8],
        [10, 7, 6, 9],
        [7, 1, 8, 10],
        [3, 9, 4, 11],
        [3, 4, 2, 12],
        [3, 2, 6, 13],
        [3, 6, 8, 14],
        [3, 8, 9, 15],
        [4, 9, 5, 16],
        [2, 4, 11, 17],
        [6, 2, 10, 18],
        [8, 6, 7, 19],
        [9, 8, 1, 20]
    ];
    scaleFactor = 1;
    values = [...Array(20).keys()];
    margin = 1;

    mass = 400;

    constructor(
        w: number,
        h: number,
        result?: number,
        options = DEFAULT_DICE_OPTIONS
    ) {
        super(w, h, result, options);

        let t = (1 + Math.sqrt(5)) / 2;
        this.vertices = [
            [-1, t, 0],
            [1, t, 0],
            [-1, -t, 0],
            [1, -t, 0],
            [0, -1, t],
            [0, 1, t],
            [0, -1, -t],
            [0, 1, -t],
            [t, 0, -1],
            [t, 0, 1],
            [-t, 0, -1],
            [-t, 0, 1]
        ];

        this.create();
    }
}

class D12Dice extends Dice {
    mass = 350;
    sides = 12;
    tab = 0.2;
    af = -Math.PI / 4 / 2;
    chamfer = 0.968;
    vertices: number[][] = [];
    faces = [
        [2, 14, 4, 12, 0, 1],
        [15, 9, 11, 19, 3, 2],
        [16, 10, 17, 7, 6, 3],
        [6, 7, 19, 11, 18, 4],
        [6, 18, 2, 0, 16, 5],
        [18, 11, 9, 14, 2, 6],
        [1, 17, 10, 8, 13, 7],
        [1, 13, 5, 15, 3, 8],
        [13, 8, 12, 4, 5, 9],
        [5, 4, 14, 9, 15, 10],
        [0, 12, 8, 10, 16, 11],
        [3, 19, 7, 17, 1, 12]
    ];
    scaleFactor = 0.9;
    values = [...Array(12).keys()];
    margin = 1;
    constructor(
        w: number,
        h: number,
        result?: number,
        options = DEFAULT_DICE_OPTIONS
    ) {
        super(w, h, result, options);

        let p = (1 + Math.sqrt(5)) / 2;
        let q = 1 / p;
        this.vertices = [
            [0, q, p],
            [0, q, -p],
            [0, -q, p],
            [0, -q, -p],
            [p, 0, q],
            [p, 0, -q],
            [-p, 0, q],
            [-p, 0, -q],
            [q, p, 0],
            [q, -p, 0],
            [-q, p, 0],
            [-q, -p, 0],
            [1, 1, 1],
            [1, 1, -1],
            [1, -1, 1],
            [1, -1, -1],
            [-1, 1, 1],
            [-1, 1, -1],
            [-1, -1, 1],
            [-1, -1, -1]
        ];
        this.create();
    }
}

class D10Dice extends Dice {
    mass = 350;
    sides = 10;
    tab = 0;
    af = (-Math.PI * 6) / 5;
    chamfer = 0.945;
    vertices: number[][] = [];
    faces = [
        [5, 7, 11, 0],
        [4, 2, 10, 1],
        [1, 3, 11, 2],
        [0, 8, 10, 3],
        [7, 9, 11, 4],
        [8, 6, 10, 5],
        [9, 1, 11, 6],
        [2, 0, 10, 7],
        [3, 5, 11, 8],
        [6, 4, 10, 9],
        [1, 0, 2, -1],
        [1, 2, 3, -1],
        [3, 2, 4, -1],
        [3, 4, 5, -1],
        [5, 4, 6, -1],
        [5, 6, 7, -1],
        [7, 6, 8, -1],
        [7, 8, 9, -1],
        [9, 8, 0, -1],
        [9, 0, 1, -1]
    ];
    scaleFactor = 0.9;
    values = [...Array(10).keys()];
    margin = 1;
    constructor(
        w: number,
        h: number,
        result?: number,
        options = DEFAULT_DICE_OPTIONS
    ) {
        super(w, h, result, options);
        for (let i = 0, b = 0; i < 10; ++i, b += (Math.PI * 2) / 10) {
            this.vertices.push([
                Math.cos(b),
                Math.sin(b),
                0.105 * (i % 2 ? 1 : -1)
            ]);
        }
        this.vertices.push([0, 0, -1]);
        this.vertices.push([0, 0, 1]);

        this.create();
    }
}

class D8Dice extends Dice {
    mass = 340;
    sides = 8;
    tab = 0;
    af = -Math.PI / 4 / 2;
    chamfer = 0.965;
    vertices = [
        [1, 0, 0],
        [-1, 0, 0],
        [0, 1, 0],
        [0, -1, 0],
        [0, 0, 1],
        [0, 0, -1]
    ];
    faces = [
        [0, 2, 4, 1],
        [0, 4, 3, 2],
        [0, 3, 5, 3],
        [0, 5, 2, 4],
        [1, 3, 4, 5],
        [1, 4, 2, 6],
        [1, 2, 5, 7],
        [1, 5, 3, 8]
    ];
    scaleFactor = 1;
    values = [...Array(8).keys()];
    margin = 1.2;
    constructor(
        w: number,
        h: number,
        result?: number,
        options = DEFAULT_DICE_OPTIONS
    ) {
        super(w, h, result, options);
        this.create();
    }
}

class D6Dice extends Dice {
    mass = 300;
    tab = 0.1;
    af = Math.PI / 4;
    chamfer = 0.96;
    vertices = [
        [-1, -1, -1],
        [1, -1, -1],
        [1, 1, -1],
        [-1, 1, -1],
        [-1, -1, 1],
        [1, -1, 1],
        [1, 1, 1],
        [-1, 1, 1]
    ];
    faces = [
        [0, 3, 2, 1, 1],
        [1, 2, 6, 5, 2],
        [0, 1, 5, 4, 3],
        [3, 7, 6, 2, 4],
        [0, 4, 7, 3, 5],
        [4, 5, 6, 7, 6]
    ];
    scaleFactor = 0.9;
    sides = 6;
    margin = 1.0;
    values = [...Array(6).keys()];

    constructor(
        w: number,
        h: number,
        result?: number,
        options = DEFAULT_DICE_OPTIONS
    ) {
        super(w, h, result, options);
        this.create();
    }
}
class D4Dice extends Dice {
    mass = 300;
    tab = -0.1;
    af = (Math.PI * 7) / 6;
    chamfer = 0.96;
    vertices = [
        [1, 1, 1],
        [-1, -1, 1],
        [-1, 1, -1],
        [1, -1, -1]
    ];
    faces = [
        [1, 0, 2, 1],
        [0, 1, 3, 2],
        [0, 3, 2, 3],
        [1, 2, 3, 4]
    ];
    scaleFactor = 1.2;
    sides = 4;
    margin = 1.0;
    d4FaceTexts = [
        [[], [0, 0, 0], [2, 4, 3], [1, 3, 4], [2, 1, 4], [1, 2, 3]],
        [[], [0, 0, 0], [2, 3, 4], [3, 1, 4], [2, 4, 1], [3, 2, 1]],
        [[], [0, 0, 0], [4, 3, 2], [3, 4, 1], [4, 2, 1], [3, 1, 2]],
        [[], [0, 0, 0], [4, 2, 3], [1, 4, 3], [4, 1, 2], [1, 3, 2]]
    ];
    values = [...Array(4).keys()];
    constructor(
        w: number,
        h: number,
        result?: number,
        options = DEFAULT_DICE_OPTIONS
    ) {
        super(w, h, result, options);
        this.create();
    }
    getMaterials() {
        let materials: THREE.MeshPhongMaterial[] = [];
        for (let i = 0; i < this.d4FaceTexts[0].length; ++i) {
            let texture = null;
            texture = this.createTextTexture(i);

            materials.push(
                new THREE.MeshPhongMaterial(
                    Object.assign({}, MATERIAL_OPTIONS, { map: texture })
                )
            );
        }
        return materials;
    }
    createTextTexture(index: number) {
        let canvas = document.createElement("canvas");
        let ctx = canvas.getContext("2d");
        let ts =
            this.calculateTextureSize(this.radius / 2 + this.radius * 2) * 2;
        canvas.width = canvas.height = ts;
        ctx.font = ts / 5 + "pt Arial";
        ctx.fillStyle = this.diceColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = this.textColor;
        for (let i in this.d4FaceTexts[0][index]) {
            ctx.fillText(
                `${this.d4FaceTexts[0][index][i]}`,
                canvas.width / 2,
                canvas.height / 2 - ts * 0.3
            );
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate((Math.PI * 2) / 3);
            ctx.translate(-canvas.width / 2, -canvas.height / 2);
        }
        let texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        return texture;
    }
}
