<h1 align="center">Mystika - Game Engine</h1>

<p align="center">
  ![Image](../blob/master/www/public/img/logo.png?raw=true)
</p>

<h3>Client Identity</h3>

<h5>Structure</h5>

```ts
declare interface Identity {
  id: string;
  useragent: string;
};
```

<h3>Packets</h3>

<h5>Types</h5>

```ts
const PacketTypes: PacketType = {
  0: "PING",
  1: "PONG",
  2: "CONNECTION_COUNT",
  3: "RATE_LIMITED",
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
  maxWindowTime: 4000
};
```

<hr>
<h3>Events</h3>

- <h5>getOnlineCount</h5>

    <p>Returns the amount of clients that are currently connected</p>

-   <h5>getOnlineData</h5>

    <p>Returns a list that contains client connection data</p>

-   <h5>broadcast</h5>

    <p>Broadcasts a message to all connected clients</p>

-   <h5>getClientRequests</h5>

    <p>Returns a list that contains client request data

-   <h5>getRateLimitedClients</h5>

    <p>Returns a list of rate limited clients</p>