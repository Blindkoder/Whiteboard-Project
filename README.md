# Whiteboard-Project
This is a real-time collaborative whiteboard application that allows multiple users to draw on a shared canvas simultaneously. The application supports basic drawing functionalities including pencil, line, rectangle, delete (clear), undo, and color picker tools.

Features
Real-time Collaboration: Multiple users can draw on the whiteboard simultaneously and see each other's updates in real time.
Drawing Tools: Includes pencil, line, and rectangle drawing tools.
Color Picker: Allows users to choose different colors for drawing.
Undo: Users can undo the last drawing action.
Clear: Users can clear the entire canvas.
Getting Started
Prerequisites
Node.js
npm (Node Package Manager)
Installation
Clone the repository:

bash
Copy code
git clone https://github.com/yourusername/whiteboard-app.git
cd whiteboard-app
Install dependencies:

bash
Copy code
npm install
Running the Application
Start the server:

bash
Copy code
node server.js
Open your web browser and navigate to:

arduino
Copy code
http://localhost:3000
To test real-time collaboration, open multiple tabs/windows with the same URL (http://localhost:3000).

Project Structure
server.js: The main server file that sets up the Express server and Socket.io for real-time communication.
public/index.html: The main HTML file for the client-side interface.
public/app.js: The main JavaScript file for handling client-side logic and Socket.io events.
public/styles.css: The main CSS file for styling the application.
Code Explanation
Server (server.js)
javascript
Copy code
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
Client (public/app.js)
javascript
Copy code
const canvas = document.getElementById('whiteboard');
const ctx = canvas.getContext('2d');
const socket = io();

canvas.width = window.innerWidth;
canvas.height = window.innerHeight - document.getElementById('toolbar').offsetHeight;

let drawing = false;
let tool = 'pencil';
let color = '#000000';
let startX, startY;

document.getElementById('pencil').addEventListener('click', () => tool = 'pencil');
document.getElementById('line').addEventListener('click', () => tool = 'line');
document.getElementById('rectangle').addEventListener('click', () => tool = 'rectangle');
document.getElementById('colorPicker').addEventListener('change', (e) => color = e.target.value);
document.getElementById('delete').addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    socket.emit('clear');
});
document.getElementById('undo').addEventListener('click', () => {
    socket.emit('undo');
});

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mousemove', draw);

function startDrawing(e) {
    drawing = true;
    startX = e.clientX;
    startY = e.clientY;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    socket.emit('draw', { tool, color, startX, startY, type: 'start' });
}

function stopDrawing(e) {
    drawing = false;
    ctx.closePath();

    if (tool === 'line' || tool === 'rectangle') {
        socket.emit('draw', { tool, color, startX, startY, x: e.clientX, y: e.clientY, type: 'end' });
    }
}

function draw(e) {
    if (!drawing) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    if (tool === 'pencil') {
        ctx.lineTo(e.clientX, e.clientY);
        ctx.stroke();
        socket.emit('draw', { tool, color, x: e.clientX, y: e.clientY, type: 'draw' });
    } else if (tool === 'line') {
        redraw();
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(e.clientX, e.clientY);
        ctx.stroke();
    } else if (tool === 'rectangle') {
        redraw();
        ctx.beginPath();
        const width = e.clientX - startX;
        const height = e.clientY - startY;
        ctx.rect(startX, startY, width, height);
        ctx.stroke();
    }
}

function redraw(drawings) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawings.forEach(d => {
        ctx.strokeStyle = d.color;
        ctx.lineWidth = 2;
        if (d.tool === 'pencil') {
            ctx.lineTo(d.x, d.y);
            ctx.stroke();
        } else if (d.tool === 'line') {
            ctx.beginPath();
            ctx.moveTo(d.startX, d.startY);
            ctx.lineTo(d.x, d.y);
            ctx.stroke();
        } else if (d.tool === 'rectangle') {
            ctx.beginPath();
            const width = d.x - d.startX;
            const height = d.y - d.startY;
            ctx.rect(d.startX, d.startY, width, height);
            ctx.stroke();
        }
    });
}

socket.on('draw', (data) => {
    ctx.strokeStyle = data.color;
    ctx.lineWidth = 2;

    if (data.type === 'start') {
        ctx.beginPath();
        ctx.moveTo(data.startX, data.startY);
    } else if (data.type === 'draw') {
        if (data.tool === 'pencil') {
            ctx.lineTo(data.x, data.y);
            ctx.stroke();
        }
    } else if (data.type === 'end') {
        redraw(drawings);
    }
});

socket.on('clear', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

socket.on('undo', () => {
    // no direct implementation needed since server emits loadDrawings after undo
});

socket.on('loadDrawings', (drawings) => {
    redraw(drawings);
});
Client (public/index.html)
html
Copy code
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Virtual Whiteboard</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div id="toolbar">
        <button id="pencil">Pencil</button>
        <button id="line">Line</button>
        <button id="rectangle">Rectangle</button>
        <input type="color" id="colorPicker" value="#000000">
        <button id="delete">Clear</button>
        <button id="undo">Undo</button>
    </div>
    <canvas id="whiteboard"></canvas>
    <script src="/socket.io/socket.io.js"></script>
    <script src="app.js"></script>
</body>
</html>
Client (public/styles.css)
css
Copy code
body, html {
    margin: 0;
    padding: 0;
    overflow: hidden;
    height: 100%;
    display: flex;
    flex-direction: column;
}

#toolbar {
    background: #eee;
    padding: 10px;
    display: flex;
    gap: 10px;
    border-bottom: 1px solid #ccc;
}

#whiteboard {
    flex: 1;
}
Testing
To test the application with multiple users:

Start the server using node server.js.
Open multiple browser tabs/windows and navigate to http://localhost:3000.
Perform drawing actions in one tab/window and observe if the changes are reflected in all other tabs/windows in real-time.
License
This project is licensed under the MIT License.
