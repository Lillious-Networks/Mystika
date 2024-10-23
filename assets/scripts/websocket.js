const socket = new WebSocket(`ws://localhost:3000/`);
const players = [];
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const playerCanvas = document.getElementById("players");
const playerContext = playerCanvas.getContext("2d");
let loaded;

function animationLoop() {
  // Clear the canvas
  playerContext.clearRect(0, 0, playerCanvas.width, playerCanvas.height);
  playerContext.width = window.innerWidth;
  playerContext.height = window.innerHeight;

  // Render all players
  players.forEach((player) => {
    player.show(playerContext);
  });

  requestAnimationFrame(animationLoop);
}

animationLoop();

socket.addEventListener("open", (ws) => {
  const packet = {
    type: "PING",
    data: null,
  };
  socket.send(JSON.stringify(packet));
});

socket.addEventListener("close", (ws) => {
  window.location.href = "/";
});

socket.addEventListener("message", async (event) => {
  const data = JSON.parse(event.data)["data"];
  const type = JSON.parse(event.data)["type"];
  switch (type) {
    case "PONG":
      socket.send(JSON.stringify({ type: "LOGIN", data: null }));
      break;

    case "TIME_SYNC": {
      setTimeout(() => {
        socket.send(
          JSON.stringify({
            type: "TIME_SYNC",
            data: JSON.parse(event.data)["data"],
          })
        );
      }, 5000);
      break;
    }
    case "SPAWN_PLAYER": {
      await isLoaded();
      createPlayer(data);
      break;
    }
    case "LOAD_PLAYERS": {
      await isLoaded();
      if (!data) return;
      data.forEach((player) => {
        if (player.id != sessionStorage.getItem("connectionId")) {
          // Check if the player is already created and remove it
          players.forEach((p, index) => {
            if (p.id === player.id) {
              players.splice(index, 1);
            }
          });
          createPlayer(player);
        }
      });
      break;
    }
    case "DISCONNECT_PLAYER": {
      console.log("Player disconnected: " + data);
      players.forEach((player, index) => {
        if (player.id === data) {
          players.splice(index, 1);
        }
      });
      break;
    }
    case "MOVEXY": {
      const player = players.find((player) => player.id === data.id);
      if (!player) return;
      player.position.x = playerCanvas.width / 2 + data._data.x;
      player.position.y = playerCanvas.height / 2 + data._data.y;
      // If the player is the client, scroll to the player's position
      if (data.id == sessionStorage.getItem("connectionId")) {
        window.scrollTo(
          player.position.x - window.innerWidth / 2 + 32,
          player.position.y - window.innerHeight / 2 + 48
        );
      }
      break;
    }
    case "LOAD_MAP":
      {
        const mapData = data[0];
        const mapHash = data[1];
        const mapName = data[2];
        const position = data[3];
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
          canvas.width = mapData.width * mapData.tilewidth;
          canvas.height = mapData.height * mapData.tileheight;
          playerCanvas.width = mapData.width * mapData.tilewidth;
          playerCanvas.height = mapData.height * mapData.tileheight;
          canvas.style.width = mapData.width * mapData.tilewidth + "px";
          canvas.style.height = mapData.height * mapData.tileheight + "px";
          playerCanvas.style.width = mapData.width * mapData.tilewidth + "px";
          playerCanvas.style.height = mapData.height * mapData.tileheight + "px";
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
                if (tileIndex == 0) {
                  continue; // Skip drawing if tileIndex is 0
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
          loaded = true;
        }
      }
      break;
    case "LOGIN_SUCCESS":
      const connectionId = JSON.parse(event.data)["data"];
      sessionStorage.setItem("connectionId", connectionId); // Store client's socket ID
      const sessionToken = getCookie("token");
      if (!sessionToken) {
        throw new Error("No session token found");
      }
      socket.send(JSON.stringify({ type: "AUTH", data: sessionToken }));
      break;
    case "LOGIN_FAILED":
      window.location.href = "/";
      break;
  }
});

function getCookie(cname) {
  let name = cname + "=";
  let decodedCookie = decodeURIComponent(document.cookie);
  let ca = decodedCookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == " ") {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

let isKeyPressed = false;
let isMoving = false;
const pressedKeys = new Set();
const movementKeys = new Set(["w", "a", "s", "d"]);

window.addEventListener("keydown", (e) => {
  const clientSocketId = sessionStorage.getItem("connectionId");
  const player = players.find((player) => player.id === clientSocketId);
  if (!player) return;

  if (movementKeys.has(e.key.toLowerCase())) {
    pressedKeys.add(e.key.toLowerCase());
    if (!isKeyPressed) {
      isKeyPressed = true;
      if (!isMoving) {
        handleKeyPress(player);
      }
    }
  }
});

// Listen for keyup events to stop movement
window.addEventListener("keyup", (event) => {
  if (movementKeys.has(event.key.toLowerCase())) {
    pressedKeys.delete(event.key.toLowerCase());
    if (pressedKeys.size === 0) {
      isKeyPressed = false;
    }
  }
});

function handleKeyPress() {
  if (isMoving) return;
  isMoving = true;
  const interval = setInterval(() => {
    if (!isKeyPressed) {
      clearInterval(interval);
      isMoving = false;
      return;
    }

    // Only send directional instructions to the server for calculations

    if (pressedKeys.has("w")) {
      socket.send(
        JSON.stringify({
          type: "MOVEXY",
          data: "UP",
        })
      );
    }
    if (pressedKeys.has("s")) {
      socket.send(
        JSON.stringify({
          type: "MOVEXY",
          data: "DOWN",
        })
      );
    }
    if (pressedKeys.has("a")) {
      socket.send(
        JSON.stringify({
          type: "MOVEXY",
          data: "LEFT",
        })
      );
    }
    if (pressedKeys.has("d")) {
      socket.send(
        JSON.stringify({
          type: "MOVEXY",
          data: "RIGHT",
        })
      );
    }
  }, 0); 
}

async function isLoaded() {
  // Check every second if the map is loaded
  await new Promise((resolve) => {
    const interval = setInterval(() => {
      if (loaded) {
        clearInterval(interval);
        resolve();
      }
    }, 100);
  });
}

function createPlayer(data) {
  let player = {
    id: data.id,
    position: {
      x: playerCanvas.width / 2 + data.location.x,
      y: playerCanvas.height / 2 + data.location.y,
    },
    speed: 5,
    show: function (context) {
      context.fillStyle = "white";
      context.fillRect(this.position.x, this.position.y, 32, 48);
    }
  };

  if (data.id === sessionStorage.getItem("connectionId")) {
    player.move = function (dx, dy) {
      this.position.x += dx;
      this.position.y += dy;
    };
    window.scrollTo(
      player.position.x - window.innerWidth / 2 + 32,
      player.position.y - window.innerHeight / 2 + 48
    );
  }
  players.push(player);
}

// Snap to player's position on resize
window.addEventListener("resize", () => {
  const clientSocketId = sessionStorage.getItem("connectionId");
  players.forEach((player) => {
    if (player.id === clientSocketId) {
      window.scrollTo(
        player.position.x - window.innerWidth / 2 + 32,
        player.position.y - window.innerHeight / 2 + 48
      );
    }
  });
});

// Prevent unfocusing the window
window.addEventListener("blur", () => {
  isKeyPressed = false;
  // Clear the pressedKeys set
  pressedKeys.clear();
});
