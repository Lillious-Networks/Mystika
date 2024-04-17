import EventEmitter from "node:events";

export const Event = new EventEmitter();
import { Listener } from "../socket/server";

// Online runs once the Server is online
Event.on("online", (data) => {
  console.log(`Socket server is listening on ${data.hostname}:${data.port}`);
  // Emit awake event
  Listener.emit("onAwake", data);
  // Emit start event
  Listener.emit("onStart", data);
  // Update loop runs every frame of the Server at 60fps
  setInterval(() => {
    Listener.emit("onUpdate");
  }, 1000 / 60);

  // Fixed update loop runs every 100ms
  setInterval(() => {
    Listener.emit("onFixedUpdate");
  }, 100);
});
