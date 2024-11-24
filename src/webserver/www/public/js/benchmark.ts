const iterations = document.getElementById('iterations') as HTMLInputElement;
const iterationsLabel = document.getElementById('iterations-label') as HTMLLabelElement;
const data = document.getElementById('data') as HTMLInputElement;
const dataLabel = document.getElementById('data-label') as HTMLLabelElement;
const start = document.getElementById('start') as HTMLButtonElement;
const result = document.getElementById('result') as HTMLParagraphElement;

if (!iterations || !data || !iterationsLabel || !dataLabel || !start || !result) {
    throw new Error('Element not found');
}

// Function to format data size dynamically
function formatDataSize(valueInBytes: number): string {
    if (valueInBytes < 1024) {
        return `${valueInBytes} B`;
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
iterations.value = '100';
iterationsLabel.innerText = `Iterations: ${iterations.value}`;
data.value = '1'; // Default 1 MB
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

// Start button logic
start.addEventListener('click', async () => {
    const iterationsValue = parseInt(iterations.value);
    const dataValue = parseFloat(data.value);
    const dataArray = new Array(dataValue * 1024 * 1024 / bytesPerElement).fill(0); // Array size in elements
    const dataArrayBytes = dataArray.length * bytesPerElement; // Total bytes per message
    const totalDataBytes = iterationsValue * dataArrayBytes; // Total data sent

    const websocket = new WebSocket('ws://localhost:3000');

    websocket.onopen = () => {
        for (let i = 0; i < iterationsValue; i++) {
            websocket.send(
                JSON.stringify({
                    type: "BENCHMARK",
                    data: {
                        data: dataArray,
                        id: i
                    }
                })
            );
        }
    };

    websocket.onerror = (error) => {
        console.error("WebSocket error:", error);
        result.innerText = `An error occurred while connecting to the WebSocket.`;
    };

    const startTime = Date.now();
    let count = 0;

    websocket.onmessage = () => {
        count++;
        if (count === iterationsValue) {
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            const averageTimePerMessage = totalTime / iterationsValue;

            result.innerHTML = `
                <p>Total data sent: ${formatDataSize(totalDataBytes)}</p>
                <p>Iterations: ${iterationsValue}</p>
                <p>Data per message: ${formatDataSize(dataArrayBytes)}</p>
                <p>Total time: ${totalTime} ms</p>
                <p>Average time per message: ${averageTimePerMessage.toFixed(2)} ms</p>
            `;
            console.log(`Sent ${iterationsValue} messages in ${totalTime}ms`);
            websocket.close();
        }
    };
});
