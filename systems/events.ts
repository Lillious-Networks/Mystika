import EventEmitter from "node:events";
import log from "../modules/logger";
export const Event = new EventEmitter();
import { Listener } from "../socket/server";

// Online runs once the Server is online
Event.on("online", (data) => {
  log.info(`TCP server is listening on ${data.port}`);
  // Emit awake event
  Listener.emit("onAwake");
  // Emit start event
  Listener.emit("onStart");
  // Update loop runs every frame of the Server at 60fps
  setInterval(() => {
    Listener.emit("onUpdate");
  }, 1000 / 60);
  // Fixed update loop runs every 100ms
  setInterval(() => {
    Listener.emit("onFixedUpdate");
  }, 100);
  // Save loop runs every 5 minutes
  setInterval(() => {
    Listener.emit("onSave");
  }, 1000);
});
