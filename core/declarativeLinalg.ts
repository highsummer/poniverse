import {mat3 as imperativeMat3, mat4 as imperativeMat4, vec2 as imperativeVec2, vec3 as imperativeVec3, vec4 as imperativeVec4} from "gl-matrix";

function toDeclarativeUnary<T, U>(one: () => T, f: (out: T, a: U) => T) {
  return (a: U) => f(one(), a)
}

function toDeclarativeUnaryMulti<T, U>() {
  return function<K extends string, NS extends Record<"create", () => T> & Record<K, (out: T, a: U) => T>>(namespace: NS, ...keys: K[]): Record<"create", () => T> & Record<K, (a: U) => T> {
    return {
      create: namespace.create,
      ...(Object.fromEntries(keys.map(key => [key, toDeclarativeUnary(namespace.create, namespace[key])])) as Record<K, (a: U) => T>)
    }
  }
}

function toDeclarativeBinary<T, U>(one: () => T, f: (out: T, a: T, b: U) => T) {
  return (a: T, b: U) => f(one(), a, b)
}

function toDeclarativeBinaryMulti<T, U>() {
  return function<K extends string, NS extends Record<"create", () => T> & Record<K, (out: T, a: T, b: U) => T>>(namespace: NS, ...keys: K[]): Record<"create", () => T> & Record<K, (a: T, b: U) => T> {
    return {
      create: namespace.create,
      ...(Object.fromEntries(keys.map(key => [key, toDeclarativeBinary(namespace.create, namespace[key])])) as Record<K, (a: T, b: U) => T>)
    }
  }
}

export type vec2 = imperativeVec2;
export const vec2 = {
  imperative: imperativeVec2,
  ...imperativeVec2,
  ...toDeclarativeUnaryMulti<imperativeVec2, imperativeVec2>()(imperativeVec2, "normalize", "negate"),
  ...toDeclarativeBinaryMulti<imperativeVec2, number>()(imperativeVec2, "scale"),
  ...toDeclarativeBinaryMulti<imperativeVec2, imperativeVec2>()(imperativeVec2, "add", "sub"),
  transformMat3: (v: vec2, mat: mat3) => imperativeVec2.transformMat3(imperativeVec2.create(), imperativeVec2.fromValues(v[0], v[1]), mat),
  lerp: (a: vec2, b: vec2, t: number) => imperativeVec2.lerp(imperativeVec2.create(), a, b, t),
}

export type vec3 = imperativeVec3;
export const vec3 = {
  imperative: imperativeVec3,
  ...imperativeVec3,
  ...toDeclarativeUnaryMulti<imperativeVec3, imperativeVec3>()(imperativeVec3, "normalize", "negate"),
  ...toDeclarativeBinaryMulti<imperativeVec3, number>()(imperativeVec3, "scale"),
  ...toDeclarativeBinaryMulti<imperativeVec3, imperativeVec3>()(imperativeVec3, "add", "sub", "cross", "mul", "multiply"),
  transformMat3: (v: vec3, mat: mat3) => imperativeVec3.transformMat3(imperativeVec3.create(), imperativeVec3.fromValues(v[0], v[1], v[2]), mat),
  transformMat4: (v: vec3, mat: mat4) => imperativeVec4.transformMat4(imperativeVec4.create(), imperativeVec4.fromValues(v[0], v[1], v[2], 1), mat),
  lerp: (a: vec3, b: vec3, t: number) => imperativeVec3.lerp(imperativeVec3.create(), a, b, t),
}

export type vec4 = imperativeVec4;
export const vec4 = {
  imperative: imperativeVec4,
  ...imperativeVec4,
  xyz: (v: vec4) => vec3.fromValues(v[0], v[1], v[2]),
  ...toDeclarativeBinaryMulti<imperativeVec4, imperativeVec4>()(imperativeVec4, "sub", "add", "mul"),
  transformMat4: (v: vec4, mat: mat4) => imperativeVec4.transformMat4(imperativeVec4.create(), v, mat),
}

export type mat3 = imperativeMat3;
export const mat3 = {
  imperative: imperativeMat3,
  ...imperativeMat3,
  ...toDeclarativeUnaryMulti<imperativeMat3, imperativeMat3>()(imperativeMat3, "invert"),
  ...toDeclarativeBinaryMulti<imperativeMat3, imperativeMat3>()(imperativeMat3, "sub", "add", "mul"),
  mulAll,
}

function mulAll(...mats: mat4[]): mat4 {
  if (mats.length === 1) {
    return mats[0]
  } else {
    return mulAll(mat4.mul(mats[0], mats[1]), ...mats.slice(2))
  }
}

export type mat4 = imperativeMat4;
export const mat4 = {
  imperative: imperativeMat4,
  ...imperativeMat4,
  ...toDeclarativeUnaryMulti<imperativeMat4, imperativeMat4>()(imperativeMat4, "invert"),
  ...toDeclarativeUnaryMulti<imperativeMat4, number>()(imperativeMat4, "fromXRotation", "fromYRotation", "fromZRotation"),
  ...toDeclarativeUnaryMulti<imperativeMat4, imperativeVec3>()(imperativeMat4, "fromTranslation", "fromScaling"),
  ...toDeclarativeBinaryMulti<imperativeMat4, imperativeMat4>()(imperativeMat4, "sub", "add", "mul"),
  ...toDeclarativeBinaryMulti<imperativeMat4, number>()(imperativeMat4, "rotateX", "rotateY", "rotateZ"),
  ...toDeclarativeBinaryMulti<imperativeMat4, vec3>()(imperativeMat4, "translate", "scale"),
  rotate: (a: mat4, angle: number, axis: vec3) => imperativeMat4.rotate(mat4.create(), a, angle, axis),
  ortho: (left: number, right: number, bottom: number, top: number, near: number, far: number) => imperativeMat4.ortho(mat4.create(), left, right, bottom, top, near, far),
  perspective: (fovy: number, aspect: number, near: number, far: number) => imperativeMat4.perspective(mat4.create(), fovy, aspect, near, far),
  getTranslation: (mat: mat4) => imperativeMat4.getTranslation(vec3.create(), mat),
  mulAll,
}