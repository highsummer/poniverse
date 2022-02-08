import {mat4, vec3, vec4} from "../declarativeLinalg";
import {ContentsManager, Mesh, Texture} from "../contents";
import {CSSProperties} from "react";
import {Disposable} from "./index";
import {ShaderProgram} from "./shader";

const shaderSourceDirectFetchVertex = require("../../src/shader/directFetch.vert")
const shaderSourceDirectFetchFragment = require("../../src/shader/directFetch.frag")

const shaderSourceSSAO = require("../../src/shader/ssao.frag")
const shaderSourceOutline = require("../../src/shader/outline.frag")
const shaderSourceFetchOcclusion = require("../../src/shader/fetchOcclusion.frag")
const shaderSourceFetchOutline = require("../../src/shader/fetchOutline.frag")

const shaderSourceVertex = require("../../src/shader/vertex.vert")
const shaderSourceFragment = require("../../src/shader/fragment.frag")

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
    this.gl.blendEquationSeparate(this.gl.FUNC_ADD, this.gl.FUNC_ADD)
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

  drawText(key: string, text: string, position: vec3, style?: CSSProperties, mode: "immersive" | "orthographic" = "immersive") {
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

    const scaleByScreen = window.innerHeight / 768

    if (mode === "immersive") {
      const viewPosition = vec3.transformMat4(this.getWrapPosition(position), this.viewMatrix)
      container.style.transform = `translate(${(viewPosition[0] / viewPosition[2]) * 50 + 50}vw, ${(-viewPosition[1] / viewPosition[2]) * 50 + 50}vh) translate(-50%, -50%) scale(${scaleByScreen})`
      container.style.zIndex = `${Math.floor(-viewPosition[2] * 1000 + 20000)}`
    } else if (mode === "orthographic") {
      const aspect = window.innerWidth / window.innerHeight
      container.style.transform = `translate(${position[0] / aspect * 50 + 50}vw, ${-position[1] * 50 + 50}vh) translate(-50%, -50%) scale(${scaleByScreen})`
      container.style.zIndex = `${Math.floor(-position[2] * 1000 + 20000)}`
    }
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
    this.gl.blendEquationSeparate(this.gl.FUNC_REVERSE_SUBTRACT, this.gl.FUNC_ADD)
    this.gl.blendFunc(this.gl.ONE, this.gl.ONE)
    // this.gl.blendFunc(this.gl.FUNC_REVERSE_SUBTRACT, this.gl.FUNC_REVERSE_SUBTRACT)

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
