export interface DefaultWebSocketMessage {
  authToken: string
}

export interface UpdateLocation extends DefaultWebSocketMessage {
  type: "updateLocation"
  userId: string
  playerType: string
  area: string
  chunk: [number, number]
  position: [number, number]
  emotion: string
  updateChunk: boolean
}
