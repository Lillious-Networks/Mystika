// Define the packet structure
declare interface Packet {
  type: PacketType;
  data: PacketData;
  id: string | null;
  useragent: string | null;
}

// Define the packet type
declare interface PacketType {
  [key: number]: string;
}

// Define the packet data
declare interface PacketData {
  data: Array<any>;
}

declare interface Subscription {
  event: string;
  callback: (data: any) => void;
}

// Define the identity of a client
declare interface Identity {
  id: string;
  useragent: string;
}

// Define client rate limit
declare interface ClientRateLimit {
  id: string;
  requests: number;
  rateLimited: boolean;
  time: number | null;
  windowTime: number;
}

// Define RateLimit options
declare interface RateLimitOptions {
  maxRequests: number;
  time: number;
  maxWindowTime: number;
}

// Define map data
declare interface MapData {
  name: string;
  data: any;
  hash: string;
}

// Define tileset data
declare interface TilesetData {
  name: string;
  data: string;
  hash: string;
}
