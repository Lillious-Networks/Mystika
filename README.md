<h1 align="center">Mystika - Game Engine</h1>

> [!NOTE]
> This project is currently a **work in progress**
> Core Develoopment Team: Lillious

<p align="center">
  <img src="../../blob/main/webserver/www/public/img/logo.png?raw=true">
</p>

<h3>Getting Started</h3>

> [!IMPORTANT]
> Database setup must be ran prior to first run

<h5>Running the server</h5>

```
bun start
```

<h5>Unit Tests</h5>

```
bun test
```

<h5>Database Setup<h5>

```
bun setup
```

<h3>Environment Variables</h3>

> [!IMPORTANT]
> The below environment variables are required

<p style="font-size:1em;">Location: /.env</p>


```
DATABASE_HOST
DATABASE_USER
DATABASE_PASSWORD
DATABASE_NAME
EMAIL_USER
EMAIL_PASSWORD
EMAIL_SERVICE
EMAIL_TEST
```

<h3>Client Identity</h3>

<h5>Structure</h5>

```ts
declare interface Identity {
  id: string;
  useragent: string;
}
```

<h3>Packets</h3>

<h5>Types</h5>

```ts
const PacketTypes: PacketType = {
  0: "PING",
  1: "PONG",
  2: "CONNECTION_COUNT",
  3: "RATE_LIMITED",
  4: "LOGIN",
  5: "LOGIN_SUCCESS",
  6: "LOGIN_FAILED",
  7: "LOAD_MAP",
  8: "TIME_SYNC",
  9: "MOVEXY",
  10: "AUTH",
  11: "LOGOUT",
  12: "DISCONNECT"
};
```

<h5>Structure</h5>

```ts
declare interface Packet {
  type: PacketType;
  data: PacketData;
  id: string | null;
  useragent: string | null;
}
```

<hr>
<h3>Rate Limiting</h3>
<h5>Options</h5>

```ts
const RateLimitOptions: RateLimitOptions = {
  maxRequests: 100,
  time: 5000,
  maxWindowTime: 4000,
};
```

<h5>Structure</h5>

```ts
declare interface RateLimitOptions {
  maxRequests: number;
  time: number;
  maxWindowTime: number;
}
```

<hr>
<h3>Events</h3>

```ts
import { Events } from "../socket/server";
```

<h5>Events.GetOnlineCount();</h5>
<p style="font-size:0.8em;">Returns the amount of clients that are currently connected</p>

<h5>Events.GetOnlineData();</h5>
<p style="font-size:0.8em;">Returns a list that contains client connection data</p>

<h5>Events.Broadcast(packet: string);</h5>
<p style="font-size:0.8em;">Broadcasts a message to all connected clients</p>

<h5>Events.GetClientRequests();</h5>
<p style="font-size:0.8em;">Returns a list that contains client request data

<h5>Events.GetRateLimitedClients();</h5>
<p style="font-size:0.8em;">Returns a list of rate limited clients</p>

<hr>
<h3>Listener Events</h3>

<h5>onAwake</h5>
<p style="font-size:0.8em;">Fires immediately after the server starts</p>

```ts
Listener.on("onAwake", (data) => {
  console.log("Awake event emitted");
});
```

<h5>onStart</h5>
<p style="font-size:0.8em;">Fires immediately after <b>onAwake</b></p>

```ts
Listener.on("onStart", (data) => {
  console.log("Start event emitted");
});
```

<h5>onUpdate</h5>
<p style="font-size:0.8em;">Fires immediately after <b>onStart</b> every 60 frames</p>

```ts
Listener.on("onUpdate", (data) => {
  console.log("Update event emitted");
});
```

<h5>onFixedUpdate</h5>
<p style="font-size:0.8em;">Fires immediately after <b>onStart</b> every 100ms</p>

```ts
Listener.on("onFixedUpdate", (data) => {
  console.log("Fixed update event emitted");
});
```

<h5>onSave</h5>
<p style="font-size:0.8em;">Runs every 5 minutes</p>

```ts
Listener.on("onSave", (data) => {
  console.log("Save event emitted");
});
```

<h5>onConnection</h5>
<p style="font-size:0.8em;">Fires when a new connection is established</p>

```ts
Listener.on("onConnection", (data) => {
  console.log(`New connection: ${data}`);
});
```

<h5>onDisconnect</h5>
<p style="font-size:0.8em;">Fires when a connection is dropped</p>

```ts
Listener.on("onDisconnect", (data) => {
  console.log(`Disconnected: ${data}`);
});
```

<hr>
<h3>Inventory Management</h3>

```ts
import inventory from "../systems/inventory";
```

<h5>Structure</h5>

```ts
declare interface InventoryItem {
  name: string;
  quantity: number;
}
```

<h5>inventory.add();</h5>
<p style="font-size:0.8em;">Add an item to player inventory</p>

```ts
await inventory.add("user_name", { name: "item_name", quantity: number });
```

<h5>inventory.remove();</h5>
<p style="font-size:0.8em;">Remove an item from player inventory</p>

```ts
await inventory.remove("user_name", { name: "item_name", quantity: number });
```

<h5>inventory.find();</h5>
<p style="font-size:0.8em;">Find an item from player inventory</p>

```ts
await inventory.find("user_name", { name: "item_name" });
```

<h5>inventory.delete();</h5>
<p style="font-size:0.8em;">Delete an item from player inventory</p>

```ts
await inventory.delete("user_name", { name: "item_name" });
```

<hr>
<h3>Item Management</h3>

```ts
import items from "../systems/items";
```

<h5>Structure</h5>

```ts
declare interface Item {
  name: string;
  quality: string;
  description: string;
}
```

<h5>items.add();</h5>
<p style="font-size:0.8em;">Add an item to the item database</p>

```ts
await items.add({ name: "item_name", quality: "item_quality", description: "item_description" });
```

<h5>items.remove();</h5>
<p style="font-size:0.8em;">Remove an item from the item database</p>

```ts
await items.remove({ name: "item_name" });
```

<h5>items.list();</h5>
<p style="font-size:0.8em;">List all items from the item database</p>

```ts
await items.list();
```

<h5>items.find();</h5>
<p style="font-size:0.8em;">Find an item from the item database</p>

```ts
await items.find({ name: "item_name" });
```

<hr>
<h3>Player Management</h3>

```ts
import player from "../systems/player";
```

<h5>Structure</h5>

```ts
declare interface Player {
  id?: string;
  name?: string;
  position?: PositionData;
  map?: string;
}
```

<h5>player.getLocation();</h5>
<p style="font-size:0.8em;">Get a player's location data</p>

```ts
await player.getLocation({ name: username }) as LocationData | null;
```

<h5>player.setSessionId();</h5>
<p style="font-size:0.8em;">Sets a player's sessionId</p>

```ts
await player.setSessionId(token, sessionId);
```

<h5>player.getSessionId();</h5>
<p style="font-size:0.8em;">Get a player's sessionId</p>

```ts
await player.getSessionId(token);
```

<h5>player.login();</h5>
<p style="font-size:0.8em;">Logs a player in</p>

```ts
await player.login(username, password);
```

<h5>player.logout();</h5>
<p style="font-size:0.8em;">Logs the player out by clearing the auth token</p>

```ts
await player.logout(sessionId);
```

<h5>player.clearSessionId();</h5>
<p style="font-size:0.8em;">Clears the players session by clearing the session id</p>

```ts
await player.clearSessionId(sessionId);
```

<h5>player.getUsernameBySession();</h5>
<p style="font-size:0.8em;">Gets a player's username by sessionId</p>

```ts
await player.getUsernameBySession(sessionId);
```

<h5>player.getUsernameByToken();</h5>
<p style="font-size:0.8em;">Gets a player's username by authentication token</p>

```ts
await player.getUsernameByToken(sessionId);
```

<h5>player.register();</h5>
<p style="font-size:0.8em;">Registers a new player account</p>

```ts
await player.register(username, password, email, request);
```

<h5>player.findByUsername();</h5>
<p style="font-size:0.8em;">Finds a player by username</p>

```ts
await player.findByUsername(username);
```

<h5>player.findByEmail();</h5>
<p style="font-size:0.8em;">Finds a player by email</p>

```ts
await player.findByEmail(email);
```

<h5>player.setToken();</h5>
<p style="font-size:0.8em;">Assigns a player an authentication token</p>

```ts
await player.setToken(username);
```

<h5>player.getEmail();</h5>
<p style="font-size:0.8em;">Gets a players email</p>

```ts
await player.getEmail(sessionId);
```

<h5>player.returnHome();</h5>
<p style="font-size:0.8em;">Sets the players location to the main map at 0, 0</p>

```ts
await player.returnHome(sessionId);
```

<h5>player.isOnline();</h5>
<p style="font-size:0.8em;">Checks if the player is currently online</p>

```ts
await player.isOnline(username);
```

<h5>player.isBanned();</h5>
<p style="font-size:0.8em;">Checks if the player is currently banned</p>

```ts
await player.isBanned(username);
```