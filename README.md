<h1 align="center">Mystika - Game Engine</h1>

<p align="center">
  <img src="../../blob/main/webserver/www/public/img/logo.png?raw=true">
</p>

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