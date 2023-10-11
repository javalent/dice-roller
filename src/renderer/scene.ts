import { Component, Events } from "obsidian";
import {
    Mesh,
    PlaneGeometry,
    ShadowMaterial,
    Vector3,
    AmbientLight,
    PerspectiveCamera,
    SpotLight,
    type DirectionalLight,
    Scene,
    WebGLRenderer
} from "three";

export class SceneManager extends Component {
    remove(...mesh: Mesh[]) {
        this.scene.remove(...mesh);
    }
    add(...mesh: Mesh[]) {
        this.scene.add(...mesh);
    }
    event = new Events();
    renderer: WebGLRenderer = new WebGLRenderer({
        alpha: true,
        antialias: true
    });
    scene: Scene;
    camera: PerspectiveCamera;

    container: HTMLElement = createDiv("renderer-container");

    directionalLight: DirectionalLight;
    ambientLight: AmbientLight;

    animation: number;

    light: SpotLight;
    shadows: boolean = true;
    desk: any;
    iterations: number = 0;

    frame_rate = 1 / 60;

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
        this.scene = new Scene();
        this.initCamera();
        this.initLighting();
        this.initDesk();

        this.camera.updateProjectionMatrix();
        this.render();
    }
    render() {
        this.renderer.render(this.scene, this.camera);
    }
    #dispose(...children: any[]) {
        children.forEach((child) => {
            if ("dispose" in child) child.dispose();
            if (child.children) this.#dispose(...child.children);
        });
    }

    dispose() {
        this.renderer.domElement.detach();
        this.renderer.renderLists.dispose();
        this.renderer.dispose();

        this.scene.children.forEach((child) => this.#dispose(child));
        this.ambientLight.dispose();
        this.light.dispose();

        this.scene.remove(this.scene, ...this.scene.children);
    }
}
