class AssetCacheService {
    private cache: { [key: string]: any };

    constructor() {
        // Initialize the cache
        this.cache = {};
    }
    // Add an item to the cache
    add(key: string, value: any) {
        this.cache[key] = value;
    }
    // Get an item from the cache
    get(key: string) {
        return this.cache[key];
    }
    // Remove an item from the cache
    remove(key: string) {
        delete this.cache[key];
    }
    // Clear the cache
    clear() {
        this.cache = {};
    }
    list() {
        return this.cache;
    }
}

const assetCache: AssetCacheService = new AssetCacheService();
export default assetCache;