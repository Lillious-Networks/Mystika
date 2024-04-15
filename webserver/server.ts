import express from 'express';
import { events, server } from '../socket/server';
import { GetMaps, GetTilesets } from "../modules/assetloader";
import path from 'path';
const maps = GetMaps();
const tilesets = GetTilesets();

const app = express();
app.use(express.json());

// Static files
app.use('/', express.static(path.join(import.meta.dirname, 'www/public')));

// Get map hash
app.get('/map/hash', (req, res) => {
  const mapName = req?.query?.name?.toString();
  if (!mapName) return res.json({ hash: null });
  try {
    const map = (maps as any[]).find((map: any) => map.name === mapName);
    if (!map) return res.json({ hash: null });
    res.json({ hash: map.hash });
  }
  catch (e) {
    res.json({ hash: null });
  }
});

// Get tileset hash
app.get('/tileset/hash', (req, res) => {
  const tilesetName = req?.query?.name?.toString();
  if (!tilesetName) return res.json({ hash: null });
  try {
    const tileset = (tilesets as any[]).find((tileset: any) => tileset.name === tilesetName);
    if (!tileset) return res.json({ hash: null });
    res.json({ hash: tileset.hash });
  }
  catch (e) {
    res.json({ hash: null });
  }
});

app.get('/tileset', (req, res) => {
  const tilesetName = req?.query?.name?.toString();
  if (!tilesetName) return res.json({ data: null });
  try {
    const tileset = (tilesets as any[]).find((tileset: any) => tileset.name === tilesetName);
    if (!tileset) return res.json({ tileset: null });
    // Send blob base64 encoded
    res.json({ tileset });
  }
  catch (e) {
    res.json({ tileset: null });
  }
});

// Get the tileset data from the tileset name
app.get('/tileset', (req, res) => {
  const tilesetName = req?.query?.name?.toString();
  if (!tilesetName) return res.json({ data: null });
  try {
    console.log(tilesets)
    const tileset = (tilesets as any[]).find((tileset: any) => tileset.name === tilesetName);
    console.log(`Sending tileset: ${tileset}`);
    if (!tileset) return res.json({ data: null });
    console.log(`Sending tileset: ${tileset}`);
    res.json({ data: tileset.data });
  }
  catch (e) {
    res.json({ data: null });
  }
});

app.listen(80, () => {
  console.log('Web server is listening on localhost:80');
});

console.log(`Socket server is listening on ${server.hostname}:${server.port}`);

setInterval(() => {
  // console.log('Online count:', events.getOnlineCount());
  // console.log('Online data:', events.getOnlineData());
  //console.log('Client requests:', events.getClientRequests());
  //console.log('Rate limited clients:', events.getRateLimitedClients());
  // const packet = { type: 'CONNECTION_COUNT', data: events.getOnlineCount() };
  // events.broadcast(JSON.stringify(packet));
}, 1000);