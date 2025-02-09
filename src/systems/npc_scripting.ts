import { event } from "../systems/events";

class NPC {
    id: number;
    map: string;
    position: { x: number; y: number; direction: string };
    hidden: boolean;
    script: Nullable<string>;
    dialog: string;

    constructor(npc: NPC) {
        this.id = npc.id;
        this.map = npc.map;
        this.position = npc.position;
        this.hidden = npc.hidden;
        this.script = npc.script;
        this.dialog = "";
    }
    
    async onDialog(this: NPC) {
        event.emit("npcDialog", {
            id: this.id,
            dialog: this.dialog,
        });
    }
}

export default NPC;