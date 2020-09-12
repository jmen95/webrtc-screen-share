const express = require('express');
const http = require('http');
const app = express();
const server = http.createServer(app);
const socket = require('socket.io');
const io = socket(server);

const rooms = {};

io.on('connection', (socket) => {
	socket.on('join room', (roomID) => {
		if (rooms[roomID]) {
			rooms[roomID].push(socket.id);
		} else {
			rooms[roomID] = [socket.id];
		}
		console.log('socket.id', socket.id);
		const otherUsers = rooms[roomID].filter((id) => id !== socket.id);
		console.log('otherUsers', otherUsers);
		if (otherUsers) {
			otherUsers.map((item) => {
				try {
					console.log('item', item);
					socket.emit('other user', item);
					socket.to(item).emit('user joined', socket.id);
				} catch (error) {
					console.log('[join room error]', error);
				}
			});
		}
	});

	socket.on('offer', (payload) => {
		io.to(payload.target).emit('offer', payload);
	});

	socket.on('answer', (payload) => {
		io.to(payload.target).emit('answer', payload);
	});

	socket.on('ice-candidate', (incoming) => {
		io.to(incoming.target).emit('ice-candidate', incoming.candidate);
	});

	socket.on('leave_room', function (roomID) {
		console.log('leave_room', arguments);
		console.log('roomID', roomID);
		if (rooms[roomID]) rooms[roomID] = rooms[roomID].filter((item) => item !== socket.id);
		socket.disconnect();
	});
});

server.listen(8000, () => console.log('server is running on port 8000'));
