import {Action, Getter, Module, Mutation, registerModule, State, unregisterModule, useModule} from "vuex-simple";
import {StoreModule} from "@/store/store.module";
import {ServerModuleData} from "@/store/server-module.data";
import {AuthenticationResultModule} from "@/store/authentication-result.module";
import {StoreModuleData} from "@/store/store-module.data";
import store from "@/store/index"
import serverService from "@/services/server.service";
import {Store} from "vuex";
import {RootModule} from "@/store/root.module";
import storeProvider from "@/store/index";

export class ServerModule implements ServerModuleData {
    @State()
    public id!: string;
    @State()
    public serverUrl!: string;
    @State()
    public apiKey!: string;
    @Module()
    public authenticationResult = new AuthenticationResultModule();
    @State()
    public stores: string[] = [];

    constructor(data: ServerModuleData = {apiKey: "", serverUrl: ""}) {
        this.updateData(data);
    }

    @Getter()
    public get store() {
        return (id: string, explicitStore: Store<RootModule> | null = null) => {
            return useModule<StoreModule>(explicitStore ?? storeProvider.store, this.getStoreModuleNamespace(id));
        }
    }

    @Mutation()
    private updateData(data: ServerModuleData) {
        Object.assign(this, data);
    }

    @Action()
    public async update(data?: ServerModuleData) {
        if (data)
            this.updateData(data);
        this.authenticationResult.updateData(await serverService.authenticate(this));
        if (this.authenticationResult.authenticated) {
            await this.fetchStores();
        }
    }

    @Action()
    public async fetchStores() {
        const stores: StoreModuleData[] = [{id: "1", name: "Store 1"}, {id: "2", name: "Store 2"}];
        const storeIds = stores.map(value => value.id);
        const removedStores = this.stores.filter(value => storeIds.indexOf(value) === 1);
        removedStores.forEach(this.removeStore);
        stores.forEach(this.addOrUpdateStore);
    }

    @Action()
    public removeStore(id: string) {
        this.stores.splice(this.stores.indexOf(id), 1);
        unregisterModule(storeProvider.store, this.getStoreModuleNamespace(id))
    }

    @Mutation()
    public addOrUpdateStore(data: StoreModuleData) {
        if (this.stores.indexOf(data.id) === -1) {
            this.stores.push(data.id);
            registerModule(storeProvider.store, this.getStoreModuleNamespace(data.id), new StoreModule(data), {preserveState: false})
        } else {
            this.store(data.id)?.update(data);
        }
    }

    public hasPermission(permission: string, ...args: any[]) {
        if (this.authenticationResult == null || !this.authenticationResult.authenticated) {
            return false;
        }
        return this.authenticationResult.permissions.indexOf(permission);
    }

    public onRehydrate(store) {
        if(!this.stores){
            debugger;
        }
        console.warn("onRehydrate2",this.stores,store);
        this.stores.forEach(value => {
            console.warn("onRehydrate2.1");
            registerModule(store, this.getStoreModuleNamespace(value), new StoreModule(), {preserveState: true});
            this.store(value, store)?.onRehydrate(store);
        })
    }

    private getStoreModuleNamespace(id: string) {
        return [`${this.id}_stores[${id}]`];
    }
}

export class Permissions {
    public static readonly CanCreateStores = "cancreatestore";
}