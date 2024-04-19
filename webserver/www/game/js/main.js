(async function () {
  // Load websocket script
  const websocket = await fetch("/function?name=websocket");
  if (!websocket.ok) {
    throw new Error(`HTTP error! status: ${websocket.status}`);
  }

  // Get the response
  const response = await websocket.json();
  if (!response || !response.script || !response.hash) {
    throw new Error("No response or script found");
  }

  // Fetch the hash
  const hash = await fetch(`/function/hash?name=websocket`);
  if (!hash.ok) {
    throw new Error(`HTTP error! status: ${hash.status}`);
  }

  // Check the hash
  if (response.hash !== (await hash.json()).hash) {
    throw new Error("Hash mismatch");
  }

  // Execute the function in its own scope
  {
    try {
      new Function(response.script)();
    } catch (error) {
      console.error(error);
    }
  }
})();
