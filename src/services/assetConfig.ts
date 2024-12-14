class AssetConfigService {
  getAssetConfig() {
    return process.env.ASSET_PATH;
  }
}

const assetConfig: AssetConfigService = new AssetConfigService();

export default assetConfig;