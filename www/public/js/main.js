const socket = new WebSocket("ws://localhost:3000/");

socket.addEventListener("open", () => {
  const packet = {
    type: "PING",
    data: "Some data",
  };
  setInterval(() => {
    socket.send(JSON.stringify(packet));
  }, 50);
});

socket.addEventListener("message", (event) => {
  console.log(event.data);
});
