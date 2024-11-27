const socket = new WebSocket(`__VAR.WEBSOCKETURL__`);
const players = [] as any[];
const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d");
const playerCanvas = document.getElementById("players") as HTMLCanvasElement;
const playerContext = playerCanvas.getContext("2d");
const currentPlayerCanvas = document.getElementById("current-player") as HTMLCanvasElement;
const currentPlayerContext = currentPlayerCanvas.getContext("2d");
const inventoryUI = document.getElementById("inventory") as HTMLDivElement;
const inventoryGrid = document.getElementById("grid") as HTMLDivElement;
const chatInput = document.getElementById("chat-input") as HTMLInputElement;
const healthBar = document.getElementById(
  "health-progress-bar"
) as HTMLDivElement;
const staminaBar = document.getElementById(
  "stamina-progress-bar"
) as HTMLDivElement;
const map = document.getElementById("map") as HTMLDivElement;
const pauseMenu = document.getElementById(
  "pause-menu-container"
) as HTMLDivElement;
const optionsMenu = document.getElementById(
  "options-menu-container"
) as HTMLDivElement;
const menuElements = ["options-menu-container"];
const fpsSlider = document.getElementById("fps-slider") as HTMLInputElement;
const musicSlider = document.getElementById("music-slider") as HTMLInputElement;
const effectsSlider = document.getElementById("effects-slider") as HTMLInputElement;
const mutedCheckbox = document.getElementById("muted-checkbox") as HTMLInputElement;
const languageSelect = document.getElementById("language") as HTMLSelectElement;
let loaded: boolean = false;
let toggleInventory = false;
const times = [] as number[];
let lastFrameTime = 0; // Track the time of the last frame

function animationLoop() {
  if (!ctx || !playerContext) return;

  // Get the desired frame rate from the slider
  const fpsTarget = parseFloat(fpsSlider.value); // Convert to a number if needed
  const frameDuration = 1000 / fpsTarget; // Duration of each frame in milliseconds

  // Get the current time
  const now = performance.now();

  // If enough time has passed since the last frame, proceed
  if (now - lastFrameTime >= frameDuration) {
    lastFrameTime = now;

    // Clear the canvas
    playerContext.clearRect(0, 0, playerCanvas.width, playerCanvas.height);

    const currentPlayer = players.find(
      (player) => player.id === sessionStorage.getItem("connectionId")
    );
    // All players except the current player
    players.forEach((player) => {
      if (player.id !== sessionStorage.getItem("connectionId")) {
        if(player.isStealth) {
          if (currentPlayer) {
            if (currentPlayer.isAdmin) {
              player.show(playerContext);
            }
          }
        } else {
          player.show(playerContext);
        }
      }
    });

    // Calculate FPS
    while (times.length > 0 && times[0] <= now - 1000) {
      times.shift();
    }
    times.push(now);
  }

  // Request the next frame
  window.requestAnimationFrame(animationLoop);
}

function currentPlayerLoop () {
  if (!ctx || !currentPlayerContext) return;
  currentPlayerContext.clearRect(0, 0, currentPlayerCanvas.width, currentPlayerCanvas.height);
  players.forEach((player) => {
    if (player.id === sessionStorage.getItem("connectionId")) {
      player.show(currentPlayerContext);
    }
  });
  window.requestAnimationFrame(currentPlayerLoop);
}

// Start the animation loops
animationLoop();
currentPlayerLoop();

socket.addEventListener("open", () => {
  const packet = {
    type: "PING",
    data: null,
  };
  socket.send(JSON.stringify(packet));
});

socket.addEventListener("close", () => {
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
      data.forEach((player: any) => {
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
        const mapHash = data[1] as string;
        const mapName = data[2];

        const fetchMap = async () => {
          const response = await fetch(`/map/hash?name=${mapName}`);
          if (!response.ok) {
            throw new Error("Failed to fetch map");
          }
          return response.json();
        };

        const serverMapHashResponse = await fetchMap();
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
          const fetchPromises = tilesets.map(async (tileset: any) => {
            const name = tileset.image.split("/").pop();
            const response = await fetch(`/tileset?name=${name}`);
            if (!response.ok) {
              throw new Error(`Failed to fetch tileset image: ${name}`);
            }
            const data = await response.json();
            return data;
          });

          return Promise.all(fetchPromises);
        };

        const result = await fetchTilesetImages();
        if (result.length === 0) {
          throw new Error("No tileset images found");
        }

        const images = [] as string[];
        for (const r of result) {
          const response = await fetch(`/tileset/hash?name=${r.tileset.name}`);
          if (!response.ok) {
            throw new Error("Failed to fetch tileset hash");
          }
          const data = await response.json();

          if (data.hash !== r.tileset.hash) {
            throw new Error("Tileset hash mismatch");
          }

          const image = new Image();
          image.src = `data:image/png;base64,${r.tileset.data}`;
          await new Promise((resolve) => {
            image.onload = () => resolve(true);
          });
          images.push(image as unknown as string);
        }

        // Optimized drawMap function using batch processing
        async function drawMap(images: string[]) {
          canvas.width = mapData.width * mapData.tilewidth;
          canvas.height = mapData.height * mapData.tileheight;

          playerCanvas.width = mapData.width * mapData.tilewidth;
          playerCanvas.height = mapData.height * mapData.tileheight;

          currentPlayerCanvas.width = playerCanvas.width;
          currentPlayerCanvas.height = playerCanvas.height;

          canvas.style.width = mapData.width * mapData.tilewidth + "px";
          canvas.style.height = mapData.height * mapData.tilewidth + "px";

          playerCanvas.style.width = mapData.width * mapData.tilewidth + "px";
          playerCanvas.style.height = mapData.height * mapData.tilewidth + "px";

          currentPlayerCanvas.style.width = playerCanvas.style.width;
          currentPlayerCanvas.style.height = playerCanvas.style.height;

          if (!ctx) return;
          ctx.imageSmoothingEnabled = false;

          const layers = mapData.layers;
          let currentLayer = 0;

          function processLayer() {
            if (currentLayer >= layers.length) {
              canvas.style.display = "block";
              loaded = true;
              animationLoop();
              return;
            }

            const layer = layers[currentLayer];
            if (!layer || !layer.data) {
              currentLayer++;
              processLayer();
              return;
            }

            const tileset =
              tilesets.find((t: any) => t.firstgid <= layer.data[0]) ||
              tilesets[0];
            const image = images[tilesets.indexOf(tileset)];
            const tileWidth = tileset.tilewidth;
            const tileHeight = tileset.tileheight;
            const tilesetWidth = tileset.imagewidth;

            const batchSize = 5; // Adjust batch size for performance

            function processRowBatch(startY: number) {
              for (
                let y = startY;
                y < startY + batchSize && y < mapData.height;
                y++
              ) {
                for (let x = 0; x < mapData.width; x++) {
                  const tileIndex = layer.data[y * mapData.width + x];
                  if (tileIndex === 0) continue;

                  const tilesPerRow = tilesetWidth / tileWidth;
                  const tileY = Math.floor(
                    (tileIndex - tileset.firstgid) / tilesPerRow
                  );
                  const tileX = (tileIndex - tileset.firstgid) % tilesPerRow;

                  if (!ctx || !image) return;

                  ctx.drawImage(
                    image as unknown as CanvasImageSource,
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

              if (startY + batchSize < mapData.height) {
                setTimeout(() => processRowBatch(startY + batchSize), 0);
              } else {
                currentLayer++;
                processLayer();
              }
            }

            processRowBatch(0);
          }

          processLayer();
        }

        await drawMap(images);
      }
      break;
    case "LOGIN_SUCCESS":
      {
        const connectionId = JSON.parse(event.data)["data"];
        sessionStorage.setItem("connectionId", connectionId); // Store client's socket ID
        const sessionToken = getCookie("token");
        if (!sessionToken) {
          throw new Error("No session token found");
        }
        socket.send(JSON.stringify({ type: "AUTH", data: sessionToken }));
      }
      break;
    case "LOGIN_FAILED":
      {
        window.location.href = "/";
      }
      break;
    case "INVENTORY":
      {
        const data = JSON.parse(event.data)["data"];
        const slots = JSON.parse(event.data)["slots"];
        if (data.length > 0) {
          // Assign each item to a slot
          for (let i = 0; i < data.length; i++) {
            // Create a new item slot
            const slot = document.createElement("div");
            slot.classList.add("slot");
            const item = data[i];
            slot.classList.add(item.quality.toLowerCase() || "empty");
            slot.innerHTML = `${item.item}${
              item.quantity > 1 ? `<br>x${item.quantity}` : ""
            }`;
            inventoryGrid.appendChild(slot);
          }
        }

        for (let i = 0; i < slots - data.length; i++) {
          const slot = document.createElement("div");
          slot.classList.add("slot");
          slot.classList.add("empty");
          inventoryGrid.appendChild(slot);
        }
      }
      break;
    case "CHAT": {
      players.forEach((player) => {
        if (player.id === data.id) {
          player.chat = data.message;
        }
      });
      break;
    }
    case "STATS": {
      // Normalize the health and stamina values to a percentage value with 0-100
      const health = (data.health / data.max_health) * 100;
      const stamina = (data.stamina / data.max_stamina) * 100;
      updateStats(health, stamina);
      break;
    }
    case "CLIENTCONFIG": {
      const data = JSON.parse(event.data)["data"][0];
      fpsSlider.value = data.fps;
      document.getElementById("limit-fps-label")!.innerText = `FPS: (${fpsSlider.value})`;
      musicSlider.value = data.music_volume;
      document.getElementById("music-volume-label")!.innerText = `Music: (${musicSlider.value})`;
      effectsSlider.value = data.effects_volume;
      document.getElementById("effects-volume-label")!.innerText = `Effects: (${effectsSlider.value})`;
      mutedCheckbox.checked = data.muted;
      document.getElementById("muted-checkbox")!.innerText = `Muted: ${mutedCheckbox.checked}`;
      // Update selected language option
      languageSelect.value = data.language;
      break;
    }
    case "SELECTPLAYER": {
      const data = JSON.parse(event.data)["data"];
      if (!data) {
        players.forEach((player) => {
          player.targeted = false;
        });
        break;
      } else {
        players.forEach((player) => {
          if (player.id === data.id) {
            player.targeted = true;
          } else {
            player.targeted = false;
          }
        });
      }
      break;
    }
    case "STEALTH": {
      const data = JSON.parse(event.data)["data"];
      players.forEach((player) => {
        if (player.id === data.id) {
          player.isStealth = data.isStealth;
        }
      });
      break;
    }
    case "UPDATESTATS": {
      const data = JSON.parse(event.data)["data"];
      const target = players.find((player) => player.id === data.target);
      if (!target) return;
      target.stats = data.stats;
      if (target.id === sessionStorage.getItem("connectionId")) {
        updateStats(target.stats.health, target.stats.stamina);
      }
      break;
    }
    case "REVIVE": {
      const data = JSON.parse(event.data)["data"];
      const target = players.find((player) => player.id === data.target);
      if (!target) return;
      target.stats = data.stats;
      if (target.id === sessionStorage.getItem("connectionId")) {
        updateStats(target.stats.health, target.stats.stamina);
      }
      break;
    }
    default:
      break;
  }
});

function getCookie(cname: string) {
  const name = cname + "=";
  const decodedCookie = decodeURIComponent(document.cookie);
  const ca = decodedCookie.split(";");
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
const movementKeys = new Set(["KeyW", "KeyA", "KeyS", "KeyD"]);

window.addEventListener("keydown", (e) => {
  if (!loaded) return;
  if (
    movementKeys.has(e.code) &&
    chatInput !== document.activeElement
  ) {
    if (pauseMenu.style.display == "block") return;
    pressedKeys.add(e.code);
    if (!isKeyPressed) {
      isKeyPressed = true;
      if (!isMoving) {
        handleKeyPress();
      }
    }
  }

  // Open pause menu
  if (e.code === "Escape") {
    if (!loaded) return;
    chatInput.blur();
    if (document.getElementById("pause-menu-container")?.style.display != "block") {
      pauseMenu.style.display = "block"
    } else {
      pauseMenu.style.display = "none";
    }

    for (const element of menuElements) {
      if (document.getElementById(element)?.style.display == "block") {
        const menuElement = document.getElementById(element);
        if (menuElement) {
          menuElement.style.display = "none";
        }
      }
    }
  }

  // Open inventory UI
  if (e.code === "KeyB") {
    if (!loaded) return;
    if (chatInput === document.activeElement) return;
    if (pauseMenu.style.display == "block") return;
    if (toggleInventory) {
      inventoryUI.style.transition = "1s";
      inventoryUI.style.right = "-350";
      toggleInventory = false;
    } else {
      inventoryUI.style.transition = "1s";
      inventoryUI.style.right = "10";
      toggleInventory = true;
    }
  }

  if (e.code === "KeyX") {
    if (!loaded) return;
    if (chatInput === document.activeElement) return;
    if (pauseMenu.style.display == "block") return;
    socket.send(JSON.stringify({ type: "STEALTH", data: null }));
  }

  if (e.code === "Enter" && chatInput !== document.activeElement) {
    if (pauseMenu.style.display == "block") return;
    chatInput.focus();
  } else if (e.code === "Enter" && chatInput == document.activeElement) {
    if (pauseMenu.style.display == "block") return;
    if (!chatInput?.value) return;
    if (chatInput.value.trim() === "") return;
    socket.send(
      JSON.stringify({
        type: "CHAT",
        data: chatInput.value.trim().toString() || " ",
      })
    );
    const previousMessage = chatInput.value.trim();
    if (previousMessage === "") return;

    setTimeout(() => {
      // Check if the chat is still the same value
      players.forEach((player) => {
        if (player.id === sessionStorage.getItem("connectionId")) {
          if (player.chat === previousMessage) {
            socket.send(
              JSON.stringify({
                type: "CHAT",
                data: " ",
              })
            );
          }
        }
      });
    }, 7000 + chatInput.value.length * 35);
    chatInput.value = "";
    chatInput.blur();
  }

  if (e.code === "Space") {
    const target = players.find((player) => player.targeted);
    if (!target) return;
    socket.send(
      JSON.stringify({
        type: "ATTACK",
        data: target,
      })
    );
  }
});

// Listen for keyup events to stop movement
window.addEventListener("keyup", (e) => {
  if (chatInput === document.activeElement) return;
  if (movementKeys.has(e.code)) {
    pressedKeys.delete(e.code);
    if (pressedKeys.size === 0) {
      isKeyPressed = false;
    }
  }
});

function handleKeyPress() {
  if (isMoving) return;
  // const currentPlayer = players.find(
  //   (player) => player.id === sessionStorage.getItem("connectionId")
  // );

  isMoving = true;
  const interval = setInterval(() => {
    if (!isKeyPressed) {
      clearInterval(interval);
      isMoving = false;
      return;
    }

    // Only send directional instructions to the server for calculations

    // Check if more than one key is pressed
    if (pressedKeys.size > 1) {
      if (pressedKeys.has("KeyW") && pressedKeys.has("KeyA")) {
        socket.send(
          JSON.stringify({
            type: "MOVEXY",
            data: "UPLEFT",
          })
        );
      }
      else if (pressedKeys.has("KeyW") && pressedKeys.has("KeyD")) {
        socket.send(
          JSON.stringify({
            type: "MOVEXY",
            data: "UPRIGHT",
          })
        );
      }
      else if (pressedKeys.has("KeyS") && pressedKeys.has("KeyA")) {
        socket.send(
          JSON.stringify({
            type: "MOVEXY",
            data: "DOWNLEFT",
          })
        );
      }
      else if (pressedKeys.has("KeyS") && pressedKeys.has("KeyD")) {
        socket.send(
          JSON.stringify({
            type: "MOVEXY",
            data: "DOWNRIGHT",
          })
        );
      }
    } else {
      if (pressedKeys.has("KeyW")) {
        socket.send(
          JSON.stringify({
            type: "MOVEXY",
            data: "UP",
          })
        );
      }
      else if (pressedKeys.has("KeyS")) {
        socket.send(
          JSON.stringify({
            type: "MOVEXY",
            data: "DOWN",
          })
        );
      }
      else if (pressedKeys.has("KeyA")) {
        socket.send(
          JSON.stringify({
            type: "MOVEXY",
            data: "LEFT",
          })
        );
      }
      else if (pressedKeys.has("KeyD")) {
        socket.send(
          JSON.stringify({
            type: "MOVEXY",
            data: "RIGHT",
          })
        );
      }
    }
  }, 10);
}

async function isLoaded() {
  // Check every second if the map is loaded
  await new Promise<void>((resolve) => {
    const interval = setInterval(() => {
      if (loaded) {
        clearInterval(interval);
        const loadingScreen = document.getElementById("loading-screen");
        if (loadingScreen) {
          // Fade out the loading screen after the map is loaded
          loadingScreen.style.transition = "1s";
          loadingScreen.style.opacity = "0";
          setTimeout(() => {
            loadingScreen.style.display = "none";
          }, 1000);
        }
        resolve();
      }
    }, 100);
  });
}

function createPlayer(data: any) {
  const player = {
    id: data.id,
    position: {
      x: playerCanvas.width / 2 + data.location.x,
      y: playerCanvas.height / 2 + data.location.y,
    },
    chat: "",
    isStealth: data.isStealth,
    isAdmin: data.isAdmin,
    targeted: false,
    stats: data.stats,
    show: function (context: CanvasRenderingContext2D) {
      context.fillStyle = "white";
      // Opacity for stealth mode
      if (this.isStealth) {
        context.globalAlpha = 0.5;
      } else {
        context.globalAlpha = 1;
      }

      context.fillRect(this.position.x, this.position.y, 32, 48);

      // Draw the player's username
      context.font = "14px Arial";
      context.textAlign = "center";

      // Current player
      if (data.id === sessionStorage.getItem("connectionId")) {
        context.fillStyle = "#ffe561";
      } else {
        if (this.targeted) {
          context.fillStyle = "#ff0000";
        } else {
          context.fillStyle = "#ffffff";
        }
      }

      context.shadowColor = "black";
      context.shadowBlur = 5;
      context.shadowOffsetX = 0;
      context.strokeStyle = "black";
      // Uppercase the first letter of the username
      data.username =
        data.username.charAt(0).toUpperCase() + data.username.slice(1);
      // Display (Admin) tag if the player is an admin
      if (data.isAdmin) {
        context.strokeText(
          data.username + " (Admin)",
          this.position.x + 16,
          this.position.y + 65
        );
        context.fillText(
          data.username + " (Admin)",
          this.position.x + 16,
          this.position.y + 65
        );
      } else {
        context.strokeText(
          data.username,
          this.position.x + 16,
          this.position.y + 65
        );
        context.fillText(
          data.username,
          this.position.x + 16,
          this.position.y + 65
        );
      }

      // Draw the player's chat message
      context.fillStyle = "black";
      context.fillStyle = "white";
      context.font = "14px Arial";
      context.textAlign = "center";
      if (this.chat) {
        if (this.chat.trim() !== "") {
          const lines = getLines(context, this.chat, 500).reverse();
          let startingPosition = this.position.y;
  
          for (let i = 0; i < lines.length; i++) {
            startingPosition -= 15;
            context.fillText(lines[i], this.position.x + 16, startingPosition);
          }
        }
      }

      // Draw a green line from center in the directions up, down, left, and right
      context.strokeStyle = "blue";
      context.beginPath();
      // Direction: Up
      context.moveTo(this.position.x + 16, this.position.y + 24);
      context.lineTo(this.position.x + 16, this.position.y);
      context.stroke();
      context.strokeStyle = "yellow";
      context.beginPath();
      // Direction: Down
      context.moveTo(this.position.x + 16, this.position.y + 24);
      context.lineTo(this.position.x + 16, this.position.y + 48);
      context.stroke();
      context.strokeStyle = "red";
      context.beginPath();
      // Direction: Left
      context.moveTo(this.position.x + 16, this.position.y + 24);
      context.lineTo(this.position.x, this.position.y + 24);
      context.stroke();
      context.strokeStyle = "green";
      context.beginPath();
      // Direction: Right
      context.moveTo(this.position.x + 16, this.position.y + 24);
      context.lineTo(this.position.x + 32, this.position.y + 24);
      context.stroke();
      // show purple dot at center of player
      context.fillStyle = "purple";
      context.beginPath();
      context.arc(this.position.x + 16, this.position.y + 24, 2, 0, 2 * Math.PI);
      context.fill();

      // Draw the player's health bar below the player's name with a width of 100px, centered below the player name
      context.fillStyle = "black";
      context.fillRect(this.position.x - 34, this.position.y + 70, 100, 10);
      context.fillStyle = "green";
      context.fillRect(
        this.position.x - 34,
        this.position.y + 70,
        (this.stats.health / this.stats.max_health) * 100,
        10
      );
    },
  };

  // Current player
  if (data.id === sessionStorage.getItem("connectionId")) {
    window.scrollTo(
      player.position.x - window.innerWidth / 2 + 32,
      player.position.y - window.innerHeight / 2 + 48
    );
  }
  players.push(player);
}

function getLines(ctx: any, text: string, maxWidth: number) {
  const words = text.split(" ");
  const lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + " " + word).width;
    if (width < maxWidth) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
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

function updateStats(health: number, stamina: number) {
  healthBar.removeAttribute("class");
  healthBar.style.width = `${health}%`;
  staminaBar.style.width = `${stamina}%`;
  if (health >= 80) {
    healthBar.classList.add("green");
    return;
  }
  if (health >= 50 && health < 80) {
    healthBar.classList.add("yellow");
    return;
  }
  if (health >= 30 && health < 50) {
    healthBar.classList.add("orange");
    return;
  }
  if (health < 30) {
    healthBar.classList.add("red");
    return;
  }
}

async function updateMiniMap() {
  // Check if there is already a minimap image
  const image = map.querySelector("img");

  // Create a temporary canvas for the minimap
  const tempCanvas = document.createElement("canvas");
  const context = tempCanvas.getContext("2d");

  if (!context) return;

  // Set the minimap size
  const minimapWidth = 200; // Set to your desired minimap width
  const minimapHeight = 200; // Set to your desired minimap height
  tempCanvas.width = minimapWidth;
  tempCanvas.height = minimapHeight;

  // Get the current player's position
  const currentPlayer = players.find(
    (player) => player.id === sessionStorage.getItem("connectionId")
  );

  if (!currentPlayer) return;

  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;

  // Calculate the cropping region centered around the current player
  const scale = 5; // Scale factor for the minimap
  const cropWidth = minimapWidth * scale;
  const cropHeight = minimapHeight * scale;

  // Ensure the player stays centered in the minimap
  const cropX = Math.max(
    0,
    Math.min(currentPlayer.position.x - cropWidth / 2, canvasWidth - cropWidth)
  );
  const cropY = Math.max(
    0,
    Math.min(
      currentPlayer.position.y - cropHeight / 2,
      canvasHeight - cropHeight
    )
  );

  // Draw the cropped and scaled-down region of the canvas to the minimap
  context.drawImage(
    canvas, // Source canvas
    cropX, // Crop start X
    cropY, // Crop start Y
    cropWidth, // Crop width
    cropHeight, // Crop height
    0, // Destination X
    0, // Destination Y
    minimapWidth, // Destination width
    minimapHeight // Destination height
  );

  // Generate the data URL for the minimap
  const dataUrl = tempCanvas.toDataURL("image/png");

  if (image) {
    image.src = dataUrl;
  } else {
    const newImage = new Image();
    newImage.src = dataUrl;
    map.appendChild(newImage);
  }
}

// Update minimap less frequently to avoid freezing
const updateInterval = 150; // Update every 150ms

setTimeout(() => {
  const updateLoop = () => {
    updateMiniMap();
    setTimeout(updateLoop, updateInterval);
  };
  updateLoop();
}, 1000);

document
  .getElementById("pause-menu-action-back")
  ?.addEventListener("click", () => {
    pauseMenu.style.display = "none";
  });

document
  .getElementById("pause-menu-action-options")
  ?.addEventListener("click", () => {
    // If any other menu is open, close all other menus

    pauseMenu.style.display = "none";
    optionsMenu.style.display = "block";
  });

document
  .getElementById("pause-menu-action-exit")
  ?.addEventListener("click", () => {
    socket.send(
      JSON.stringify({
        type: "LOGOUT",
        data: null,
      })
    );
    window.location.href = "/";
  });

fpsSlider.addEventListener("input", () => {
  document.getElementById("limit-fps-label")!.innerText = `FPS: (${fpsSlider.value})`;
});

musicSlider.addEventListener("input", () => {
  document.getElementById("music-volume-label")!.innerText = `Music: (${musicSlider.value})`;
});

effectsSlider.addEventListener("input", () => {
  document.getElementById("effects-volume-label")!.innerText = `Effects: (${effectsSlider.value})`;
});

fpsSlider.addEventListener("change", () => {
  socket.send(
    JSON.stringify({
      type: "CLIENTCONFIG",
      data: {
        fps: parseInt(fpsSlider.value),
        music_volume: parseInt(musicSlider.value),
        effects_volume: parseInt(effectsSlider.value),
        muted: mutedCheckbox.checked,
        language: languageSelect.value,
      } as ConfigData,
    })
  );
});

musicSlider.addEventListener("change", () => {
  socket.send(
    JSON.stringify({
      type: "CLIENTCONFIG",
      data: {
        fps: parseInt(fpsSlider.value),
        music_volume: parseInt(musicSlider.value),
        effects_volume: parseInt(effectsSlider.value),
        muted: mutedCheckbox.checked,
        language: languageSelect.value,
      } as ConfigData,
    })
  );
});

effectsSlider.addEventListener("change", () => {
  socket.send(
    JSON.stringify({
      type: "CLIENTCONFIG",
      data: {
        fps: parseInt(fpsSlider.value),
        music_volume: parseInt(musicSlider.value),
        effects_volume: parseInt(effectsSlider.value),
        muted: mutedCheckbox.checked,
        language: languageSelect.value,
      } as ConfigData,
    })
  );
});

mutedCheckbox.addEventListener("change", () => {
  socket.send(
    JSON.stringify({
      type: "CLIENTCONFIG",
      data: {
        fps: parseInt(fpsSlider.value),
        music_volume: parseInt(musicSlider.value),
        effects_volume: parseInt(effectsSlider.value),
        muted: mutedCheckbox.checked,
        language: languageSelect.value,
      } as ConfigData,
    })
  );
});

languageSelect.addEventListener("change", () => {
  socket.send(
    JSON.stringify({
      type: "CLIENTCONFIG",
      data: {
        fps: parseInt(fpsSlider.value),
        music_volume: parseInt(musicSlider.value),
        effects_volume: parseInt(effectsSlider.value),
        muted: mutedCheckbox.checked,
        language: languageSelect.value,
      } as ConfigData,
    })
  );
});

// Capture click and get coordinates from canvas
document.addEventListener("contextmenu", (event) => {
  if (!loaded) return;
  // Check where we clicked on the canvas
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const moveX = x - playerCanvas.width / 2 - 16;
  const moveY = y - playerCanvas.height / 2 - 24;
  socket.send(
    JSON.stringify({
      type: "TELEPORTXY",
      data: { x: moveX, y: moveY },
    })
  );
});

document.addEventListener("click", (event) => {
  // Check if we clicked on a player
  if (!loaded) return;
  if ((event.target as HTMLElement)?.classList.contains("ui")) return;
  if ((event.target as HTMLElement)?.id != "players") return;

  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const moveX = x - playerCanvas.width / 2 - 16;
  const moveY = y - playerCanvas.height / 2 - 24;

  socket.send(
    JSON.stringify({
      type: "SELECTPLAYER",
      data: { x: moveX, y: moveY },
    })
  );
});

// function updateLocalPosition(player: any, direction: string) {
//   const speed = 5; // Define movement speed
//   switch (direction) {
//     case "UP":
//       player.position.y -= speed;
//       player.position.direction = "up";
//       break;
//     case "DOWN":
//       player.position.y += speed;
//       player.position.direction = "down";
//       break;
//     case "LEFT":
//       player.position.x -= speed;
//       player.position.direction = "left";
//       break;
//     case "RIGHT":
//       player.position.x += speed;
//       player.position.direction = "right";
//       break;
//   }

//   window.scrollTo(
//     player.position.x - window.innerWidth / 2 + 32,
//     player.position.y - window.innerHeight / 2 + 48
//   );
// }