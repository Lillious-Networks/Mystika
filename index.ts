import express from 'express';
import { events, server } from './socketServer';
import path from 'path';
import crypto from 'crypto';

const app = express();
app.use(express.json());

// Static files
app.use('/', express.static('www/public'));

// Static files at /assets
app.use('/assets', express.static(path.join(import.meta.dirname, 'assets')));

// Get map hash
app.get('/map', (req, res) => {
  const mapName = req?.query?.mapname?.toString();
  if (!mapName) return res.json({ hash: null });
  try {
    import(path.join(import.meta.dirname, 'maps', mapName)).then((mapData) => {
      const mapHash = crypto.createHash('sha256').update(JSON.stringify(mapData)).digest('hex');
      res.json({ hash: mapHash });
    });
  }
  catch (e) {
    res.json({ hash: null });
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