import assetCache from "../services/assetCache";

const audio = {
    list: () => {
        return assetCache.get("audio") as AudioData[];
    },
    get: (name: string) => {
        return audio.list().find((a) => a.name === name);
    }
}

export default audio;