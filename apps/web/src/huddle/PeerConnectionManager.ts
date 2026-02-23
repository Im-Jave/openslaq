import type { Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  WebRTCOffer,
  WebRTCAnswer,
  WebRTCIceCandidate,
  ChannelId,
  UserId,
} from "@openslack/shared";

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

interface PeerEntry {
  pc: RTCPeerConnection;
  audioEl: HTMLAudioElement;
}

export class PeerConnectionManager {
  private socket: TypedSocket;
  private channelId: string;
  private localUserId: string;
  private localStream: MediaStream | null = null;
  private peers = new Map<string, PeerEntry>();
  private destroyed = false;

  constructor(socket: TypedSocket, channelId: string, localUserId: string) {
    this.socket = socket;
    this.channelId = channelId;
    this.localUserId = localUserId;
  }

  async initialize(existingParticipantIds: string[]): Promise<void> {
    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

    this.setupSignalingListeners();

    // Create offers to all existing participants (we're the newcomer)
    for (const peerId of existingParticipantIds) {
      if (peerId !== this.localUserId) {
        await this.createPeerAndOffer(peerId);
      }
    }
  }

  private setupSignalingListeners(): void {
    const socketAny = this.socket as unknown as {
      on: (event: string, listener: (...args: unknown[]) => void) => void;
    };

    socketAny.on("webrtc:offer", (payload: unknown) => {
      const offer = payload as WebRTCOffer;
      if (offer.channelId === this.channelId && offer.toUserId === this.localUserId) {
        void this.handleOffer(offer);
      }
    });

    socketAny.on("webrtc:answer", (payload: unknown) => {
      const answer = payload as WebRTCAnswer;
      if (answer.channelId === this.channelId && answer.toUserId === this.localUserId) {
        void this.handleAnswer(answer);
      }
    });

    socketAny.on("webrtc:ice-candidate", (payload: unknown) => {
      const candidate = payload as WebRTCIceCandidate;
      if (candidate.channelId === this.channelId && candidate.toUserId === this.localUserId) {
        void this.handleIceCandidate(candidate);
      }
    });
  }

  private createPeerConnection(remoteUserId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        pc.addTrack(track, this.localStream);
      }
    }

    // Handle remote tracks
    const audioEl = document.createElement("audio");
    audioEl.autoplay = true;

    pc.ontrack = (event) => {
      audioEl.srcObject = event.streams[0] ?? null;
    };

    // Send ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit("webrtc:ice-candidate", {
          toUserId: remoteUserId as UserId,
          channelId: this.channelId as ChannelId,
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
        });
      }
    };

    // ICE restart on connection failure
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "failed") {
        pc.restartIce();
      }
    };

    this.peers.set(remoteUserId, { pc, audioEl });
    return pc;
  }

  private async createPeerAndOffer(remoteUserId: string): Promise<void> {
    if (this.destroyed) return;
    const pc = this.createPeerConnection(remoteUserId);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    this.socket.emit("webrtc:offer", {
      toUserId: remoteUserId as UserId,
      channelId: this.channelId as ChannelId,
      sdp: offer.sdp!,
    });
  }

  private async handleOffer(offer: WebRTCOffer): Promise<void> {
    if (this.destroyed) return;

    let entry = this.peers.get(offer.fromUserId);
    if (!entry) {
      this.createPeerConnection(offer.fromUserId);
      entry = this.peers.get(offer.fromUserId)!;
    }

    await entry.pc.setRemoteDescription(
      new RTCSessionDescription({ type: "offer", sdp: offer.sdp }),
    );

    const answer = await entry.pc.createAnswer();
    await entry.pc.setLocalDescription(answer);

    this.socket.emit("webrtc:answer", {
      toUserId: offer.fromUserId as UserId,
      channelId: this.channelId as ChannelId,
      sdp: answer.sdp!,
    });
  }

  private async handleAnswer(answer: WebRTCAnswer): Promise<void> {
    if (this.destroyed) return;
    const entry = this.peers.get(answer.fromUserId);
    if (!entry) return;

    await entry.pc.setRemoteDescription(
      new RTCSessionDescription({ type: "answer", sdp: answer.sdp }),
    );
  }

  private async handleIceCandidate(payload: WebRTCIceCandidate): Promise<void> {
    if (this.destroyed) return;
    const entry = this.peers.get(payload.fromUserId);
    if (!entry) return;

    await entry.pc.addIceCandidate(
      new RTCIceCandidate({
        candidate: payload.candidate,
        sdpMid: payload.sdpMid,
        sdpMLineIndex: payload.sdpMLineIndex,
      }),
    );
  }

  setMuted(muted: boolean): void {
    if (this.localStream) {
      for (const track of this.localStream.getAudioTracks()) {
        track.enabled = !muted;
      }
    }
  }

  removePeer(userId: string): void {
    const entry = this.peers.get(userId);
    if (!entry) return;

    entry.pc.close();
    entry.audioEl.srcObject = null;
    entry.audioEl.remove();
    this.peers.delete(userId);
  }

  destroy(): void {
    this.destroyed = true;

    // Remove signaling listeners
    const socketAny = this.socket as unknown as {
      off: (event: string) => void;
    };
    socketAny.off("webrtc:offer");
    socketAny.off("webrtc:answer");
    socketAny.off("webrtc:ice-candidate");

    // Close all peer connections
    for (const [userId] of this.peers) {
      this.removePeer(userId);
    }
    this.peers.clear();

    // Stop local tracks
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        track.stop();
      }
      this.localStream = null;
    }
  }

  async replaceAudioTrack(deviceId: string): Promise<void> {
    // Get a new stream from the selected device
    const newStream = await navigator.mediaDevices.getUserMedia({
      audio: { deviceId: { exact: deviceId } },
      video: false,
    });

    // Stop old tracks
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        track.stop();
      }
    }

    this.localStream = newStream;
    const newTrack = newStream.getAudioTracks()[0]!;

    // Replace track in all peer connections
    for (const [, entry] of this.peers) {
      const senders = entry.pc.getSenders();
      const audioSender = senders.find((s) => s.track?.kind === "audio");
      if (audioSender) {
        await audioSender.replaceTrack(newTrack);
      }
    }
  }

  getPeerUserIds(): string[] {
    return Array.from(this.peers.keys());
  }
}
