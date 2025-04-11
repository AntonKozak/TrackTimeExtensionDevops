import { IExtensionDataManager } from "azure-devops-extension-api";
import { ObservableArray } from "azure-devops-ui/Core/Observable";

export interface IResource {
    id: string;
    title: string;
    __etag?: number; // Add the __etag property
}

export class FreeFormResourceSource {
    private dataManager?: IExtensionDataManager;
    private selectedTeamId: string = "";
    private resources: ObservableArray<IResource> = new ObservableArray<IResource>([]);
    // new ObservableArray<IResource>([
    //     { id: "1", title: "Everyone" },
    //     { id: "2", title: "Anton Kozak" },
    //     { id: "3", title: "Fredrik Backe" },
    //     { id: "4", title: "Katarina Ask" },
    //     { id: "5", title: "Kristian Cederberg" },
    //     { id: "6", title: "Sara Boslander" },
    //     { id: "7", title: "Camilla Lindvall" },
    //     { id: "8", title: "Mattias Arnesson" },
    //     { id: "9", title: "Alf Larsson" },
    //     { id: "10", title: "Roman Matvichuk" },
    //     { id: "11", title: "Anna-Karin Elmberg" }
    // ]);
    private collectionName: string = "";
    private resourcesLoaded: boolean = false;

    public initialize(teamId: string, manager: IExtensionDataManager): void {
        console.log("##################### initialize");
        this.selectedTeamId = teamId;
        this.dataManager = manager;
        this.collectionName = `${teamId}.resources`;
        this.resourcesLoaded = false;
        this.loadResources();
        console.log("##################### initialize end", this.getResources());
    }

    public getResources(): IResource[] {
        return this.resources.value;
    }

    public getResourcesObservable(): ObservableArray<IResource> {
        return this.resources;
    }

    public async addResource(title: string): Promise<IResource> {
        if (!this.dataManager) {
            throw new Error("Resource source not initialized");
        }

        const newId = this.generateId();
        const resource: IResource = {
            id: newId,
            title: title
        };

        // Add to data store
        const addedResource = await this.dataManager.createDocument(this.collectionName, resource);

        // Update local cache
        this.resources.push(addedResource);

        return addedResource;
    }

    public async updateResource(id: string, title: string): Promise<IResource> {
        if (!this.dataManager) {
            throw new Error("Resource source not initialized");
        }

        // Find existing resource
        const existingIndex = this.resources.value.findIndex((r) => r.id === id);
        if (existingIndex === -1) {
            throw new Error(`Resource with id ${id} not found`);
        }

        // Create updated resource
        const existingResource = this.resources.value[existingIndex];
        const updatedResource: IResource = {
            ...existingResource,
            title: title,
            __etag: existingResource.__etag // Ensure __etag is included
        };

        // Update in data store
        const savedResource = await this.dataManager.updateDocument(this.collectionName, updatedResource);

        // Update local cache
        this.resources.splice(existingIndex, 1, savedResource);

        return savedResource;
    }

    public async deleteResource(id: string): Promise<void> {
        if (!this.dataManager) {
            throw new Error("Resource source not initialized");
        }

        // Find existing resource
        const existingIndex = this.resources.value.findIndex((r) => r.id === id);
        if (existingIndex === -1) {
            throw new Error(`Resource with id ${id} not found`);
        }

        // Delete from data store
        await this.dataManager.deleteDocument(this.collectionName, id);

        // Update local cache
        this.resources.splice(existingIndex, 1);
    }

    private async loadResources(): Promise<void> {
        console.log("##################### loadResources");
        if (!this.dataManager || this.resourcesLoaded) {
            return;
        }

        console.log("##################### loadResources 1");

        try {
            const collections = await this.dataManager.queryCollectionsByName([this.collectionName]);

            if (collections && collections.length > 0 && collections[0].documents) {
                // Load resources from storage
                this.resources.value = collections[0].documents as IResource[];
            } else {
                // Initialize with default resources if none exist
                this.resources.value = this.getDefaultResources();

                // Save default resources
                for (const resource of this.resources.value) {
                    await this.dataManager.createDocument(this.collectionName, resource);
                }
            }

            this.resourcesLoaded = true;
        } catch (error) {
            console.error("Failed to load resources:", error);
            // Fall back to default resources if there's an error
            this.resources.value = this.getDefaultResources();
        }
    }

    private getDefaultResources(): IResource[] {
        return [
            { id: "1", title: "Everyone" },
            { id: "2", title: "Anton Kozak" },
            { id: "3", title: "Fredrik Backe" },
            { id: "4", title: "Katarina Ask" },
            { id: "5", title: "Kristian Cederberg" },
            { id: "6", title: "Sara Boslander" }
        ];
    }

    private generateId(): string {
        // Generate a new unique ID based on existing resources
        const maxId = Math.max(...this.resources.value.map((r) => parseInt(r.id)), 0);
        return (maxId + 1).toString();
    }
}
