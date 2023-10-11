import { BufferGeometry, Material, Mesh, Object3D, Texture } from "three";

type Disposable = { dispose: () => any };
type Trackable =
    | Mesh<BufferGeometry, Material | Material[]>
    | Material
    | Object3D<any>;

type TrackedResource = Trackable | Trackable[] | Disposable;

export class ResourceTracker {
    resources: Map<TrackedResource, TrackedResource[]> = new Map();
    constructor() {}
    #track(resource: TrackedResource, parent?: TrackedResource): void {
        if (Array.isArray(resource)) {
            resource.forEach((r) => {
                const children = this.resources.get(parent) ?? [];
                children.push(r);
                this.#track(r, parent);
            });
        } else {
            const children = this.resources.get(parent ?? resource) ?? [];
            this.resources.set(parent ?? resource, children);
        }
    }
    track<T extends TrackedResource>(resource: T): T {
        if ("dispose" in resource) {
            this.#track(resource);
        }

        if (resource instanceof Object3D) {
            this.#track(resource);
        }
        if ("geometry" in resource) this.#track(resource.geometry, resource);
        if ("material" in resource) this.#track(resource.material, resource);
        if ("children" in resource) this.#track(resource.children, resource);
        if (resource instanceof Material) {
            // We have to check if there are any textures on the material
            for (const value of Object.values(resource)) {
                if (value instanceof Texture) {
                    this.#track(value);
                }
            }
        }
        return resource;
    }
    untrack(resource: any) {
        this.resources.delete(resource);
    }
    dispose() {
        for (const [resource] of this.resources) {
            this.disposeResource(resource);
        }
        this.resources.clear();
    }
    disposeResource<T extends TrackedResource>(resource: T) {
        if ("parent" in resource && resource.parent) {
            resource.parent.remove(resource);
        }
        if ("dispose" in resource) {
            resource.dispose();
        }
        for (const child of this.resources.get(resource) ?? []) {
            this.disposeResource(child);
        }
        this.resources.delete(resource);
    }
}
