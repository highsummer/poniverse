import {mat3, vec3, vec4} from "./declarativeLinalg";
import {MeshBuilder} from "./contents";
import {vec2} from "gl-matrix";

function parseVertex(arg: string) {
  const [indexPosition, indexTexture, indexNormal] = arg
    .split("/")
    .map(x => parseInt(x))
    .map(x => x - 1)

  return {
    position: indexPosition,
    texture: indexTexture,
    normal: indexNormal,
  }
}

export function parseObjFile(mesh: MeshBuilder, file: string): MeshBuilder {
  const positions: vec3[] = []
  const normals: vec3[] = []
  const textureCoordinates: vec2[] = []

  for (const lineRaw of file.split("\n")) {
    const line = lineRaw.includes("#") ? lineRaw.split("#")[0].trim() : lineRaw.trim()
    if (line.length === 0) {
      continue
    }

    const [command, ...args] = line.split(" ").filter(x => x)
    if (command === "v") {
      positions.push(vec3.fromValues(parseFloat(args[0]), parseFloat(args[1]), parseFloat(args[2])))
    } else if (command === "vt") {
      textureCoordinates.push(vec2.fromValues(parseFloat(args[0]), 1 - parseFloat(args[1])))
    } else if (command === "vn") {
      normals.push(vec3.fromValues(parseFloat(args[0]), parseFloat(args[1]), parseFloat(args[2])))
    } else if (command === "f") {
      const first = parseVertex(args[0])
      let last = parseVertex(args[1])
      for (const arg of args.slice(2)) {
        const vertex = parseVertex(arg)
        mesh.vertex(positions[first.position], normals[first.normal], vec4.fromValues(1.0, 1.0, 1.0, 1.0), textureCoordinates[first.texture])
        mesh.vertex(positions[last.position], normals[last.normal], vec4.fromValues(1.0, 1.0, 1.0, 1.0), textureCoordinates[last.texture])
        mesh.vertex(positions[vertex.position], normals[vertex.normal], vec4.fromValues(1.0, 1.0, 1.0, 1.0), textureCoordinates[vertex.texture])
        last = vertex
      }
    }
  }

  return mesh
}

export function parseObjFileWithOutline(mesh: MeshBuilder, file: string, width: number): MeshBuilder {
  parseObjFile(mesh, file)

  const positions: vec3[] = []
  const merged: number[] = []
  function addPosition(p: vec3) {
    const mergedPoint = positions.findIndex(po => vec3.length(vec3.sub(p, po)) < 1e-3)
    if (mergedPoint >= 0) {
      merged[positions.length] = mergedPoint
    } else {
      merged[positions.length] = positions.length
    }
    positions.push(p)
  }

  const faces: [vec3, vec3, vec3][] = []

  const edges: Record<string, [vec3, vec3, vec3][]> = {}
  function addEdge(i0: number, i1: number, p0: vec3, p1: vec3, n: vec3) {
    const key = `${Math.min(merged[i0], merged[i1])}:${Math.max(merged[i0], merged[i1])}`
    if (!(key in edges)) {
      edges[key] = []
    }
    edges[key].push(merged[i0] < merged[i1] ? [p0, p1, n] : [p1, p0, n])
  }

  const vertices: Record<string, vec3[]> = {}
  function addVertex(i: number, p: vec3) {
    const key = `${merged[i]}`
    if (!(key in edges)) {
      vertices[key] = []
    }
    vertices[key].push(p)
  }

  for (const lineRaw of file.split("\n")) {
    const line = lineRaw.includes("#") ? lineRaw.split("#")[0].trim() : lineRaw.trim()
    if (line.length === 0) {
      continue
    }

    const [command, ...args] = line.split(" ").filter(x => x)
    if (command === "v") {
      addPosition(vec3.fromValues(parseFloat(args[0]), parseFloat(args[1]), parseFloat(args[2])))
    } else if (command === "f") {
      const first = parseVertex(args[0])
      const temporaryCandidate0 = parseVertex(args[1])
      const temporaryCandidate1 = parseVertex(args[2])

      const v0 = vec3.sub(positions[temporaryCandidate0.position], positions[first.position])
      const v1 = vec3.sub(positions[temporaryCandidate1.position], positions[temporaryCandidate0.position])
      const normal = vec3.normalize(vec3.cross(v0, v1))
      const displacement = vec3.scale(normal, width)

      for (const arg of args) {
        const vertex = parseVertex(arg)
        addVertex(
          vertex.position,
          vec3.add(positions[vertex.position], displacement),
        )
      }

      let prev = parseVertex(args.slice(-1)[0])
      for (const arg of args) {
        const vertex = parseVertex(arg)
        addEdge(
          prev.position, vertex.position,
          vec3.add(positions[prev.position], displacement),
          vec3.add(positions[vertex.position], displacement),
          normal,
        )
        prev = vertex
      }

      let last = parseVertex(args[1])
      for (const arg of args.slice(2)) {
        const vertex = parseVertex(arg)

        faces.push([
          vec3.add(positions[first.position], displacement),
          vec3.add(positions[last.position], displacement),
          vec3.add(positions[vertex.position], displacement),
        ])

        last = vertex
      }
    }
  }

  for (const edgeGroup of Object.values(edges)) {
    if (edgeGroup.length !== 2) {
      continue
    }

    const [[p00, p01, n0], [p10, p11, n1]] = edgeGroup
    const normal = vec3.normalize(vec3.cross(
      vec3.sub(p10, p00),
      vec3.sub(p01, p10),
    ))

    if (vec3.dot(normal, n0) + vec3.dot(normal, n1) < 0) {
      mesh.vertex(p00, [0, 0, 0], [0, 0, 0, 1], [0, 0])
      mesh.vertex(p10, [0, 0, 0], [0, 0, 0, 1], [0, 0])
      mesh.vertex(p01, [0, 0, 0], [0, 0, 0, 1], [0, 0])
      mesh.vertex(p01, [0, 0, 0], [0, 0, 0, 1], [0, 0])
      mesh.vertex(p10, [0, 0, 0], [0, 0, 0, 1], [0, 0])
      mesh.vertex(p11, [0, 0, 0], [0, 0, 0, 1], [0, 0])
    } else {
      mesh.vertex(p00, [0, 0, 0], [0, 0, 0, 1], [0, 0])
      mesh.vertex(p01, [0, 0, 0], [0, 0, 0, 1], [0, 0])
      mesh.vertex(p10, [0, 0, 0], [0, 0, 0, 1], [0, 0])
      mesh.vertex(p01, [0, 0, 0], [0, 0, 0, 1], [0, 0])
      mesh.vertex(p11, [0, 0, 0], [0, 0, 0, 1], [0, 0])
      mesh.vertex(p10, [0, 0, 0], [0, 0, 0, 1], [0, 0])
    }
  }

  for (const vertexGroup of Object.values(vertices)) {
    const first = vertexGroup[0]
    let last = vertexGroup[1]

    for (const vertex of vertexGroup.slice(2)) {
      mesh.vertex(first, [0, 0, 0], [0, 0, 0, 1], [0, 0])
      mesh.vertex(last, [0, 0, 0], [0, 0, 0, 1], [0, 0])
      mesh.vertex(vertex, [0, 0, 0], [0, 0, 0, 1], [0, 0])
      last = vertex
    }
  }

  for (const [p0, p1, p2] of faces) {
    mesh.vertex(p0, [0, 0, 0], [0, 0, 0, 1], [0, 0])
    mesh.vertex(p2, [0, 0, 0], [0, 0, 0, 1], [0, 0])
    mesh.vertex(p1, [0, 0, 0], [0, 0, 0, 1], [0, 0])
  }

  return mesh
}