import React from "react"
import {mat4, vec3, vec4} from "./declarativeLinalg";
import {intersect} from "./utils";
import {ContentsManager, Mesh, Texture} from "./contents";
import {CSSProperties} from "react";
import {UpdateLocation} from "./messages";
import {Player} from "./components";

const shaderSourceDirectFetchVertex = require("../src/shader/directFetch.vert")
const shaderSourceDirectFetchFragment = require("../src/shader/directFetch.frag")

const shaderSourceSSAO = require("../src/shader/ssao.frag")
const shaderSourceOutline = require("../src/shader/outline.frag")
const shaderSourceFetchOcclusion = require("../src/shader/fetchOcclusion.frag")
const shaderSourceFetchOutline = require("../src/shader/fetchOutline.frag")

const shaderSourceVertex = require("../src/shader/vertex.vert")
const shaderSourceFragment = require("../src/shader/fragment.frag")

export interface Disposable {
  onDelete: () => void
}

export class ShaderProgram implements Disposable {
  gl: WebGL2RenderingContext
  vertexShader: WebGLShader
  fragmentShader: WebGLShader
  program: WebGLProgram

  constructor(gl: WebGL2RenderingContext, vertexShaderSource: string, fragmentShaderSource: string) {
    const vertexShader = gl.createShader(gl.VERTEX_SHADER)!
    gl.shaderSource(
      vertexShader,
      vertexShaderSource,
    )
    gl.compileShader(vertexShader)
    gl.getShaderInfoLog(vertexShader) && console.error(gl.getShaderInfoLog(vertexShader))

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!
    gl.shaderSource(
      fragmentShader,
      fragmentShaderSource,
    )
    gl.compileShader(fragmentShader)
    gl.getShaderInfoLog(fragmentShader) && console.error(gl.getShaderInfoLog(fragmentShader))

    const shaderProgram = gl.createProgram()!;
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    gl.useProgram(shaderProgram);

    this.gl = gl
    this.vertexShader = vertexShader
    this.fragmentShader = fragmentShader
    this.program = shaderProgram
  }

  onDelete() {
    this.gl.deleteShader(this.vertexShader)
    this.gl.deleteShader(this.fragmentShader)
    this.gl.deleteProgram(this.program)
  }
}

export interface Storage<T> {
  write: (key: number, value: T) => void
  read: (key: number) => T
  remove: (key: number) => void
  keys: () => number[]
}

export class SparseStorage<T> implements Storage<T> {
  data: Record<number, T>

  constructor() {
    this.data = {}
  }

  read(key: number): T {
    return this.data[key]
  }

  write(key: number, value: T): void {
    this.data[key] = value
  }

  remove(key: number): void {
    delete this.data[key]
  }

  keys(): number[] {
    return Object.keys(this.data).map(x => parseInt(x))
  }
}

export type KeyedSystem<S extends { [P in keyof S]: S[P] }> = System<keyof S & string, S>

export type System<K extends string, S extends { [P in K]: S[P] }> = <W extends World<K, S>>(world: W, time: Time) => void

export function emptyEcs(): Ecs<never, {}> {
  return new Ecs({}, { update: [], draw: [] })
}

export class Ecs<K extends string, S extends { [P in K]: S[P] }> {
  storages: { [P in K]: Storage<S[P]> }
  systems: Record<"update" | "draw", System<K, S>[]>
  freshId: number

  constructor(storages: { [P in K]: Storage<S[P]> }, systems: Record<"update" | "draw", System<K, S>[]>) {
    this.storages = storages
    this.systems = systems
    this.freshId = 0
  }

  attach<L extends string, T>(name: L, storage: Storage<T>): Ecs<K | L, S & { [P in L]: T }> {
    return new Ecs<K | L, S & { [P in L]: T }>({ ...this.storages, [name]: storage } as S & { [P in L]: T }, this.systems)
  }

  register(order: "update" | "draw", system: System<K, S>) {
    this.systems[order].push(system)
    return this
  }

  join<KA extends K>(a: KA): [number, S[KA]][]
  join<KA extends K, KB extends K>(a: KA, b: KB): [number, S[KA], S[KB]][]
  join<KA extends K, KB extends K, KC extends K>(a: KA, b: KB, c: KC): [number, S[KA], S[KB], S[KC]][]
  join<KA extends K, KB extends K, KC extends K, KD extends K>(a: KA, b: KB, c: KC, d: KD): [number, S[KA], S[KB], S[KC], S[KD]][]
  join(...names: K[]): any[][] {
    const storages = names.map(name => {
      if (!(name in this.storages)) {
        throw new Error(`no such storage '${name}'`)
      }
      return this.storages[name]
    })

    const keys = Array.from(
      storages.map(storage => new Set(storage.keys()))
        .reduce((a, b) => intersect(a, b))
    )

    return keys.map(key => [key, ...storages.map(storage => storage.read(key))])
  }

  allocate() {
    this.freshId += 1
    return this.freshId - 1
  }

  create<KA extends K, VA extends S[KA]>(ka: KA, va: VA): void
  create<KA extends K, VA extends S[KA], KB extends K, VB extends S[KB]>(ka: KA, va: VA, kb: KB, vb: VB): void
  create<KA extends K, VA extends S[KA], KB extends K, VB extends S[KB], KC extends K, VC extends S[KC]>(ka: KA, va: VA, kb: KB, vb: VB, kc: KC, vc: VC): void
  create<
    KA extends K, VA extends S[KA], KB extends K, VB extends S[KB],
    KC extends K, VC extends S[KC], KD extends K, VD extends S[KD]
  >(ka: KA, va: VA, kb: KB, vb: VB, kc: KC, vc: VC, kd: KD, vd: VD): void
  create<
    KA extends K, VA extends S[KA], KB extends K, VB extends S[KB],
    KC extends K, VC extends S[KC], KD extends K, VD extends S[KD], KE extends K, VE extends S[KE]
    >(ka: KA, va: VA, kb: KB, vb: VB, kc: KC, vc: VC, kd: KD, vd: VD, ke: KE, ve: VE): void
  create(...args: any[]): void {
    const id = this.allocate()
    const names = args.filter((arg, i) => i % 2 === 0) as K[]
    const values = args.filter((arg, i) => i % 2 === 1)

    const storages = names.map(name => {
      if (!(name in this.storages)) {
        throw new Error(`no such storage '${name}'`)
      }
      return this.storages[name]
    })

    storages.forEach((storage, i) => storage.write(id, values[i]))
  }

  remove(key: number) {
    Object.values(this.storages).forEach(storage => (storage as Storage<any>).remove(key))
  }

  update(order: "update" | "draw", world: World<K, S>, time: Time) {
    this.systems[order].forEach(system => system(world, time))
  }
}

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
    const playerChunkSize = 10

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
        emotion: player.emotion,
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
    this.drawContext.init()
    this.ecs.update("draw", this, time)
    this.drawContext.flush()
    this.drawContext.postProcess()
  }
}

class Framebuffer implements Disposable {
  gl: WebGL2RenderingContext
  framebuffer: WebGLFramebuffer
  attachments: WebGLTexture[]
  width: number
  height: number

  constructor(gl: WebGL2RenderingContext, width: number, height: number, attachments: { attachment: number, internalFormat: number, format: number, type: number, interpolate?: boolean }[]) {
    const framebuffer = gl.createFramebuffer()!
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
    gl.drawBuffers(attachments.map(at => at.attachment).filter(at => at !== gl.DEPTH_ATTACHMENT))

    this.attachments = []
    for (const attachment of attachments) {
      if (attachment.attachment !== gl.DEPTH_ATTACHMENT) {
        const texture = gl.createTexture()!
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texImage2D(gl.TEXTURE_2D, 0, attachment.internalFormat, width, height, 0, attachment.format, attachment.type, null)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, attachment.attachment, gl.TEXTURE_2D, texture, 0)
        this.attachments.push(texture)
      } else {
        const depthBuffer = gl.createRenderbuffer()
        gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer)
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height)
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer)
      }
    }

    this.gl = gl
    this.framebuffer = framebuffer
    this.width = width
    this.height = height
  }

  onDelete() {
    this.attachments.forEach(attachment => this.gl.deleteTexture(attachment))
    this.gl.deleteFramebuffer(this.framebuffer)
  }
}

export class DrawContext implements Disposable {
  gl: WebGL2RenderingContext
  canvas: HTMLCanvasElement

  directFetchShader: ShaderProgram
  directFetchScreenMesh: WebGLBuffer
  defaultShader: ShaderProgram
  ssaoShader: ShaderProgram
  fetchOcclusionShader: ShaderProgram
  outlineShader: ShaderProgram
  fetchOutlineShader: ShaderProgram

  framebuffer: Framebuffer

  matrix: mat4[]
  width: number
  height: number
  viewMatrix: mat4
  deferredDraws: [number, () => void][]
  warpPlane: vec4
  warpSingularity: vec3
  warpRadius: number

  textNodes: Record<string, { node: HTMLElement, stale: boolean }> = {}

  constructor(canvas: HTMLCanvasElement, gl: WebGL2RenderingContext, width: number, height: number) {
    gl.getExtension("EXT_color_buffer_float")
    gl.getExtension("EXT_float_blend")

    const directFetchScreenMesh = gl.createBuffer()!
    gl.bindVertexArray(null)
    gl.bindBuffer(gl.ARRAY_BUFFER, directFetchScreenMesh)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]), gl.STATIC_DRAW)

    this.defaultShader = new ShaderProgram(gl, shaderSourceVertex, shaderSourceFragment)
    this.directFetchShader = new ShaderProgram(gl, shaderSourceDirectFetchVertex, shaderSourceDirectFetchFragment)
    this.directFetchScreenMesh = directFetchScreenMesh
    this.ssaoShader = new ShaderProgram(gl, shaderSourceDirectFetchVertex, shaderSourceSSAO)
    this.outlineShader = new ShaderProgram(gl, shaderSourceDirectFetchVertex, shaderSourceOutline)
    this.fetchOcclusionShader = new ShaderProgram(gl, shaderSourceDirectFetchVertex, shaderSourceFetchOcclusion)
    this.fetchOutlineShader = new ShaderProgram(gl, shaderSourceDirectFetchVertex, shaderSourceFetchOutline)

    this.framebuffer = new Framebuffer(
      gl, width, height,
      [
        { attachment: gl.COLOR_ATTACHMENT0, internalFormat: gl.RGBA, format: gl.RGBA, type: gl.UNSIGNED_BYTE },
        { attachment: gl.COLOR_ATTACHMENT1, internalFormat: gl.RGBA32F, format: gl.RGBA, type: gl.FLOAT },
        { attachment: gl.COLOR_ATTACHMENT2, internalFormat: gl.RGBA32F, format: gl.RGBA, type: gl.FLOAT },
        { attachment: gl.DEPTH_ATTACHMENT, internalFormat: gl.DEPTH_COMPONENT, format: gl.DEPTH_COMPONENT, type: gl.UNSIGNED_SHORT },
      ]
    )

    this.canvas = canvas
    this.gl = gl
    this.width = width
    this.height = height

    this.warpPlane = vec4.fromValues(0, 0, 1, 0)
    this.warpSingularity = vec3.fromValues(0, 0, 0)
    this.warpRadius = 1

    this.matrix = [mat4.create()]
    this.viewMatrix = mat4.create()
    this.deferredDraws = []

    this.textNodes = {}
  }

  onDelete() {
    this.defaultShader.onDelete()
    this.directFetchShader.onDelete()
    this.fetchOcclusionShader.onDelete()
    this.fetchOcclusionShader.onDelete()
    this.ssaoShader.onDelete()
  }

  addMatrix(matrix: mat4) {
    this.matrix[this.matrix.length - 1] = mat4.mul(this.matrix[this.matrix.length - 1], matrix)
  }

  pushMatrix() {
    this.matrix.push(this.matrix.slice(-1)[0])
  }

  popMatrix() {
    this.matrix.pop()
  }

  draw(mesh: Mesh) {
    this.gl.uniformMatrix4fv(
      this.gl.getUniformLocation(this.defaultShader.program, "worldMatrix"),
      false,
      this.matrix.slice(-1)[0],
    )

    mesh.draw()
  }

  drawDefer(order: number, draw: () => void) {
    this.deferredDraws.push([order, draw])
  }

  drawDeferPosition(position: vec3, draw: () => void) {
    // const depth = -vec3.transformMat4(position, this.viewMatrix)[2]
    const depth = -position[1]
    this.drawDefer(depth, draw)
  }

  flush() {
    this.deferredDraws
      .sort((a, b) => a[0] - b[0])
      .forEach(([order, draw]) => draw())
    this.deferredDraws.splice(0)
  }

  getAspect() {
    return this.width / this.height
  }

  setViewport(width: number, height: number) {
    this.width = width
    this.height = height
  }

  setView(view: mat4) {
    this.viewMatrix = view
    this.gl.uniformMatrix4fv(
      this.gl.getUniformLocation(this.defaultShader.program, "viewMatrix"),
      false,
      view,
    )
  }

  setAmbient(value: number) {
    this.gl.uniform1f(
      this.gl.getUniformLocation(this.defaultShader.program, "ambient"),
      value,
    )
  }

  setTexture(texture: Texture) {
    this.gl.activeTexture(this.gl.TEXTURE0)
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture.getTexture())
    this.gl.uniform1i(
      this.gl.getUniformLocation(this.defaultShader.program, "meshTexture"),
      0,
    )
  }

  setWarp(plane: vec4, singularity: vec3, radius: number) {
    this.warpPlane = plane
    this.warpSingularity = singularity
    this.warpRadius = radius

    this.gl.uniform4f(
      this.gl.getUniformLocation(this.defaultShader.program, "warpPlane"),
      plane[0], plane[1], plane[2], plane[3],
    )

    this.gl.uniform3f(
      this.gl.getUniformLocation(this.defaultShader.program, "warpSingularity"),
      singularity[0], singularity[1], singularity[2]
    )

    this.gl.uniform1f(
      this.gl.getUniformLocation(this.defaultShader.program, "warpRadius"),
      radius,
    )
  }

  setHiderPivot(position: vec3) {
    const transformedPosition = vec3.transformMat4(position, mat4.mul(this.viewMatrix, this.matrix.slice(-1)[0]))
    this.gl.uniform1f(
      this.gl.getUniformLocation(this.defaultShader.program, "hiderPivotDepth"),
      transformedPosition[2],
    )
  }

  init() {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer.framebuffer)

    this.gl.useProgram(this.defaultShader.program)
    this.gl.viewport(0, 0, this.width, this.height)

    this.gl.clearColor(0.4, 0.6, 0.8, 1.0)
    this.gl.enable(this.gl.DEPTH_TEST)
    this.gl.depthFunc(this.gl.LEQUAL)
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT)

    this.gl.enable(this.gl.BLEND)
    this.gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA)

    this.gl.enable(this.gl.CULL_FACE)
    this.gl.cullFace(this.gl.BACK)

    this.gl.activeTexture(this.gl.TEXTURE1)
    this.gl.bindTexture(this.gl.TEXTURE_2D, ContentsManager.texture.alphaMask.getTexture())
    this.gl.uniform1i(
      this.gl.getUniformLocation(this.defaultShader.program, "alphaMask"),
      1,
    )

    this.gl.uniform2f(
      this.gl.getUniformLocation(this.defaultShader.program, "screenSize"),
      this.width, this.height,
    )

    this.gl.uniform1f(
      this.gl.getUniformLocation(this.defaultShader.program, "alphaMaskSize"),
      32,
    )

    this.gl.uniform1f(
      this.gl.getUniformLocation(this.defaultShader.program, "aspect"),
      this.width / this.height,
    )
  }

  getWrapPosition(worldPosition: vec3): vec3 {
    const relativePosition = vec3.sub(worldPosition, this.warpSingularity)
    const warpNormal = vec3.normalize(vec3.fromValues(-this.warpPlane[0], -this.warpPlane[1], -this.warpPlane[2]))
    const warpTangent = vec3.normalize(vec3.cross(warpNormal, vec3.fromValues(0.0, -1.0, 0.0)))
    const warpBitangent = vec3.cross(warpNormal, warpTangent)
    const radius = vec3.dot(warpNormal, relativePosition)
    const thetaTangent = vec3.dot(warpTangent, relativePosition) / this.warpRadius
    const thetaBitangent = vec3.dot(warpBitangent, relativePosition) / this.warpRadius
    return vec3.add(
      vec3.fromValues(
        Math.sin(thetaTangent) * this.warpRadius,
        Math.sin(thetaBitangent) * this.warpRadius,
        Math.cos(thetaTangent) * Math.cos(thetaBitangent) * radius,
      ),
      this.warpSingularity,
    )
  }

  drawText(key: string, text: string, position: vec3, style?: CSSProperties) {
    if (!(key in this.textNodes)) {
      const container = document.createElement("div")
      const inner = document.createElement("div")
      container.style.pointerEvents = "none"
      inner.style.pointerEvents = "none"
      container.appendChild(inner)
      document.querySelector("#labelPane")?.appendChild(container)
      this.textNodes[key] = { node: container, stale: false }
    }

    const container = this.textNodes[key].node
    const inner = container.querySelector("div")!

    this.textNodes[key].stale = false
    this.textNodes[key].node.style.display = "block"

    const viewPosition = vec3.transformMat4(this.getWrapPosition(position), this.viewMatrix)
    container.style.transform = `translate(${(viewPosition[0] / viewPosition[2]) * 50 + 50}vw, ${(-viewPosition[1] / viewPosition[2]) * 50 + 50}vh) translate(-50%, -50%)`
    container.style.zIndex = `${Math.floor(-viewPosition[2] * 1000 + 20000)}`
    container.className = "absolute left-0 top-0 text-white "
    inner.innerHTML = text

    Object.entries(style ?? {}).forEach(([key, value]) => {
      inner.style.setProperty(key.replaceAll(/([a-z])([A-Z])/g, "$1-$2"), value)
    })
  }

  collectTexts() {
    Object.entries(this.textNodes).forEach(([key, value]) => {
      if (value.stale) {
        document.querySelector("#labelPane")?.removeChild(value.node)
        delete this.textNodes[key]
      } else {
        value.stale = true
        value.node.style.display = "none"
      }
    })
  }

  postProcess() {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null)
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0)
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT)
    this.gl.viewport(0, 0, this.width, this.height)
    this.gl.disable(this.gl.DEPTH_TEST)
    this.gl.disable(this.gl.CULL_FACE)

    // Fetch Screen
    this.gl.useProgram(this.directFetchShader.program)

    this.gl.disable(this.gl.BLEND)

    this.gl.bindVertexArray(null)
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.directFetchScreenMesh)
    this.gl.enableVertexAttribArray(this.gl.getAttribLocation(this.directFetchShader.program, "a_position"))
    this.gl.vertexAttribPointer(
      this.gl.getAttribLocation(this.directFetchShader.program, "a_position"),
      2,
      this.gl.FLOAT,
      false,
      0,
      0,
    )

    this.gl.activeTexture(this.gl.TEXTURE0)
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.framebuffer.attachments[0])
    this.gl.uniform1i(
      this.gl.getUniformLocation(this.directFetchShader.program, "meshTexture"),
      0,
    )

    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)


    // Fetch Outline
    this.gl.useProgram(this.outlineShader.program)

    this.gl.enable(this.gl.BLEND)
    this.gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA)

    this.gl.bindVertexArray(null)
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.directFetchScreenMesh)
    this.gl.enableVertexAttribArray(this.gl.getAttribLocation(this.outlineShader.program, "a_position"))
    this.gl.vertexAttribPointer(
      this.gl.getAttribLocation(this.outlineShader.program, "a_position"),
      2,
      this.gl.FLOAT,
      false,
      0,
      0,
    )

    this.gl.activeTexture(this.gl.TEXTURE0)
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.framebuffer.attachments[1])
    this.gl.uniform1i(
      this.gl.getUniformLocation(this.outlineShader.program, "texturePosition"),
      0,
    )

    this.gl.activeTexture(this.gl.TEXTURE1)
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.framebuffer.attachments[2])
    this.gl.uniform1i(
      this.gl.getUniformLocation(this.outlineShader.program, "textureNormal"),
      1,
    )

    this.gl.uniform1f(
      this.gl.getUniformLocation(this.outlineShader.program, "aspect"),
      this.width / this.height,
    )

    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
  }
}

type Keys = "left" | "right" | "up" | "down" | "use" | "emotion"

export class KeyState implements Disposable {
  document: Document
  keyDownListener: (e: KeyboardEvent) => any
  keyUpListener: (e: KeyboardEvent) => any
  mouseDownListener: (e: MouseEvent) => any
  mouseUpListener: (e: MouseEvent) => any
  mouseMoveListener: (e: MouseEvent) => any
  touchStartListener: (e: TouchEvent) => any
  touchEndListener: (e: TouchEvent) => any
  touchMoveListener: (e: TouchEvent) => any

  keysRaw: Record<Keys, boolean>
  keys: Record<Keys, boolean>
  keysPressed: Record<Keys, boolean>
  keysReleased: Record<Keys, boolean>
  mouse: {
    downRaw: boolean,
    down: boolean,
    x: number,
    y: number,
    tapRaw: boolean,
    tap: boolean,
    pressedAt: Date,
  }

  disabled: boolean

  static KeyMaps: Record<Keys, string> = {
    left: "ArrowLeft",
    right: "ArrowRight",
    up: "ArrowUp",
    down: "ArrowDown",
    use: " ",
    emotion: "Shift",
  }

  constructor(document: Document) {
    const keyDownListener = (e: KeyboardEvent) => this.onKeyDown(e)
    document.addEventListener("keydown", keyDownListener)
    const keyUpListener = (e: KeyboardEvent) => this.onKeyUp(e)
    document.addEventListener("keyup", keyUpListener)

    const mouseDownListener = (e: MouseEvent) => this.onMouseDown(e)
    document.addEventListener("mousedown", mouseDownListener)
    const mouseUpListener = (e: MouseEvent) => this.onMouseUp(e)
    document.addEventListener("mouseup", mouseUpListener)
    const mouseMoveListener = (e: MouseEvent) => this.onMouseMove(e)
    document.addEventListener("mousemove", mouseMoveListener)

    const touchStartListener = (e: TouchEvent) => this.onTouchStart(e)
    document.addEventListener("touchstart", touchStartListener)
    const touchEndListener = (e: TouchEvent) => this.onTouchEnd(e)
    document.addEventListener("touchend", touchEndListener)
    const touchMoveListener = (e: TouchEvent) => this.onTouchMove(e)
    document.addEventListener("touchmove", touchMoveListener)

    this.document = document
    this.keyDownListener = keyDownListener
    this.keyUpListener = keyUpListener
    this.mouseDownListener = mouseDownListener
    this.mouseUpListener = mouseUpListener
    this.mouseMoveListener = mouseMoveListener
    this.touchStartListener = touchStartListener
    this.touchEndListener = touchEndListener
    this.touchMoveListener = touchMoveListener

    const defaultFalseKeys = Object.fromEntries(Object.keys(KeyState.KeyMaps)
      .map(key => [key, false] as [Keys, boolean])) as Record<Keys, boolean>

    this.keysRaw = { ...defaultFalseKeys }
    this.keys = { ...defaultFalseKeys }
    this.keysPressed = { ...defaultFalseKeys }
    this.keysReleased = { ...defaultFalseKeys }
    this.mouse = {
      downRaw: false,
      down: false,
      x: 0,
      y: 0,
      tapRaw: false,
      tap: false,
      pressedAt: new Date(),
    }

    this.disabled = false
  }

  update(time: Time) {
    Object.entries(KeyState.KeyMaps)
      .forEach(([key, value]) => {
        if (this.keysRaw[key as Keys]) {
          this.keysPressed[key as Keys] = !this.keys[key as Keys]
          this.keys[key as Keys] = true
        } else {
          this.keysReleased[key as Keys] = this.keys[key as Keys]
          this.keys[key as Keys] = false
        }
      })

    this.mouse.down = this.mouse.downRaw
    this.mouse.tap = this.mouse.tapRaw
    this.mouse.tapRaw = false
  }

  onDelete() {
    this.document.removeEventListener("keydown", this.keyDownListener)
    this.document.removeEventListener("keyup", this.keyUpListener)
    this.document.removeEventListener("mousedown", this.mouseDownListener)
    this.document.removeEventListener("mouseup", this.mouseUpListener)
    this.document.removeEventListener("mousemove", this.mouseMoveListener)
    this.document.removeEventListener("touchstart", this.touchStartListener)
    this.document.removeEventListener("touchend", this.touchEndListener)
    this.document.removeEventListener("touchmove", this.touchMoveListener)
  }

  onKeyDown(e: KeyboardEvent) {
    Object.entries(KeyState.KeyMaps)
      .forEach(([key, value]) => {
        if (e.key === value && !this.disabled) {
          this.keysRaw[key as Keys] = true
        }
      })
  }

  onKeyUp(e: KeyboardEvent) {
    Object.entries(KeyState.KeyMaps)
      .forEach(([key, value]) => {
        if (e.key === value) {
          this.keysRaw[key as Keys] = false
        }
      })
  }

  onMouseDown(e: MouseEvent) {
    if (!this.disabled) {
      this.mouse.downRaw = true
      this.mouse.x = e.x
      this.mouse.y = e.y
    }
  }

  onMouseUp(e: MouseEvent) {
    this.mouse.downRaw = false
  }

  onMouseMove(e: MouseEvent) {
    if (!this.disabled) {
      this.mouse.x = e.x
      this.mouse.y = e.y
    }
  }

  onTouchStart(e: TouchEvent) {
    e.preventDefault()
    if (!this.disabled) {
      this.mouse.downRaw = true
      this.mouse.x = e.touches[0].pageX
      this.mouse.y = e.touches[0].pageY
      this.mouse.pressedAt = new Date()
    }
  }

  onTouchEnd(e: TouchEvent) {
    e.preventDefault()
    this.mouse.downRaw = false
    if (new Date().getTime() - this.mouse.pressedAt.getTime() < 100) {
      this.mouse.tapRaw = true
    }
  }

  onTouchMove(e: TouchEvent) {
    e.preventDefault()
    if (!this.disabled) {
      this.mouse.x = e.touches[0].pageX
      this.mouse.y = e.touches[0].pageY
    }
  }

  disable() {
    this.disabled = true

    Object.entries(KeyState.KeyMaps)
      .forEach(([key, value]) => {
        this.keysPressed[key as Keys] = false
        this.keys[key as Keys] = false
      })

    this.mouse.down = false
  }

  enable() {
    this.disabled = false
  }
}

export interface Time {
  total: number,
  delta: number,
}

export interface RefCell<T> {
  value: T
}

export function ref<T>(x: T): RefCell<T> {
  return {
    value: x
  }
}