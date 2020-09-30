import React, { Component } from "react";
import io from "socket.io-client";

class Room extends Component {
  constructor(props) {
    super(props);
    this.userVideo = React.createRef();
    this.state = {
      // partnerVideo : React.createRef(),
      peerRef: [],
      peerCon: [],
      socketRef: "",
      otherUser: [],
      userStream: "",
      senders: [],
      partnerVideos: [],
      otherVideos: [],
    };
    this.createSteam = this.createSteam.bind(this);
    this.callUser = this.callUser.bind(this);
    this.createPeer = this.createPeer.bind(this);
    this.handleNegotiationNeededEvent = this.handleNegotiationNeededEvent.bind(
      this
    );
    this.handleRecieveCall = this.handleRecieveCall.bind(this);
    this.handleAnswer = this.handleAnswer.bind(this);
    this.handleICECandidateEvent = this.handleICECandidateEvent.bind(this);
    this.handleNewICECandidateMsg = this.handleNewICECandidateMsg.bind(this);
    this.handleTrackEvent = this.handleTrackEvent.bind(this);
    this.shareScreen = this.shareScreen.bind(this);
    this.loadVideo = this.loadVideo.bind(this);
  }

  // const this.state.otherVideos = useRef([]);

  createSteam(stream) {
    this.userVideo.current.srcObject = stream;
    this.setState({ userStream: stream });
    this.state.socketRef = io.connect("/");
    this.state.socketRef.emit("join room", this.props.match.params.roomID);
    // // console.log("this.state.otherUser---", this.state.otherUser);
    this.state.socketRef.on("other user", (userID) => {
      // userID.map((item) => {
      // console.log("other user", userID);
      this.callUser(userID);

      if (this.state.otherUser.length !== 0) {
        // console.log('yo');
        this.state.otherUser.push(userID);
      } else {
        // console.log('no--');
        this.state.otherUser = [userID];
      }
      // console.log('this.state.otherUser', this.state.otherUser);
      // });
    });

    // window.roomID = props.match.params.roomID;
    // window.onbeforeunload = function (e) {
    // //   console.log("cerreeee");
    //   this.state.socketRef.emit("leave_room", props.match.params.roomID);
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

    this.state.socketRef.on("user joined", (userID) => {
      // console.log('this.state.otherUser --joined', this.state.otherUser);
      if (this.state.otherUser) {
        this.state.otherUser.push(userID);
      } else {
        this.state.otherUser = [userID];
      }
    });

    this.state.socketRef.on("disconnected", (userID) => {
      console.log("desconected----->", userID);
      console.log("this.state.partnerVideos :>> ", this.state.partnerVideos);
      const partnerVideos = this.state.partnerVideos.filter(
        (item) => item.userID !== userID
      );
      this.setState({ partnerVideos });
    });

    this.state.socketRef.on("offer", this.handleRecieveCall);

    this.state.socketRef.on("answer", this.handleAnswer);

    this.state.socketRef.on("ice-candidate", this.handleNewICECandidateMsg);
  }

  callUser(userID) {
    console.log("1. callUser");
    // console.log('userID :>> ', userID);
    this.state.peerRef[userID] = this.createPeer(userID);
    this.state.peerCon[userID] = this.state.peerRef[userID];
    // console.log('this.state.userStream---------- :>> ', this.state.userStream.getTracks());
    this.state.userStream
      .getTracks()
      .forEach((track) =>
        this.state.senders.push(
          this.state.peerRef[userID].addTrack(track, this.state.userStream)
        )
      );
  }

  createPeer(userID) {
    // console.log('createpeer :>> ', userID);
    const peer = new RTCPeerConnection({
      iceServers: [
        {
          urls: ["stun:us-turn2.xirsys.com"],
        },
        {
          username:
            "iW0fiyG_OwSHvAnRyUJs8rC_MnmeFU1-giJcYN-MRmr9VI1prz-HuL2IxE_kkPx_AAAAAF9yaPpzYW5jaGV6OTNqY3M=",
          credential: "2b27387c-01dd-11eb-8bb9-0242ac140004",
          urls: [
            "turn:us-turn2.xirsys.com:80?transport=udp",
            "turn:us-turn2.xirsys.com:3478?transport=udp",
            "turn:us-turn2.xirsys.com:80?transport=tcp",
            "turn:us-turn2.xirsys.com:3478?transport=tcp",
            "turns:us-turn2.xirsys.com:443?transport=tcp",
            "turns:us-turn2.xirsys.com:5349?transport=tcp",
          ],
        },
      ],
    });

    peer.onicecandidate = (e) => this.handleICECandidateEvent(e, userID);
    peer.ontrack = this.handleTrackEvent(userID);
    // peer.ontrack = this.handleTrackEvent;
    peer.onnegotiationneeded = () => this.handleNegotiationNeededEvent(userID);

    return peer;
  }

  handleNegotiationNeededEvent(userID) {
    let _userId = userID;
    // console.log('this.handleNegotiationNeededEvent userID :>> ', userID);
    // console.log('this.state.peerRef :>> ', this.state.peerRef);
    this.state.peerRef[userID]
      .createOffer()
      .then((offer) => {
        // console.log('this.state.peerRef then :>> ', this.state.peerRef);
        return this.state.peerRef[userID].setLocalDescription(offer);
      })
      .then(() => {
        // console.log('this.handleNegotiationNeededEvent then userID :>> ', userID);
        const payload = {
          target: _userId,
          caller: this.state.socketRef.id,
          sdp: this.state.peerRef[userID].localDescription,
        };
        this.state.socketRef.emit("offer", payload);
      });
    // .catch((e) => console.log(e));
  }

  handleRecieveCall(incoming) {
    const userID = incoming.caller;
    // console.log('this.handleRecieveCall userId :>> ', userID);
    console.log("this.handleRecieveCall");
    this.state.peerRef[userID] = this.createPeer(userID);
    const desc = new RTCSessionDescription(incoming.sdp);
    this.state.peerRef[userID]
      .setRemoteDescription(desc)
      .then(() => {
        this.state.userStream
          .getTracks()
          .forEach((track) =>
            this.state.peerRef[userID].addTrack(track, this.state.userStream)
          );
      })
      .then(() => {
        return this.state.peerRef[userID].createAnswer();
      })
      .then((answer) => {
        return this.state.peerRef[userID].setLocalDescription(answer);
      })
      .then(() => {
        const payload = {
          target: incoming.caller,
          caller: this.state.socketRef.id,
          sdp: this.state.peerRef[userID].localDescription,
        };
        this.state.socketRef.emit("answer", payload);
      });
  }

  handleAnswer(message) {
    const userID = message.caller;
    // console.log('this.handleAnswer message :>> ', message);
    const desc = new RTCSessionDescription(message.sdp);
    console.log(
      "2. this.handleAnswer this.state.peerRef :>> ",
      this.state.peerRef[userID]
    );
    console.log(
      "2. this.handleAnswer this.state.peerCon :>> ",
      this.state.peerCon[userID]
    );
    console.log("2. this.handleAnswer userID :>> ", userID);
    if (!this.state.peerRef[userID]) {
      this.state.peerRef[userID] = this.createPeer(userID);
    }
    if (this.state.peerRef[userID])
      this.state.peerRef[userID]
        .setRemoteDescription(desc)
        .catch((e) => console.log(e));
    else {
    }
    // console.log('this.handleAnswer this.state.peerRef[userID] :>> ', this.state.peerRef[userID]);
  }

  handleICECandidateEvent(e, userID) {
    console.log(
      "2.1 this.handleICECandidateEvent this.state.otherUser :>> ",
      this.state.otherUser
    );
    if (e.candidate) {
      this.state.otherUser.map((item) => {
        console.log("2.1 this.handleICECandidateEvent item :>> ", item);
        console.log(
          "2.1 this.handleICECandidateEvent userID :>> ",
          this.state.socketRef.id
        );
        const payload = {
          caller: this.state.socketRef.id,
          target: item,
          candidate: e.candidate,
        };
        this.state.socketRef.emit("ice-candidate", payload);
      });
    }
  }

  handleNewICECandidateMsg(incoming) {
    // console.log(' this.handleNewICECandidateMsg -------arguments :>> ', arguments);
    const userID = incoming.caller;
    // const userID = incoming.target;
    const candidate = new RTCIceCandidate(incoming.candidate);
    // console.log('this.handleNewICECandidateMsg userID :>> ', userID);
    // console.log('this.handleNewICECandidateMsg incoming :>> ', incoming);
    // console.log('this.handleNewICECandidateMsg this.state.peerRef :>> ', this.state.peerRef);
    console.log(
      "3. this.handleNewICECandidateMsg this.state.peerRef[userID] 1 :>> ",
      this.state.peerRef[userID]
    );
    console.log("3. this.handleNewICECandidateMsg userID :>> ", userID);
    console.log("3. this.handleNewICECandidateMsg incoming :>> ", incoming);
    if (!this.state.peerRef[userID]) {
      this.state.peerRef[userID] = this.createPeer(userID);
    }
    // console.log('this.state.peerRef[userID] 2 :>> ', this.state.peerRef[userID]);
    if (this.state.peerRef[userID]) {
      this.state.peerRef[userID]
        .addIceCandidate(candidate)
        .catch((e) => console.log(e));
    } else {
      // console.log('no existe');
    }
  }

  //   function this.handleTrackEvent(e) {
  //     partnerVideo.srcObject = e.streams[0];
  //   }

  handleTrackEvent(userID) {
    return async function (e) {
      console.log("e ---------:>> ", this);
      const { partnerVideos } = this.state;
      console.log("4. this.handleTrackEvent userID :>> this------ ", this);

      this.setState({
        partnerVideos: [...partnerVideos, { userID, stream: e.streams[0] }],
      });
    }.bind(this);
  }

  shareScreen() {
    navigator.mediaDevices.getDisplayMedia({ cursor: true }).then((stream) => {
      const screenTrack = stream.getTracks()[0];
      this.state.senders
        .find((sender) => sender.track.kind === "video")
        .replaceTrack(screenTrack);
      screenTrack.onended = function () {
        this.state.senders
          .find((sender) => sender.track.kind === "video")
          .replaceTrack(this.state.userStream.getTracks()[1]);
      };
    });
  }

  loadVideo(node, stream) {
    // console.log('stream :>> ', stream);
    if (node) {
      // console.log('this.loadVideo', stream);
      // console.log('node', node);
      node.srcObject = stream;
    }
  }

  componentDidMount() {
    navigator.mediaDevices
      .getUserMedia({ audio: false, video: true })
      .then((stream) => {
        this.createSteam(stream);
      })
      .catch((error) => {
        navigator.mediaDevices
          .getUserMedia({ audio: true, video: false })
          .then((stream) => {
            this.createSteam(stream);
          });
      });
  }

  render() {
    // console.log("return---->", this.state.partnerVideos);
    // console.log("this.state :>> ", this.state);
    return (
      <div>
        <h1>{this.state.socketRef && this.state.socketRef.id}</h1>
        <video
          controls
          style={{ height: 500, width: 500 }}
          autoPlay
          // playsinline
          ref={this.userVideo}
        />
        {this.state.partnerVideos.map((item, index) => (
          <video
            key={index}
            controls
            style={{ height: 500, width: 500 }}
            autoPlay
            // playsinline
            ref={(node) => this.loadVideo(node, item.stream)}
          />
        ))}

        {/* <video
        controls
        style={{ height: 500, width: 500 }}
        autoPlay
        ref={partnerVideo}
      /> */}
        <button onClick={this.shareScreen}>Share screen</button>
      </div>
    );
  }
}

export default Room;
