const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));

let drawings = []; // Store all drawing actions on the server

io.on('connection', (socket) => {
    console.log('a user connected');

    // Send existing drawings to the newly connected client
    socket.emit('loadDrawings', drawings);

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });

    socket.on('draw', (data) => {
        drawings.push(data); // Save the drawing action
        socket.broadcast.emit('draw', data);
    });

    socket.on('clear', () => {
        drawings = []; // Clear the drawings
        io.emit('clear');
    });

    socket.on('undo', () => {
        if (drawings.length > 0) {
            drawings.pop(); // Remove the last drawing action
        }
        io.emit('loadDrawings', drawings); // Send the updated drawings to all clients
    });
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});
