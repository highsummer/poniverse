import {Disposable} from "./index";

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
