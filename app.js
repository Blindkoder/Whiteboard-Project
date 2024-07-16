const canvas = document.getElementById('whiteboard');
const ctx = canvas.getContext('2d');
const socket = io();

canvas.width = window.innerWidth;
canvas.height = window.innerHeight - document.getElementById('toolbar').offsetHeight;

let drawing = false;
let tool = 'pencil';
let color = '#000000';
let startX, startY;
let drawings = []; // Array to hold all the drawn shapes

document.getElementById('pencil').addEventListener('click', () => tool = 'pencil');
document.getElementById('line').addEventListener('click', () => tool = 'line');
document.getElementById('rectangle').addEventListener('click', () => tool = 'rectangle');
document.getElementById('colorPicker').addEventListener('change', (e) => color = e.target.value);
document.getElementById('delete').addEventListener('click', () => {
    drawings = []; // Clear the array of drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    socket.emit('clear'); // Emit a clear event to other clients
});
document.getElementById('undo').addEventListener('click', undoLastDrawing); // Added event listener for undo

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
        drawings.push({
            tool: tool,
            color: color,
            startX: startX,
            startY: startY,
            x: e.clientX,
            y: e.clientY
        });
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
        drawings.push({
            tool: tool,
            color: color,
            x: e.clientX,
            y: e.clientY
        });
        socket.emit('draw', { tool, color, x: e.clientX, y: e.clientY, type: 'draw' });
    } else if (tool === 'line') {
        // Clear the previous line
        redraw();
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(e.clientX, e.clientY);
        ctx.stroke();
    } else if (tool === 'rectangle') {
        // Clear the previous rectangle
        redraw();
        ctx.beginPath();
        const width = e.clientX - startX;
        const height = e.clientY - startY;
        ctx.rect(startX, startY, width, height);
        ctx.stroke();
    }

    socket.emit('draw', { tool, color, startX, startY, x: e.clientX, y: e.clientY, type: 'draw' });
}

function redraw() {
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

function undoLastDrawing() {
    drawings.pop(); // Remove the last drawing action
    redraw(); // Redraw the canvas
    socket.emit('undo'); // Emit undo event to other clients
}

socket.on('draw', (data) => {
    if (data.type === 'clear') {
        drawings = [];
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
    }

    ctx.strokeStyle = data.color;
    ctx.lineWidth = 2;

    if (data.type === 'start') {
        ctx.beginPath();
        ctx.moveTo(data.startX, data.startY);
    } else if (data.type === 'draw') {
        if (data.tool === 'pencil') {
            ctx.lineTo(data.x, data.y);
            ctx.stroke();
            drawings.push(data);
        }
    } else if (data.type === 'end') {
        drawings.push(data);
        redraw();
    }
});

socket.on('clear', () => {
    drawings = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

socket.on('undo', () => {
    drawings.pop(); // Remove the last drawing action
    redraw(); // Redraw the canvas
});
