(async function () {
  // Load websocket script
  const websocket = await fetch("/function?name=websocket");
  if (!websocket.ok) {
    throw new Error(`HTTP error! status: ${websocket.status}`);
  }

  // Get the websocket_response
  const websocket_response = await websocket.json();
  if (!websocket_response || !websocket_response.script || !websocket_response.hash) {
    throw new Error("No websocket_response or script found");
  }

  // Fetch the hash
  const websocket_hash = await fetch(`/function/hash?name=websocket`);
  if (!websocket_hash.ok) {
    throw new Error(`HTTP error! status: ${websocket_hash.status}`);
  }

  // Check the hash
  if (websocket_response.hash !== (await websocket_hash.json()).hash) {
    throw new Error("Hash mismatch");
  }

  // Execute all functions in their own scope
  {
    try {
      new Function(websocket_response.script)();
    } catch (error) {
      console.error(error);
    }
  }
})();