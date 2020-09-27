import React, { useRef, useEffect, useState } from 'react';
import io from 'socket.io-client';

const Room = (props) => {
	const userVideo = useRef();
	const partnerVideo = useRef();
	const peerRef = useRef([]);
	const peerCon = [];
	const socketRef = useRef();
	const otherUser = useRef([]);
	const userStream = useRef();
	const senders = useRef([]);
	const partnerVideos = useRef([]);
	const [otherVideos, setOtherVideos] = useState([]);
	// const otherVideos = useRef([]);

	useEffect(() => {
		navigator.mediaDevices
			.getUserMedia({ audio: false, video: true })
			.then((stream) => {
				createSteam(stream);
			})
			.catch((error) => {
				navigator.mediaDevices.getUserMedia({ audio: false, video: false }).then((stream) => {
					createSteam(stream);
				});
			});
	}, []);

	function createSteam(stream) {
		userVideo.current.srcObject = stream;
		userStream.current = stream;

		socketRef.current = io.connect('/');
		socketRef.current.emit('join room', props.match.params.roomID);
		// // console.log("otherUser.current---", otherUser.current);
		socketRef.current.on('other user', (userID) => {
			// userID.map((item) => {
			console.log('other user', userID);
			callUser(userID);

			if (otherUser.current.length !== 0) {
				// console.log('yo');
				otherUser.current.push(userID);
			} else {
				// console.log('no--');
				otherUser.current = [userID];
			}
			// console.log('otherUser.current', otherUser.current);
			// });
		});

		// window.roomID = props.match.params.roomID;
		// window.onbeforeunload = function (e) {
		// //   console.log("cerreeee");
		//   socketRef.current.emit("leave_room", props.match.params.roomID);
		//   e.preventDefault();
		//   // alert('Bye');

		//   return false;
		// };
		// if (window.performance) {
		// //   console.log("hello", performance.navigation.type);
		//   if (performance.navigation.type === 1) {
		// //     console.log("heloooooooo");
		//   }
		// }

		socketRef.current.on('user joined', (userID) => {
			// console.log('otherUser.current --joined', otherUser.current);
			if (otherUser.current) {
				otherUser.current.push(userID);
			} else {
				otherUser.current = [userID];
			}
		});

		socketRef.current.on('offer', handleRecieveCall);

		socketRef.current.on('answer', handleAnswer);

		socketRef.current.on('ice-candidate', handleNewICECandidateMsg);
	}

	function callUser(userID) {
		console.log('1. callUser');
		// console.log('userID :>> ', userID);
		peerRef.current[userID] = createPeer(userID);
		peerCon[userID] = peerRef.current[userID];
		// console.log('userStream.current---------- :>> ', userStream.current.getTracks());
		userStream.current
			.getTracks()
			.forEach((track) => senders.current.push(peerRef.current[userID].addTrack(track, userStream.current)));
	}

	function createPeer(userID) {
		// console.log('createpeer :>> ', userID);
		const peer = new RTCPeerConnection({
			iceServers: [
				{
					url: 'stun:stun.l.google.com:19302',
				},

				// {
				// 	urls: 'stun:stun.stunprotocol.org',
				// },
				// {
				// 	urls: 'turn:numb.viagenie.ca',
				// 	credential: 'muazkh',
				// 	username: 'webrtc@live.com',
				// },
			],
		});

		peer.onicecandidate = (e) => handleICECandidateEvent(e, userID);
		peer.ontrack = handleTrackEvent(userID);
		// peer.ontrack = handleTrackEvent;
		peer.onnegotiationneeded = () => handleNegotiationNeededEvent(userID);

		return peer;
	}

	function handleNegotiationNeededEvent(userID) {
		let _userId = userID;
		// console.log('handleNegotiationNeededEvent userID :>> ', userID);
		// console.log('peerRef.current :>> ', peerRef.current);
		peerRef.current[userID]
			.createOffer()
			.then((offer) => {
				// console.log('peerRef.current then :>> ', peerRef.current);
				return peerRef.current[userID].setLocalDescription(offer);
			})
			.then(() => {
				// console.log('handleNegotiationNeededEvent then userID :>> ', userID);
				const payload = {
					target: _userId,
					caller: socketRef.current.id,
					sdp: peerRef.current[userID].localDescription,
				};
				socketRef.current.emit('offer', payload);
			});
		// .catch((e) => console.log(e));
	}

	function handleRecieveCall(incoming) {
		const userID = incoming.caller;
		// console.log('handleRecieveCall userId :>> ', userID);
		console.log('handleRecieveCall');
		peerRef.current[userID] = createPeer(userID);
		const desc = new RTCSessionDescription(incoming.sdp);
		peerRef.current[userID]
			.setRemoteDescription(desc)
			.then(() => {
				userStream.current
					.getTracks()
					.forEach((track) => peerRef.current[userID].addTrack(track, userStream.current));
			})
			.then(() => {
				return peerRef.current[userID].createAnswer();
			})
			.then((answer) => {
				return peerRef.current[userID].setLocalDescription(answer);
			})
			.then(() => {
				const payload = {
					target: incoming.caller,
					caller: socketRef.current.id,
					sdp: peerRef.current[userID].localDescription,
				};
				socketRef.current.emit('answer', payload);
			});
	}

	function handleAnswer(message) {
		const userID = message.caller;
		// console.log('handleAnswer message :>> ', message);
		const desc = new RTCSessionDescription(message.sdp);
		console.log('2. handleAnswer peerRef.current :>> ', peerRef.current[userID]);
		console.log('2. handleAnswer peerCon :>> ', peerCon[userID]);
		console.log('2. handleAnswer userID :>> ', userID);
		if (!peerRef.current[userID]) {
			peerRef.current[userID] = createPeer(userID);
		}
		if (peerRef.current[userID]) peerRef.current[userID].setRemoteDescription(desc).catch((e) => console.log(e));
		else {
		}
		// console.log('handleAnswer peerRef.current[userID] :>> ', peerRef.current[userID]);
	}

	function handleICECandidateEvent(e, userID) {
		console.log('2.1 handleICECandidateEvent otherUser.current :>> ', otherUser.current);
		if (e.candidate) {
			otherUser.current.map((item) => {
				console.log('2.1 handleICECandidateEvent item :>> ', item);
				console.log('2.1 handleICECandidateEvent userID :>> ', socketRef.current.id);
				const payload = {
					caller: socketRef.current.id,
					target: item,
					candidate: e.candidate,
				};
				socketRef.current.emit('ice-candidate', payload);
			});
		}
	}

	function handleNewICECandidateMsg(incoming) {
		// console.log(' handleNewICECandidateMsg -------arguments :>> ', arguments);
		const userID = incoming.caller;
		// const userID = incoming.target;
		const candidate = new RTCIceCandidate(incoming.candidate);
		// console.log('handleNewICECandidateMsg userID :>> ', userID);
		// console.log('handleNewICECandidateMsg incoming :>> ', incoming);
		// console.log('handleNewICECandidateMsg peerRef.current :>> ', peerRef.current);
		console.log('3. handleNewICECandidateMsg peerRef.current[userID] 1 :>> ', peerRef.current[userID]);
		console.log('3. handleNewICECandidateMsg userID :>> ', userID);
		console.log('3. handleNewICECandidateMsg incoming :>> ', incoming);
		if (!peerRef.current[userID]) {
			peerRef.current[userID] = createPeer(userID);
		}
		// console.log('peerRef.current[userID] 2 :>> ', peerRef.current[userID]);
		if (peerRef.current[userID]) {
			peerRef.current[userID].addIceCandidate(candidate).catch((e) => console.log(e));
		} else {
			// console.log('no existe');
		}
	}

	//   function handleTrackEvent(e) {
	//     partnerVideo.current.srcObject = e.streams[0];
	//   }

	function handleTrackEvent(userID) {
		// // console.log("userID :>> ", userID);
		// partnerVideo.current.srcObject = e.streams[0];
		// partnerVideos.current.map((item) => (item.srcObject = e.streams[0]));
		return async function (e) {
			//   partnerVideo.current.srcObject = e.streams[0];
			// debugger;
			// // console.log("otherVideos------------------:>> ", otherVideos);
			console.log('4. handleTrackEvent userID :>> ', userID);
			const finalOtherVideos = [...otherVideos];
			finalOtherVideos.push({ userID, stream: e.streams[0] });
			// // console.log(">>>finalOtherVideos :>> ", finalOtherVideos);
			partnerVideos.current.push({ userID, stream: e.streams[0] });
			// // console.log(">>>partnerVideos :>> ", partnerVideos);
			setOtherVideos(finalOtherVideos);
			// otherVideos.current = [
			//   ...otherVideos.current,
			//   { userID, stream: e.streams[0] },
			// ];
			//   const index = partnerVideos.current.lastIndexOf();
			//   partnerVideos.current[index].srcObject = e.streams[0];
		};
	}

	function shareScreen() {
		navigator.mediaDevices.getDisplayMedia({ cursor: true }).then((stream) => {
			const screenTrack = stream.getTracks()[0];
			senders.current.find((sender) => sender.track.kind === 'video').replaceTrack(screenTrack);
			screenTrack.onended = function () {
				senders.current
					.find((sender) => sender.track.kind === 'video')
					.replaceTrack(userStream.current.getTracks()[1]);
			};
		});
	}

	function loadVideo(node, stream) {
		// console.log('stream :>> ', stream);
		if (node) {
			// console.log('loadVideo', stream);
			// console.log('node', node);
			node.srcObject = stream;
		}
	}

	// console.log('return', otherVideos);
	return (
		<div>
			<h1>{socketRef.current && socketRef.current.id}</h1>
			<video
				controls
				style={{ height: 500, width: 500 }}
				autoPlay
				// playsinline
				ref={userVideo}
			/>
			{partnerVideos.current.map((item, index) => (
				<video
					key={index}
					controls
					style={{ height: 500, width: 500 }}
					autoPlay
					// playsinline
					ref={(node) => loadVideo(node, item.stream)}
				/>
			))}

			{/* <video
        controls
        style={{ height: 500, width: 500 }}
        autoPlay
        ref={partnerVideo}
      /> */}
			<button onClick={shareScreen}>Share screen</button>
		</div>
	);
};

export default Room;
