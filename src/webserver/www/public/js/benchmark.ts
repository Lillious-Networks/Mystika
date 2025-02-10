const clients = document.getElementById('clients') as HTMLInputElement;
const clientsLabel = document.getElementById('clients-label') as HTMLLabelElement;
const iterations = document.getElementById('iterations') as HTMLInputElement;
const iterationsLabel = document.getElementById('iterations-label') as HTMLLabelElement;
const data = document.getElementById('data') as HTMLInputElement;
const dataLabel = document.getElementById('data-label') as HTMLLabelElement;
const start = document.getElementById('start') as HTMLButtonElement;
const result = document.getElementById('result') as HTMLParagraphElement;

function createPacket(size: number) {
    // size is in mb
    const data = new Uint8Array(size * 1024 * 1024);
    for (let i = 0; i < data.length; i++) {
        data[i] = Math.floor(Math.random() * 256);
    }
    return data;
}

const packet = {
    decode(data: ArrayBuffer) {
      const decoder = new TextDecoder();
      return decoder.decode(data);
    },
    encode(data: string) {
      const encoder = new TextEncoder();
      return encoder.encode(data);
    },
  };

if (!iterations || !data || !iterationsLabel || !dataLabel || !start || !result || !clients) {
    throw new Error('Element not found');
}

// Function to format data size dynamically
function formatDataSize(valueInBytes: number): string {
    if (valueInBytes < 1024) {
        return `${valueInBytes.toFixed(2)} B`;
    } else if (valueInBytes < 1024 * 1024) {
        return `${(valueInBytes / 1024).toFixed(2)} KB`;
    } else if (valueInBytes < 1024 * 1024 * 1024) {
        return `${(valueInBytes / (1024 * 1024)).toFixed(2)} MB`;
    } else {
        return `${(valueInBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
}

// Helper function to calculate actual data size per message
function calculateDataArrayBytes(dataValueInMB: number, bytesPerElement: number): number {
    const elements = dataValueInMB * 1024 * 1024 / bytesPerElement;
    return elements * bytesPerElement;
}

// Initialize inputs with default values
clients.value = '1';
clientsLabel.innerText = `Clients: ${clients.value}`;
iterations.value = '10';
iterationsLabel.innerText = `Iterations: ${iterations.value}`;
data.value = '0.0001'; // 100 Bytes
const bytesPerElement = 4; // Each array element is 4 bytes
const dataValueInBytes = calculateDataArrayBytes(Number(data.value), bytesPerElement);
dataLabel.innerText = `Data per message: ${formatDataSize(dataValueInBytes)}`;

// Update iterations label on input
iterations.addEventListener('input', () => {
    iterationsLabel.innerText = `Iterations: ${iterations.value}`;
});

// Update data label on input
data.addEventListener('input', () => {
    const dataValueInBytes = calculateDataArrayBytes(Number(data.value), bytesPerElement);
    dataLabel.innerText = `Data per message: ${formatDataSize(dataValueInBytes)}`;
});

// Update clients label on input
clients.addEventListener('input', () => {
    clientsLabel.innerText = `Clients: ${clients.value}`;
});

// Start button logic
const connections = new Map<string, WebSocket[]>();
start.addEventListener('click', async () => {
    result.innerHTML = '';
    const startTime = Date.now();
    let total = 0;

    const clientsValue = parseInt(clients.value);
    const iterationsValue = parseInt(iterations.value);
    const dataValue = parseFloat(data.value);
    const dataArray = createPacket(dataValue);
    const dataArrayBytes = dataArray.byteLength;
    const totalDataBytes = dataArrayBytes * iterationsValue;

    async function createClients(amount: number): Promise<WebSocket[]> {
        const websockets: WebSocket[] = [];
        return new Promise((resolve, reject) => {
            let openedCount = 0;
            for (let i = 0; i < amount; i++) {
                const websocket = new WebSocket('__VAR.WEBSOCKETURL__');
                websocket.binaryType = "arraybuffer";
                websocket.onopen = () => {
                    websockets.push(websocket);
                    openedCount++;
                    result.innerText = `Connected ${openedCount} / ${amount} clients`;
                    if (openedCount === amount) {
                        result.innerText = `Connected ${amount} clients`;
                        resolve(websockets);
                    }
                };
                websocket.onerror = (error) => {
                    reject(error);
                };
            }
        });
    }

    const websockets = await createClients(clientsValue) as WebSocket[];
    websockets.forEach((websocket: WebSocket) => {
        const id = Math.random().toString(36).substring(7);
        connections.set(id, [websocket]);
        let counter = 0;
        (async () => {
            for (let i = 0; i < iterationsValue; i++) {
            await new Promise<void>((resolve) => {
                websocket.send(
                packet.encode(
                    JSON.stringify({
                    type: "BENCHMARK",
                    data: {
                        data: dataArray,
                        id: i
                    }
                    })
                )
                );
                setTimeout(resolve, 100); // Wait for 100ms before resolving the promise
            });
            }
        })();

        websocket.onerror = (error) => {
            console.error("WebSocket error:", error);
            result.innerText = `An error occurred while connecting to the WebSocket.`;
            connections.delete(id);
        };

        websocket.onclose = () => {
            connections.delete(id);
            if (connections.size === 0) {
                const endTime = Date.now();
                const totalTime = (endTime - startTime) / 1000; // Convert milliseconds to seconds
                const averageTimePerMessage = totalTime / total;

                result.innerHTML = `
                    <p>Processed ${total} / ${iterationsValue * clientsValue} messages</p>
                    <p>Connected clients: ${clientsValue}</p>
                    <p>Total data sent: ${formatDataSize(totalDataBytes)}</p>
                    <p>Iterations: ${iterationsValue}</p>
                    <p>Data per message: ${formatDataSize(dataArrayBytes)}</p>
                    <p>Total time elapsed: ${totalTime} s</p>
                    <p>Average time per message: ${Math.round(averageTimePerMessage * 1000)} ms</p>
                `;
            }
        }

        websocket.onmessage = (event: any) => {
            if (!(event.data instanceof ArrayBuffer)) return;
            const type = JSON.parse(packet.decode(event.data))["type"];
            if (type !== 'BENCHMARK') return;
            total++;
            counter++;
            result.innerText = `Received ${total} messages`;
            if (counter >= iterationsValue) {
                websocket.close();
            }
        }
    });
});