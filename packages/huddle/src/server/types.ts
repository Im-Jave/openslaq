export interface LiveKitConfig {
  apiKey: string;
  apiSecret: string;
  apiUrl: string;
  wsUrl: string;
}

export interface TokenRequest {
  userId: string;
  roomName: string;
  displayName?: string;
}

export interface JoinResponse {
  token: string;
  wsUrl: string;
  roomName: string;
}
