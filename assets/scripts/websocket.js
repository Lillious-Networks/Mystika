const socket = new WebSocket("ws://localhost:3000/");

Object.freeze(socket);

socket.addEventListener("open", (ws) => {
  const packet = {
    type: "PING",
    data: null,
  };
  socket.send(JSON.stringify(packet));
});

socket.addEventListener("message", async (event) => {
  switch (JSON.parse(event.data)["type"]) {
    case "PONG":
      socket.send(JSON.stringify({ type: "LOGIN", data: null }));
      break;

    case "TIME_SYNC": {
      setTimeout(() => {
        socket.send(JSON.stringify({ type: "TIME_SYNC", data: JSON.parse(event.data)["data"]}));
      }, 5000);
      break;
    }
    case "LOAD_MAP":
      {
        const map = JSON.parse(event.data)["data"];
        const mapData = map[0];
        const mapHash = map[1];
        const mapName = map[2];
        const position = map[3];
        const fetchMap = async () => {
          const response = await fetch(`/map/hash?name=${mapName}`);
          if (!response.ok) {
            throw new Error("Failed to fetch map");
          }
          return response.json();
        };
        const serverMapHashResponse = await fetchMap(mapHash);
        const serverMapHashData = serverMapHashResponse.hash;
        if (!serverMapHashData) {
          throw new Error("No map hash data found");
        }
        if (serverMapHashData !== mapHash) {
          throw new Error("Map hash mismatch");
        }
        const tilesets = mapData.tilesets;
        if (!tilesets) {
          throw new Error("No tilesets found");
        }
        const fetchTilesetImages = async () => {
          const images = [];
          for (let i = 0; i < tilesets.length; i++) {
            const name = tilesets[i].image.split("/").pop();
            const response = await fetch(`/tileset?name=${name}`);
            if (!response.ok) {
              throw new Error(`Failed to fetch tileset image: ${name}`);
            }
            const data = await response.json();
            images.push(data);
          }
          return images;
        };

        const result = await fetchTilesetImages();

        if (result.length == 0) {
          throw new Error("No tileset images found");
        }

        const images = [];
        result.forEach(async (r) => {
          const response = await fetch(`/tileset/hash?name=${r.tileset.name}`);
          if (!response.ok) {
            throw new Error("Failed to fetch tileset hash");
          }
          const data = await response.json();

          if (data.hash !== r.tileset.hash) {
            throw new Error("Tileset hash mismatch");
          }

          const image = new Image();
          image.onload = function () {
            images.push(image);
            if (images.length === result.length) {
              drawMap(images);
            }
          };
          image.src = `data:image/png;base64,${r.tileset.data}`;
        });

        function drawMap(images) {
          const canvas = document.getElementById("game");
          const ctx = canvas.getContext("2d");
          const dpi = window.devicePixelRatio;
          canvas.width = mapData.width * mapData.tilewidth * dpi;
          canvas.height = mapData.height * mapData.tileheight * dpi;
          canvas.style.width = mapData.width * mapData.tilewidth + "px";
          canvas.style.height = mapData.height * mapData.tileheight + "px";
          ctx.scale(dpi, dpi);
          ctx.imageSmoothingEnabled = false;
          ctx.mozImageSmoothingEnabled = false;
          ctx.webkitImageSmoothingEnabled = false;
          ctx.msImageSmoothingEnabled = false;

          for (let i = 0; i < mapData.layers.length; i++) {
            const layer = mapData.layers[i];
            if (!layer || !layer.data) continue;
            const tileset =
              tilesets.find((tileset) => tileset.firstgid <= layer.data[0]) ||
              tilesets[0];
            const image = images[tilesets.indexOf(tileset)];
            const tileWidth = tileset.tilewidth;
            const tileHeight = tileset.tileheight;
            const tilesetWidth = tileset.imagewidth;
            for (let y = 0; y < mapData.height; y++) {
              for (let x = 0; x < mapData.width; x++) {
                const tileIndex = layer.data[y * mapData.width + x];
                if (!tileIndex || tileIndex === 0) {
                  continue;
                }
                const tilesPerRow = tilesetWidth / tileWidth;
                const tileY = Math.floor(
                  (tileIndex - tileset.firstgid) / tilesPerRow
                );
                const tileX = (tileIndex - tileset.firstgid) % tilesPerRow;
                ctx.drawImage(
                  image,
                  tileX * tileWidth,
                  tileY * tileHeight,
                  tileWidth,
                  tileHeight,
                  x * tileWidth,
                  y * tileHeight,
                  tileWidth,
                  tileHeight
                );
              }
            }
          }
          canvas.style.display = "block";
        }
      }
      break;

    case "LOGIN_SUCCESS":
      const connectionId = JSON.parse(event.data)["data"];
      sessionStorage.setItem("connectionId", connectionId);
      const sessionToken = getCookie("token");
      if (!sessionToken) {
        throw new Error("No session token found");
      }
      socket.send(JSON.stringify({ type: "AUTH", data: sessionToken }));
      break;
  }
});

function getCookie(cname) {
  let name = cname + "=";
  let decodedCookie = decodeURIComponent(document.cookie);
  let ca = decodedCookie.split(';');
  for(let i = 0; i <ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}