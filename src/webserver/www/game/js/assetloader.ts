// Get scriptfile from server
async function getScriptFunction(scriptname: string) {
  const res = await fetch(`/function?name=${scriptname}`) as any;
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }

  const res_json = await res.json();
  if (!res_json || !res_json.script || !res_json.hash) {
    throw new Error("No response or script found");
  }

  return res_json;
}

// Get hash of scriptfile from server
async function getScriptFunctionHash(scriptname: string) {
  const res = await fetch(`/function/hash?name=${scriptname}`) as any;
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  const res_json = await res.json();
  if (!res_json || !res_json.hash) {
    throw new Error("No response or scripthash found");
  }
  return res_json.hash;
}

// Check the hash
function validateHash(hashA: string, hashB: string) {
  if (hashA !== hashB) {
    throw new Error("Hash mismatch"); // TODO return false intead and/or report back to server about the issue?
  }
  return true;
}

async function loadScripts(scripts: string[]) {
  let unloadedScripts = scripts.map(async x => {
    const script = await getScriptFunction(x)
    const hash = await getScriptFunctionHash(x)
    if (validateHash(script.hash, hash)) {
      return script;
    }
  });

  (await Promise.all(unloadedScripts)).forEach(script => {
    // Load the script
    console.debug(`Loading script "${script.name}"...`);
    const loadedScript = new Function(script.script)();
  })
}

(async function () {
  // Execute all functions in their own scope
  {/*--Start of Scope--*/
    try {
      await loadScripts([
        "packets",
        "websocket"
      ]);
    } catch (error) {
      console.error(error);
    }
  /*--End of Scope--*/}
})();