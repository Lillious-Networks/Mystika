import EventEmitter from "node:events";
import log from "../modules/logger";
export const event = new EventEmitter();
import { listener } from "../socket/server";
const now = performance.now();

// Online runs once the Server is online
event.on("online", (data) => {
  log.success(`TCP server is listening on localhost:${data.port} - Ready in ${(performance.now() - now).toFixed(2)}ms`);
  // Emit awake event
  listener.emit("onAwake");
  // Emit start event
  listener.emit("onStart");
  // Update loop runs every frame of the Server at 60fps
  setInterval(() => {
    listener.emit("onUpdate");
  }, 1000 / 60);
  // Fixed update loop runs every 100ms
  setInterval(() => {
    listener.emit("onFixedUpdate");
  }, 100);
  // Save loop runs every 1 minute
  setInterval(() => {
    listener.emit("onSave");
  }, 60000);
});