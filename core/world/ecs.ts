import {intersect} from "../utils";
import {World} from "./world";
import {Time} from "./index";

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
  return new Ecs({}, {update: [], draw: []})
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
    return new Ecs<K | L, S & { [P in L]: T }>({...this.storages, [name]: storage} as S & { [P in L]: T }, this.systems)
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
  create<KA extends K, VA extends S[KA], KB extends K, VB extends S[KB],
    KC extends K, VC extends S[KC], KD extends K, VD extends S[KD]>(ka: KA, va: VA, kb: KB, vb: VB, kc: KC, vc: VC, kd: KD, vd: VD): void
  create<KA extends K, VA extends S[KA], KB extends K, VB extends S[KB],
    KC extends K, VC extends S[KC], KD extends K, VD extends S[KD], KE extends K, VE extends S[KE]>(ka: KA, va: VA, kb: KB, vb: VB, kc: KC, vc: VC, kd: KD, vd: VD, ke: KE, ve: VE): void
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