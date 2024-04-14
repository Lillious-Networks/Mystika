const socket = new WebSocket("ws://localhost:3000/");

socket.addEventListener("open", () => {
  const packet = {
    type: "PING",
    data: "Some data",
  };
  socket.send(JSON.stringify(packet));
});

socket.addEventListener("message", (event) => {
  console.log(event.data);
});
