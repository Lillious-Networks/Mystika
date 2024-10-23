import EventEmitter from "node:events";
import log from "../modules/logger";
export const event = new EventEmitter();
import { listener } from "../socket/server";

// Online runs once the Server is online
event.on("online", (data) => {
  log.info(`TCP server is listening on localhost:${data.port}`);
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
  // Save loop runs every 5 minutes
  setInterval(() => {
    listener.emit("onSave");
  }, 1000);
});
