import express from 'express';
import { events, server } from './socketServer';

const app = express();
app.use(express.json());

// Static files
app.use(express.static('www/public'));

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