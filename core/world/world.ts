import {Ecs} from "./ecs";
import {Player} from "../components/player";
import {UpdateLocation} from "../messages";
import React from "react";
import {Disposable, Time} from "./index";
import {KeyState} from "./input";
import {DrawContext} from "./draw";

export class World<K extends string, S extends { [P in K]: S[P] }> implements Disposable {
  stopped: boolean

  gl: WebGL2RenderingContext
  drawContext: DrawContext
  ecs: Ecs<K, S>
  keyState: KeyState

  socket: {
    updateLocation: (player: Player, area: string, position: [number, number]) => void
  }

  queue: {
    updateLocation: UpdateLocation[]
  }

  launchModal: (comp: React.ReactNode) => void

  constructor(canvas: HTMLCanvasElement, width: number, height: number,
              ecs: Ecs<K, S>, keyState: KeyState, launchModal: (comp: React.ReactNode) => void) {
    this.stopped = false
    this.gl = canvas.getContext("webgl2")!
    this.drawContext = new DrawContext(canvas, this.gl, width, height)
    this.ecs = ecs
    this.keyState = keyState
    this.launchModal = launchModal

    this.socket = { updateLocation: () => {} }
    this.queue = { updateLocation: [] }

    setTimeout(() => this.frame({ total: 0, delta: 0 }), 0)
  }

  initWebsocket(ws: WebSocket) {
    const playerChunkSize = 20

    let nextChunkUpdate = new Date()
    function updateLocation(player: Player, area: string, position: [number, number]) {
      const updateChunk = nextChunkUpdate.getTime() < new Date().getTime()
      if (updateChunk) {
        nextChunkUpdate = new Date(new Date().getTime() + 1000)
      }

      const body: UpdateLocation = {
        authToken: window.localStorage.getItem("authToken") ?? "",
        type: "updateLocation",
        playerType: player.type,
        userId: player.name,
        area: area,
        chunk: [
          Math.floor(position[0] / playerChunkSize),
          Math.floor(position[1] / playerChunkSize),
        ],
        position: position,
        emotion: player.emotionUntil.getTime() > new Date().getTime() ? player.emotion : "",
        updateChunk: updateChunk,
      }

      ws.send(JSON.stringify(body))
    }

    this.socket = { updateLocation }
    this.queue = {
      updateLocation: [],
    }

    ws.onmessage = ((event: MessageEvent) => {
      const rawBody = JSON.parse(event.data)
      if (rawBody.type === "updateLocation") {
        this.queue.updateLocation.push(rawBody)
      } else {
        console.warn("invalid message", rawBody)
      }
    })

  }

  setViewport(width: number, height: number) {
    this.drawContext.setViewport(width, height)
  }

  onDelete() {
    this.stopped = true

    this.drawContext.onDelete()
  }

  frame(time: Time) {
    this.update(time)
    this.draw(time)

    if (!this.stopped) {
      requestAnimationFrame((total) => this.frame({ total: total, delta: total - time.total }))
    }
  }

  update(time: Time) {
    this.keyState.update(time)
    this.drawContext.collectTexts()
    this.ecs.update("update", this, time)
  }

  draw(time: Time) {
    this.drawContext.init(time)
    this.ecs.update("draw", this, time)
    this.drawContext.flush()
    this.drawContext.postProcess()
  }
}
