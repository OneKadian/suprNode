const express = require("express");
const cors = require("cors");
const http = require("http");
const app = express();
let dotenv = require("dotenv");
dotenv.config();

const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.use(cors());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.get("/", (req, res) => {
  res.send("hello");
});

let rooms = [];
const Port = process.env.PORT || 4000;

io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("joinRoom", (data) => {
    console.log("joined room", data.roomId);
    socket.join(data.roomId);
    const elements = rooms.find((element) => element.roomId === data.roomId);
    if (elements) {
      io.to(socket.id).emit("updateCanvas", elements);
      elements.user = [...elements.user, socket.id];
    } else {
      rooms.push({
        roomId: data.roomId,
        updatedElements: [],
        user: [socket.id],
        canvasColor: "#121212",
      });
    }
  });

  socket.on("leaveRoom", (data) => {
    console.log("left room", data.roomId);
    socket.leave(data.roomId);
    rooms = rooms.map((room) => {
      if (room.roomId === data.roomId) {
        return {
          ...room,
          user: room.user.filter((id) => id !== socket.id),
        };
      }
      return room;
    });

    // Clean up empty rooms
    rooms = rooms.filter((room) => room.user.length > 0);
  });

  socket.on("updateCanvas", (data) => {
    socket.to(data.roomId).emit("updateCanvas", data);
    const elements = rooms.find((element) => element.roomId === data.roomId);
    if (elements) {
      elements.updatedElements = data.updatedElements;
      elements.canvasColor = data.canvasColor;
    }
  });

  socket.on("sendMessage", (data) => {
    socket.to(data.roomId).emit("getMessage", data);
    io.to(socket.id).emit("getMessage", data);
  });

  socket.on("pong", () => {
    setTimeout(() => {
      socket.emit("ping");
    }, 120000);
  });

  socket.on("disconnect", () => {
    rooms.forEach((element) => {
      element.user = element.user.filter((user) => user !== socket.id);
    });
    rooms = rooms.filter((room) => room.user.length > 0);
  });
});

server.listen(Port, () => {
  console.log(`listening on *:${Port}`);
});
