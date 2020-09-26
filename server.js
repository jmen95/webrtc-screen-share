const express = require('express');
const http = require('http');
require('dotenv').config();
const app = express();
const server = http.createServer(app);
const socket = require('socket.io');
const io = socket(server);

// const rooms = {};

io.on('connection', (socket) => {
	socket.on('join room', (roomID) => {
		const room = roomID;
		socket.room = room;
		// if (rooms[roomID]) {
		//   rooms[roomID].push(socket.id);
		// } else {
		//   rooms[roomID] = [socket.id];
		// }
		io.of('/')
			.in(room)
			.clients(function (error, clients) {
				console.log('clients :>> ', clients.length);
				// console.log("arguments :>> ", arguments);
				console.log('socket.id', socket.id);
				const numClients = clients.length;
				if (numClients === 0) {
					socket.join(room);
				} else {
					socket.join(room);
				}
				// const otherUsers = rooms[roomID].filter((id) => id !== socket.id);
				// console.log("otherUsers", otherUsers);
				// console.log("socket.id ----:>> ", socket.id);
				// console.log("clients---- :>> ", clients);

				// socket.to(socket.room).emit("other user", socket.id);
				// socket.to(socket.room).emit("user joined", item);

				if (clients.length !== 0) {
					console.log('clients----if :>> ', clients);
					clients.map((item) => {
						try {
							socket.emit('other user', item);
							socket.to(socket.room).emit('user joined', socket.id);
							console.log('item :>> ', item);
						} catch (error) {
							console.log('error uniendo a la room', error);
						}
					});
				}
				// if (otherUsers) {
				//   otherUsers.map((item) => {
				//     try {
				//       console.log("item", item);
				//       socket.emit("other user", item);
				//       socket.to(item).emit("user joined", socket.id);
				//     } catch (error) {
				//       console.log("[join room error]", error);
				//     }
				//   });
				// }
			});
	});

	socket.on('offer', (payload) => {
		io.to(payload.target).emit('offer', payload);
	});

	socket.on('answer', (payload) => {
		io.to(payload.target).emit('answer', payload);
	});

	socket.on('ice-candidate', (incoming) => {
		io.to(incoming.target).emit('ice-candidate', incoming);
	});

	socket.on('leave_room', function (roomID) {
		console.log('leave_room', arguments);
		console.log('roomID', roomID);
		console.log('rooms leave', rooms[roomID]);

		if (rooms[roomID]) {
			rooms[roomID] = rooms[roomID].filter((item) => item !== socket.id);
		}

		socket.disconnect();
	});

	//   socket.on("disconnect", () => {
	//     console.log("jeannnnnnnnn");
	//   });
	socket.on('message', (message) => {
		console.log('message', message);
	});
});

const NODE_ENV = process.env.NODE_ENV;
const isProd = NODE_ENV === 'production';
if (isProd) {
	app.use(express.static(`${__dirname}/client/build`));

	app.get('/*', (req, res) => {
		res.sendFile(__dirname + '/client/build/index.html');
	});
}

const PORT = process.env.PORT;
server.listen(PORT, () => console.log('server is running on port ' + PORT));
