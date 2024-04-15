const socket = new WebSocket("ws://localhost:3000/");

socket.addEventListener("open", () => {
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
    case "LOAD_MAP":
      {
        try {
          const map = JSON.parse(event.data)["data"];
          const mapData = map[0];
          const mapHash = map[1];
          const mapName = map[2];
          // Fetch the map hash from the server to verify the authenticity of the map
          const fetchMap = async () => {
            const response = await fetch(`/map?mapname=${mapName}`);
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
          // Check if the map hash matches the server's map hash
          if (serverMapHashData !== mapHash) {
            throw new Error("Map hash mismatch");
          }
          const tilesets = mapData.tilesets;
          const tilesetImages = [];
          for (let i = 0; i < tilesets.length; i++) {
            const tileset = tilesets[i];
            const tilesetImage = `/assets/${tileset.image}`.replaceAll(
              "../",
              ""
            );
            const tilesetImageResponse = await fetch(tilesetImage);
            if (!tilesetImageResponse.ok) {
              console.error("Failed to fetch tileset image:", tilesetImage);
              continue;
            }
            tilesetImages.push(tilesetImage);
          }
          if (tilesetImages.length === 0) {
            throw new Error("No tilesets found");
          }
          // Create an array of image objects
          const images = await Promise.all(
            tilesetImages.map(async (tilesetImage) => {
              const image = new Image();
              image.src = tilesetImage;
              await new Promise((resolve, reject) => {
                image.onload = resolve;
                image.onerror = reject;
              }).catch((error) => {
                console.error("Error loading image:", error);
              });
              return image;
            })
          );
          const canvas = document.getElementById("game");
          const ctx = canvas.getContext("2d");
          const dpi = window.devicePixelRatio;
          canvas.getContext("2d").scale(dpi, dpi);
          // Disable image smoothing
          ctx.imageSmoothingEnabled = false;
          ctx.mozImageSmoothingEnabled = false;
          ctx.webkitImageSmoothingEnabled = false;
          ctx.msImageSmoothingEnabled = false;
          canvas.width = mapData.width * mapData.tilewidth;
          canvas.height = mapData.height * mapData.tileheight;
          for (let i = 0; i < mapData.layers.length; i++) {
            const layer = mapData.layers[i];
            if (!layer || !layer.data) continue; // Check if layer or layer.data is undefined
            // Check which tileset to use
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
                  // Check if tileIndex is falsy or zero
                  continue;
                }
                const tileX =
                  (tileIndex - tileset.firstgid) % (tilesetWidth / tileWidth);
                const tileY = Math.floor(
                  (tileIndex - tileset.firstgid) / (tilesetWidth / tileWidth)
                );
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
        } catch (error) {
          console.error("Error:", error);
        }
      }
      break;
  }
});