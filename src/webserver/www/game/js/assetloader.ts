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
  const unloadedScripts = scripts.map(async (s) => {
    const script = await getScriptFunction(s);
    const hash = await getScriptFunctionHash(s);
    if (validateHash(script.hash, hash)) {
      return script;
    }
  });

  // Load the script
  (await Promise.all(unloadedScripts)).forEach((ls) => {
    console.debug(`Loading script "${ls.name}"...`);
    new Function(ls.script)();
  })
}

(async function () {
  // Execute all functions in their own scope
  {/*--Start of Scope--*/
    try {
      await loadScripts([
        "packets",
        "websocket",
        "gamepad",
      ]);
    } catch (error) {
      console.error(error);
    }
  /*--End of Scope--*/}
})();