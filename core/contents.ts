import {Disposable} from "./world";
import {parseObjFile} from "./objFile";
import {vec3, vec4} from "./declarativeLinalg";
import {vec2} from "gl-matrix";

export let ContentsManager: Contents

export function initContents(gl: WebGL2RenderingContext, shader: WebGLProgram) {
  GlobalCacheAsyncMesh.gl = gl
  GlobalCacheAsyncMesh.shader = shader
  ContentsManager = new Contents(gl, shader)
}

export function disposeContents() {
  ContentsManager?.onDelete()
}

const DefaultShaderAttributes = {
  position: {
    order: 0,
    size: 3,
    offset: 0,
  },
  normal: {
    order: 1,
    size: 3,
    offset: 0,
  },
  color: {
    order: 2,
    size: 4,
    offset: 0,
  },
  textureCoordinate: {
    order: 3,
    size: 2,
    offset: 0,
  },
}

const DefaultShaderStride = Object.entries(DefaultShaderAttributes)
  .sort(([ka, va], [kb, vb]) => va.order - vb.order)
  .reduce<number>(
    (acc, [k, v]) => {
      (DefaultShaderAttributes as any)[k]["offset"] = acc
      return acc + v.size * 4
    },
    0,
  )

export interface Mesh extends Disposable {
  draw(): void
}

export class AsyncMesh implements Mesh {
  innerMesh: Mesh | null

  constructor(gl: WebGL2RenderingContext, shader: WebGLProgram, src: string) {
    this.innerMesh = null
    fetch(src).then(async res => {
      if (res.status === 200) {
        const obj = await res.text()
        this.innerMesh = parseObjFile(new MeshBuilder(gl, shader), obj).build()
      }
    })
  }

  onDelete() {
    this.innerMesh?.onDelete()
  }

  draw() {
    this.innerMesh?.draw()
  }
}

const GlobalCacheAsyncMeshCache: Record<string, Mesh> = {}
export class GlobalCacheAsyncMesh implements Mesh {
  static gl: WebGL2RenderingContext
  static shader: WebGLProgram

  innerMesh: Mesh | null

  constructor(src: string) {
    if (!(src in GlobalCacheAsyncMeshCache)) {
      GlobalCacheAsyncMeshCache[src] = new AsyncMesh(GlobalCacheAsyncMesh.gl, GlobalCacheAsyncMesh.shader, src)
    }
    this.innerMesh = GlobalCacheAsyncMeshCache[src]
  }

  onDelete() {
    this.innerMesh?.onDelete()
  }

  draw() {
    this.innerMesh?.draw()
  }
}

export class InlineMesh implements Mesh {
  gl: WebGL2RenderingContext
  shader: WebGLProgram
  vertexBuffer: WebGLBuffer
  length: number
  vao: WebGLVertexArrayObject

  constructor(gl: WebGL2RenderingContext, shader: WebGLProgram, vertices: Float32Array) {
    const vertexBuffer = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

    const vao = gl.createVertexArray()!
    gl.bindVertexArray(vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)

    gl.enableVertexAttribArray(gl.getAttribLocation(shader, "a_position"))
    gl.vertexAttribPointer(
      gl.getAttribLocation(shader, "a_position"),
      DefaultShaderAttributes.position.size,
      gl.FLOAT,
      false,
      DefaultShaderStride,
      DefaultShaderAttributes.position.offset,
    )

    gl.enableVertexAttribArray(gl.getAttribLocation(shader, "a_normal"))
    gl.vertexAttribPointer(
      gl.getAttribLocation(shader, "a_normal"),
      DefaultShaderAttributes.normal.size,
      gl.FLOAT,
      false,
      DefaultShaderStride,
      DefaultShaderAttributes.normal.offset,
    )

    gl.enableVertexAttribArray(gl.getAttribLocation(shader, "a_color"))
    gl.vertexAttribPointer(
      gl.getAttribLocation(shader, "a_color"),
      DefaultShaderAttributes.color.size,
      gl.FLOAT,
      false,
      DefaultShaderStride,
      DefaultShaderAttributes.color.offset,
    )

    gl.enableVertexAttribArray(gl.getAttribLocation(shader, "a_textureCoordinate"))
    gl.vertexAttribPointer(
      gl.getAttribLocation(shader, "a_textureCoordinate"),
      DefaultShaderAttributes.textureCoordinate.size,
      gl.FLOAT,
      false,
      DefaultShaderStride,
      DefaultShaderAttributes.textureCoordinate.offset,
    )

    this.gl = gl
    this.shader = shader
    this.vertexBuffer = vertexBuffer
    this.length = vertices.length * 4 / DefaultShaderStride
    this.vao = vao
  }

  onDelete() {
    this.gl.deleteVertexArray(this.vao)
    this.gl.deleteBuffer(this.vertexBuffer)
  }

  draw() {
    this.gl.bindVertexArray(this.vao)
    this.gl.drawArrays(this.gl.TRIANGLES, 0, this.length)
  }
}

export class MeshBuilder {
  gl: WebGL2RenderingContext
  shader: WebGLProgram
  vertices: number[]

  constructor(gl: WebGL2RenderingContext, shader: WebGLProgram) {
    this.gl = gl
    this.shader = shader
    this.vertices = []
  }

  vertex(position: vec3, normal: vec3, color: vec4, textureCoordinate: vec2) {
    this.vertices.push(...Array.from(position))
    this.vertices.push(...Array.from(normal))
    this.vertices.push(...Array.from(color))
    this.vertices.push(...Array.from(textureCoordinate))

    return this
  }

  build(): Mesh {
    return new InlineMesh(this.gl, this.shader, new Float32Array(this.vertices))
  }
}

export interface Texture extends Disposable{
  getTexture(): WebGLTexture
}

export class AsyncTexture implements Texture {
  gl: WebGL2RenderingContext
  texture: WebGLTexture

  constructor(gl: WebGL2RenderingContext, src: string, repeat?: boolean) {
    const texture = gl.createTexture()!
    const pixel = new Uint8Array([0, 255, 255, 255])
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE)
    gl.generateMipmap(gl.TEXTURE_2D)
    gl.bindTexture(gl.TEXTURE_2D, null)

    const image = new Image()
    image.onload = function() {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
      gl.generateMipmap(gl.TEXTURE_2D)
    }
    image.src = src

    this.gl = gl
    this.texture = texture
  }

  onDelete() {
    this.gl.deleteTexture(this.texture)
  }

  getTexture() {
    return this.texture
  }
}

const GlobalCacheAsyncTextureCache: Record<string, Texture> = {}
export class GlobalCacheAsyncTexture implements Texture {
  static gl: WebGL2RenderingContext

  innerTexture: Texture | null

  constructor(src: string) {
    if (!(src in GlobalCacheAsyncTextureCache)) {
      GlobalCacheAsyncTextureCache[src] = new AsyncTexture(GlobalCacheAsyncMesh.gl, src)
    }
    this.innerTexture = GlobalCacheAsyncTextureCache[src]
  }

  onDelete() {
    this.innerTexture?.onDelete()
  }

  getTexture() {
    return this.innerTexture?.getTexture() ?? -1
  }
}

export class DataTexture implements Disposable, Texture {
  gl: WebGL2RenderingContext
  texture: WebGLTexture

  constructor(gl: WebGL2RenderingContext, src: Uint8Array, width: number, height: number, repeat?: boolean) {
    const texture = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, src)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE)
    gl.generateMipmap(gl.TEXTURE_2D)
    gl.bindTexture(gl.TEXTURE_2D, null)

    this.gl = gl
    this.texture = texture
  }

  onDelete() {
    this.gl.deleteTexture(this.texture)
  }

  getTexture() {
    return this.texture
  }
}

export class Contents implements Disposable {
  mesh: Record<
    "test" | "sprite" | "spriteMirror" | "tessellatedPlane" | "slogan" | "logo" | "sphere" |
    "toStatue" | "stem" | "studentCommunityHall" | "board",
    Mesh>
  texture: Record<
    "ponix[analyst]" | "ponixJump[analyst]" | "ponix[athletic]" | "ponixJump[athletic]" |
    "ponix[engineer]" | "ponixJump[engineer]" | "ponix[entrepreneur]" | "ponixJump[entrepreneur]" |
    "ponix[general_affairs]" | "ponixJump[general_affairs]" | "ponix[prepco]" | "ponixJump[prepco]" |
    "ponix[renovator]" | "ponixJump[renovator]" | "ponix[ta]" | "ponixJump[ta]" |
    "ponix[journalist]" | "ponixJump[journalist]" | "ponix[president]" | "ponixJump[president]" |
    "ponix[reader]" | "ponixJump[reader]" | "ponix[moderator]" | "ponixJump[moderator]" |
    "ponix[senior]" | "ponixJump[senior]" | "ponix[team_leader]" | "ponixJump[team_leader]" |
    "ponix[mentor]" | "ponixJump[mentor]" | "ponix[frontperson]" | "ponixJump[frontperson]" |
    "noise" | "grass" | "grassPattern" | "marble" | "sky" | "bark" | "bush1" |
    "studentCommunityHall" | "alphaMask" | "board" | "brick1" | "brick2" | "brick3",
    Texture>

  constructor(gl: WebGL2RenderingContext, shader: WebGLProgram) {
    this.mesh = {
      test: new MeshBuilder(gl, shader)
        .vertex([0, 1, 0], [0, 0, 1], [1, 1, 1, 1], [0, 0])
        .vertex([-1, -1, 0], [0, 0, 1], [1, 1, 1, 1], [0, 0])
        .vertex([1, -1, 0], [0, 0, 1], [1, 1, 1, 1], [0, 0])
        .build(),
      sprite: new MeshBuilder(gl, shader)
        .vertex([-1, 1, 0], [0, 0, 1], [1, 1, 1, 1], [0, 0])
        .vertex([-1, -1, 0], [0, 0, 1], [1, 1, 1, 1], [0, 1])
        .vertex([1, 1, 0], [0, 0, 1], [1, 1, 1, 1], [1, 0])
        .vertex([1, 1, 0], [0, 0, 1], [1, 1, 1, 1], [1, 0])
        .vertex([-1, -1, 0], [0, 0, 1], [1, 1, 1, 1], [0, 1])
        .vertex([1, -1, 0], [0, 0, 1], [1, 1, 1, 1], [1, 1])
        .build(),
      spriteMirror: new MeshBuilder(gl, shader)
        .vertex([-1, 1, 0], [0, 0, 1], [1, 1, 1, 1], [1, 0])
        .vertex([-1, -1, 0], [0, 0, 1], [1, 1, 1, 1], [1, 1])
        .vertex([1, 1, 0], [0, 0, 1], [1, 1, 1, 1], [0, 0])
        .vertex([1, 1, 0], [0, 0, 1], [1, 1, 1, 1], [0, 0])
        .vertex([-1, -1, 0], [0, 0, 1], [1, 1, 1, 1], [1, 1])
        .vertex([1, -1, 0], [0, 0, 1], [1, 1, 1, 1], [0, 1])
        .build(),
      tessellatedPlane: (() => {
        const delta = 0.5
        const builder = new MeshBuilder(gl, shader)
        for (let i = -1; i < 1; i += delta) {
          for (let j = -1; j < 1; j += delta) {
            const ni = i + delta
            const nj = j + delta
            builder.vertex([j, i, 0], [0, 0, 1], [1, 1, 1, 1], [(1 + j) / 2, (1 + i) / 2])
            builder.vertex([nj, i, 0], [0, 0, 1], [1, 1, 1, 1], [(1 + nj) / 2, (1 + i) / 2])
            builder.vertex([j, ni, 0], [0, 0, 1], [1, 1, 1, 1], [(1 + j) / 2, (1 + ni) / 2])
            builder.vertex([j, ni, 0], [0, 0, 1], [1, 1, 1, 1], [(1 + j) / 2, (1 + ni) / 2])
            builder.vertex([nj, i, 0], [0, 0, 1], [1, 1, 1, 1], [(1 + nj) / 2, (1 + i) / 2])
            builder.vertex([nj, ni, 0], [0, 0, 1], [1, 1, 1, 1], [(1 + nj) / 2, (1 + ni) / 2])
          }
        }

        return builder.build()
      })(),
      slogan: new AsyncMesh(gl, shader, "/models/slogan.obj"),
      logo: new AsyncMesh(gl, shader, "/models/logo.obj"),
      sphere: (() => {
        const builder = new MeshBuilder(gl, shader)
        const dPhi = Math.PI / 8;
        const dTheta = Math.PI / 8;
        for (let phi = -Math.PI / 2; phi < Math.PI / 2; phi += dPhi) {
          for (let theta = 0; theta < 2 * Math.PI; theta += dTheta) {
            const phiN = phi + dPhi;
            const thetaN = theta + dTheta;
            builder.vertex(
              [Math.cos(theta) * Math.cos(phi), Math.sin(theta) * Math.cos(phi), Math.sin(phi)],
              [Math.cos(theta) * Math.cos(phi), Math.sin(theta) * Math.cos(phi), Math.sin(phi)],
              [1, 1, 1, 1],
              [theta / 2 / Math.PI, phi / Math.PI + 0.5]
            )
            builder.vertex(
              [Math.cos(thetaN) * Math.cos(phi), Math.sin(thetaN) * Math.cos(phi), Math.sin(phi)],
              [Math.cos(thetaN) * Math.cos(phi), Math.sin(thetaN) * Math.cos(phi), Math.sin(phi)],
              [1, 1, 1, 1],
              [thetaN / 2 / Math.PI, phi / Math.PI + 0.5]
            )
            builder.vertex(
              [Math.cos(theta) * Math.cos(phiN), Math.sin(theta) * Math.cos(phiN), Math.sin(phiN)],
              [Math.cos(theta) * Math.cos(phiN), Math.sin(theta) * Math.cos(phiN), Math.sin(phiN)],
              [1, 1, 1, 1],
              [theta / 2 / Math.PI, phiN / Math.PI + 0.5]
            )
            builder.vertex(
              [Math.cos(theta) * Math.cos(phiN), Math.sin(theta) * Math.cos(phiN), Math.sin(phiN)],
              [Math.cos(theta) * Math.cos(phiN), Math.sin(theta) * Math.cos(phiN), Math.sin(phiN)],
              [1, 1, 1, 1],
              [theta / 2 / Math.PI, phiN / Math.PI + 0.5]
            )
            builder.vertex(
              [Math.cos(thetaN) * Math.cos(phi), Math.sin(thetaN) * Math.cos(phi), Math.sin(phi)],
              [Math.cos(thetaN) * Math.cos(phi), Math.sin(thetaN) * Math.cos(phi), Math.sin(phi)],
              [1, 1, 1, 1],
              [thetaN / 2 / Math.PI, phi / Math.PI + 0.5]
            )
            builder.vertex(
              [Math.cos(thetaN) * Math.cos(phiN), Math.sin(thetaN) * Math.cos(phiN), Math.sin(phiN)],
              [Math.cos(thetaN) * Math.cos(phiN), Math.sin(thetaN) * Math.cos(phiN), Math.sin(phiN)],
              [1, 1, 1, 1],
              [thetaN / 2 / Math.PI, phiN / Math.PI + 0.5]
            )
          }
        }
        return builder.build()
      })(),
      toStatue: new AsyncMesh(gl, shader, "/models/to_statue.obj"),
      stem: new AsyncMesh(gl, shader, "/models/stem.obj"),
      studentCommunityHall: new AsyncMesh(gl, shader, "/models/student_community_hall.obj"),
      board: new AsyncMesh(gl, shader, "/models/board.obj"),
    }

    this.texture = {
      noise: new DataTexture(
        gl,
        new Uint8Array(new Array(32 * 32).fill(0).flatMap(_ => [
          Math.floor(Math.random() * 255),
          Math.floor(Math.random() * 255),
          Math.floor(Math.random() * 255),
          255,
        ])),
        32,
        32,
        true,
      ),
      grass: new AsyncTexture(gl, "/textures/grass.png"),
      grassPattern: new AsyncTexture(gl, "/textures/grass_pattern.png", true),
      marble: new AsyncTexture(gl, "/textures/marble.png", true),
      sky: new AsyncTexture(gl, "/textures/sky.png", true),
      bark: new AsyncTexture(gl, "/textures/bark.png", true),
      bush1: new AsyncTexture(gl, "/textures/bush_1.png", true),
      studentCommunityHall: new AsyncTexture(gl, "/textures/student_community_hall.png", true),
      alphaMask: new AsyncTexture(gl, "/textures/alpha_mask.png", true),
      board: new AsyncTexture(gl, "/textures/board.png", true),
      brick1: new AsyncTexture(gl, "/textures/brick_1.png", true),
      brick2: new AsyncTexture(gl, "/textures/brick_2.png", true),
      brick3: new AsyncTexture(gl, "/textures/brick_3.png", true),
      ...Object.fromEntries(
        [
          "analyst", "athletic", "engineer", "entrepreneur", "general_affairs", "prepco",
          "renovator", "ta", "journalist", "president", "reader", "moderator",
          "senior", "team_leader", "mentor", "frontperson"
        ].flatMap(type => {
          return [
            [`ponix[${type}]`, new AsyncTexture(gl, `/sprites/ponix_${type}.png`)],
            [`ponixJump[${type}]`, new AsyncTexture(gl, `/sprites/ponix_jump_${type}.png`)]
          ]
        })
      ) as any as Record<
        "ponix[analyst]" | "ponixJump[analyst]" | "ponix[athletic]" | "ponixJump[athletic]" |
        "ponix[engineer]" | "ponixJump[engineer]" | "ponix[entrepreneur]" | "ponixJump[entrepreneur]" |
        "ponix[general_affairs]" | "ponixJump[general_affairs]" | "ponix[prepco]" | "ponixJump[prepco]" |
        "ponix[renovator]" | "ponixJump[renovator]" | "ponix[ta]" | "ponixJump[ta]" |
        "ponix[journalist]" | "ponixJump[journalist]" | "ponix[president]" | "ponixJump[president]" |
        "ponix[reader]" | "ponixJump[reader]" | "ponix[moderator]" | "ponixJump[moderator]" |
        "ponix[senior]" | "ponixJump[senior]" | "ponix[team_leader]" | "ponixJump[team_leader]" |
        "ponix[mentor]" | "ponixJump[mentor]" | "ponix[frontperson]" | "ponixJump[frontperson]",
        Texture
      >,
    }
  }

  onDelete() {
    Object.values(this.mesh).forEach(mesh => mesh.onDelete())
  }
}