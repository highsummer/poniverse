import React from "react"
import {KeyedSystem, ref, RefCell} from "./world";
import {mat4, vec2, vec3, vec4} from "./declarativeLinalg";
import {ContentsManager, Mesh, Texture} from "./contents";
import seedrandom from "seedrandom";

export interface Player {
  type: string
  username: string,
  name: string
  direction: "left" | "right"
  moveAnimation: number
  lastLocationUpdated: Date
  control: boolean
  validUntil: Date
  sourcePosition: vec3
  targetPosition: vec3
  targetPositionRefreshed: Date
}

const MoveAnimationFrameScale = 100
const PlayerMaskSize = 0.3
const PlayerRemoteUpdateInterval = 200

export interface Rect {
  x1: number,
  y1: number,
  x2: number,
  y2: number,
}

export namespace Rect {
  export function translate(r: Rect, x: number, y: number): Rect {
    return { x1: r.x1 + x, y1: r.y1 + y, x2: r.x2 + x, y2: r.y2 + y }
  }
}

function aabbCollision(r1: Rect, r2: Rect): boolean {
  return r1.x1 < r2.x2 && r1.x2 > r2.x1 && r1.y1 < r2.y2 && r1.y2 > r2.y1
}

export const PlayerMove: KeyedSystem<{ transform: RefCell<mat4>, player: RefCell<Player>, wall: RefCell<Wall> }> = (world, time) => {
  world.ecs.join("transform", "player")
    .filter(([key, transform, player]) => player.value.control)
    .forEach(([key, transform, player]) => {
      const kdx = ((world.keyState.keys.left ? -1 : 0) + (world.keyState.keys.right ? 1 : 0))
      const kdy = ((world.keyState.keys.down ? -1 : 0) + (world.keyState.keys.up ? 1 : 0))
      const kd = vec2.normalize(vec2.fromValues(kdx, kdy))

      const mdx = world.keyState.mouse.down ? world.keyState.mouse.x - world.drawContext.width / 2 / window.devicePixelRatio : 0
      const mdy = world.keyState.mouse.down ? world.keyState.mouse.y - world.drawContext.height / 2 / window.devicePixelRatio : 0
      const md = vec2.normalize(vec2.fromValues(mdx, -mdy))

      const direction = vec2.normalize(vec2.add(kd, md))
      const position = mat4.getTranslation(transform.value)
      const mask: Rect = Rect.translate(
        {
          x1: -PlayerMaskSize / 2,
          y1: -PlayerMaskSize / 2,
          x2: PlayerMaskSize / 2,
          y2: PlayerMaskSize / 2,
        }, position[0], position[1]
      )

      const [dx, dy] = world.ecs.join("transform", "wall")
        .reduce<[number, number]>(
          ([dx, dy], [key, transform, wall]) => {
            const translation = mat4.getTranslation(transform.value)
            const wallMask: Rect = Rect.translate(wall.value.mask, translation[0], translation[1])
            return [
              aabbCollision(Rect.translate(mask, dx, 0), wallMask) ? 0 : dx,
              aabbCollision(Rect.translate(mask, 0, dy), wallMask) ? 0 : dy,
            ]
          },
          [direction[0] * time.delta * 0.007, direction[1] * time.delta * 0.005] as [number, number]
        )

      transform.value = mat4.translate(transform.value, vec3.fromValues(dx, dy, 0))

      if (dx > 0) {
        player.value.direction = "right"
      } else if (dx < 0) {
        player.value.direction = "left"
      }

      if (new Date().getTime() - player.value.lastLocationUpdated.getTime() > PlayerRemoteUpdateInterval) {
        const newPosition = mat4.getTranslation(transform.value)
        world.socket.updateLocation(player.value, "main", [newPosition[0], newPosition[1]])
        player.value.lastLocationUpdated = new Date()
      }

      if (Math.abs(dx) + Math.abs(dy) > 0) {
        if (player.value.moveAnimation === 0) {
          player.value.moveAnimation = MoveAnimationFrameScale * 0.8
        } else {
          player.value.moveAnimation += time.delta
        }
      } else {
        player.value.moveAnimation = 0
      }
    })
}

export const PlayerTargetMove: KeyedSystem<{ transform: RefCell<mat4>, player: RefCell<Player>, wall: RefCell<Wall> }> = (world, time) => {
  world.ecs.join("transform", "player")
    .filter(([key, transform, player]) => !player.value.control)
    .forEach(([key, transform, player]) => {
      const k = (new Date().getTime() - player.value.targetPositionRefreshed.getTime()) / PlayerRemoteUpdateInterval
      if (k >= 0 && k <= 1) {
        const origin = mat4.getTranslation(transform.value)
        transform.value = mat4.fromTranslation(vec3.lerp(player.value.sourcePosition, player.value.targetPosition, k))
        const delta = vec3.sub(mat4.getTranslation(transform.value), origin)

        if (delta[0] > 0) {
          player.value.direction = "right"
        } else if (delta[0] < 0) {
          player.value.direction = "left"
        }

        if (vec3.length(delta) > 0) {
          if (player.value.moveAnimation === 0) {
            player.value.moveAnimation = MoveAnimationFrameScale * 0.8
          } else {
            player.value.moveAnimation += time.delta
          }
        } else {
          player.value.moveAnimation = 0
        }
      }
    })
}

export const PlayerRemoteMove: KeyedSystem<{ transform: RefCell<mat4>, player: RefCell<Player> }> = (world, time) => {
  const name = window.localStorage.getItem("authUser")
  const players = world.ecs.join("player")

  for (const body of world.queue.updateLocation) {
    if (body.userId === name) {
      continue
    }

    if (players.every(([key, player]) => player.value.name !== body.userId)) {
      world.ecs.create(
        "transform", ref(mat4.fromTranslation(vec3.fromValues(body.position[0], body.position[1], 0))),
        "player", ref({
          type: "ta",
          name: body.userId,
          direction: "left" as const,
          moveAnimation: 0,
          lastLocationUpdated: new Date(),
          username: body.userId,
          control: false,
          validUntil: new Date(new Date().getTime() + 2000),
          sourcePosition: vec3.fromValues(body.position[0], body.position[1], 0),
          targetPosition: vec3.fromValues(body.position[0], body.position[1], 0),
          targetPositionRefreshed: new Date(),
        })
      )
    }
  }

  world.ecs.join("transform", "player").forEach(([key, transform, player]) => {
    const body = world.queue.updateLocation.find(body => body.userId === player.value.name)
    if (body === undefined) {
      return
    }

    if (body.userId === name) {
      return
    }

    player.value.type = body.playerType
    player.value.sourcePosition = mat4.getTranslation(transform.value)
    player.value.targetPosition = [body.position[0], body.position[1], 0]
    player.value.targetPositionRefreshed = new Date()
    player.value.validUntil = new Date(new Date().getTime() + 2000)
  })

  const remoteUserNames = world.queue.updateLocation.map(body => body.userId)

  for (const [key, player] of players) {
    if (player.value.control) {
      continue
    }

    if (remoteUserNames.every(remoteUsername => remoteUsername !== player.value.name) && player.value.validUntil.getTime() < new Date().getTime()) {
      world.ecs.remove(key)
    }
  }

  world.queue.updateLocation.splice(-1)
}

export const PlayerDraw: KeyedSystem<{ transform: RefCell<mat4>, player: RefCell<Player> }> = (world, time) => {
  const draw = world.drawContext

  world.ecs.join("transform", "player")
    .forEach(([key, transform, player]) => {
      if (player.value.control) {
        draw.setView(mat4.mulAll(
          mat4.perspective(Math.PI / 2, draw.getAspect(), 0.1, 1000),
          mat4.fromXRotation(Math.PI * 0.17),
          mat4.fromXRotation(-Math.PI / 2),
          mat4.fromTranslation(vec3.fromValues(0.0, 8.0, -5.5)),
          mat4.fromTranslation(vec3.negate(mat4.getTranslation(transform.value))),
        ))

        const singularity = vec3.add(vec3.fromValues(0.0, 0.0, -60.0), mat4.getTranslation(transform.value))
        draw.setWarp(
          vec4.fromValues(0.0, 0.0, -1.0, 60.0),
          singularity,
          60.0,
        )
      }

      draw.drawDeferPosition(mat4.getTranslation(transform.value), () => {
        const animationFrame = Math.floor(player.value.moveAnimation / MoveAnimationFrameScale) % 2
        draw.pushMatrix()
        draw.addMatrix(transform.value)
        draw.addMatrix(mat4.fromTranslation(vec3.fromValues(0, 0, animationFrame === 0 ? 1 : 1.1)))
        draw.addMatrix(mat4.fromXRotation(Math.PI / 2))
        draw.setHiderPivot([0.0, 0.0, 0.75])
        draw.setAmbient(1)
        draw.setTexture(
          animationFrame === 0 ?
            (ContentsManager.texture as any)[`ponix[${player.value.type}]`] :
            (ContentsManager.texture as any)[`ponixJump[${player.value.type}]`]
        )
        world.drawContext.draw(player.value.direction === "left" ? ContentsManager.mesh.sprite : ContentsManager.mesh.spriteMirror)
        draw.popMatrix()
      })

      draw.drawText(
        `playerName#${player.value.name}`,
        player.value.name,
        vec3.add(mat4.getTranslation(transform.value), vec3.fromValues(0, 0, -0.5)),
        {
          backgroundColor: "#000a",
          padding: "0 3px",
          borderRadius: "3px",
          fontSize: "0.8rem",
        },
      )

      draw.pushMatrix()
      draw.addMatrix(transform.value)
      draw.addMatrix(mat4.fromScaling(vec3.fromValues(60.0, 60.0, -60.0)))
      draw.setAmbient(1)
      draw.setTexture(ContentsManager.texture.sky)
      world.drawContext.draw(ContentsManager.mesh.sphere)
      draw.popMatrix()
    })
}

export interface Test {}

export const TestDraw: KeyedSystem<{ transform: RefCell<mat4>, test: RefCell<Test> }> = (world, time) => {
  const draw = world.drawContext
  world.ecs.join("transform", "test")
    .forEach(([key, transform, test]) => {
      draw.drawDeferPosition(mat4.getTranslation(transform.value), () => {
        draw.pushMatrix()
        draw.addMatrix(transform.value)
        draw.addMatrix(mat4.fromXRotation(Math.PI / 2))
        draw.setAmbient(1)
        draw.setTexture(ContentsManager.texture.grass)
        world.drawContext.draw(ContentsManager.mesh.sprite)
        draw.popMatrix()
      })
    })
}

export interface SimpleModel {
  texture: () => Texture
  mesh: () => Mesh
  ambient?: number
}

export const SimpleModelDraw: KeyedSystem<{ transform: RefCell<mat4>, simpleModel: RefCell<SimpleModel> }> = (world, time) => {
  const draw = world.drawContext
  world.ecs.join("transform", "simpleModel")
    .forEach(([key, transform, simpleModel]) => {
      draw.pushMatrix()
      draw.addMatrix(transform.value)
      draw.setAmbient(simpleModel.value.ambient ?? 0.5)
      draw.setTexture(simpleModel.value.texture())
      world.drawContext.draw(simpleModel.value.mesh())
      draw.popMatrix()
    })
}

export interface Wall {
  mask: Rect
}

export interface Usable {
  range: Rect
  label: string
  hover: boolean
}

export const UsableUse: KeyedSystem<{ transform: RefCell<mat4>, player: RefCell<Player>, usable: RefCell<Usable> }> = (world, time) => {
  world.ecs.join("transform", "player")
    .filter(([key, transform, player]) => player.value.control)
    .forEach(([key, playerTransform, player]) => {
      const position = mat4.getTranslation(playerTransform.value)
      const playerMask: Rect = Rect.translate(
        {
          x1: -PlayerMaskSize / 2,
          y1: -PlayerMaskSize / 2,
          x2: PlayerMaskSize / 2,
          y2: PlayerMaskSize / 2,
        }, position[0], position[1]
      )

      world.ecs.join("transform", "usable")
        .forEach(([key, usableTransform, usable]) => {
          usable.value.hover = false

          const position = mat4.getTranslation(usableTransform.value)
          const usableMask: Rect = Rect.translate(usable.value.range, position[0], position[1])

          if (aabbCollision(playerMask, usableMask)) {
            usable.value.hover = true
          }
        })
    })
}

export const UsableDraw: KeyedSystem<{ transform: RefCell<mat4>, usable: RefCell<Usable> }> = (world, time) => {
  const draw = world.drawContext

  world.ecs.join("transform", "usable")
    .forEach(([key, transform, usable]) => {
      if (usable.value.hover) {
        draw.drawText(
          "usableLabel",
          `${usable.value.label}`,
          vec3.add(mat4.getTranslation(transform.value), vec3.fromValues(0, 0, 1.75)),
          {
            backgroundColor: "#000a",
            padding: "0 3px",
            borderRadius: "3px",
            color: "yellow",
            fontWeight: "bold",
          },
        )
      }
    })
}

export interface SimpleModal {
  contents: () => React.ReactNode
}

export const LaunchSimpleModal: KeyedSystem<{ transform: RefCell<mat4>, usable: RefCell<Usable>, simpleModal: RefCell<SimpleModal> }> = (world, time) => {
  world.ecs.join("transform", "usable", "simpleModal")
    .forEach(([key, transform, usable, simpleModal]) => {
      if (usable.value.hover && (world.keyState.keysPressed.use || world.keyState.mouse.tap)) {
        world.launchModal(simpleModal.value.contents())
      }
    })
}

export interface Tree {
  seed: number
}

export const TreeDraw: KeyedSystem<{ transform: RefCell<mat4>, tree: RefCell<Tree> }> = (world, time) => {
  const draw = world.drawContext
  world.ecs.join("transform", "tree")
    .forEach(([key, transform, tree]) => {
      const random = seedrandom(tree.value.seed.toString())

      draw.pushMatrix()
      draw.addMatrix(transform.value)
      draw.addMatrix(mat4.fromZRotation(random() * Math.PI * 2))
      draw.setAmbient(0.5)
      draw.setTexture(ContentsManager.texture.bark)
      draw.draw(ContentsManager.mesh.stem)
      draw.popMatrix()

      for (let i = 0; i < 3; i++) {
        for (let j = 0; j <= i; j++) {
          const factors: vec3 = [random() - 0.5, random() - 0.5, random() - 0.5]
          const displacement = vec3.add(
            vec3.multiply(
              vec3.add(
                vec3.multiply(
                  factors,
                  [0.25, 0.5, 0.25],
                ),
                [(j - i * 0.5) * 0.8, -0.25, 1 - i * 0.5],
              ),
              [1.5, 1, 1.5]
            ),
            [0, 0, 2.5]
          )

          draw.drawDeferPosition(
            vec3.add(mat4.getTranslation(transform.value), displacement),
            () => {
              draw.setAmbient(1.0)
              draw.pushMatrix()
              draw.addMatrix(transform.value)
              draw.addMatrix(mat4.fromTranslation(displacement))
              draw.addMatrix(mat4.fromXRotation(Math.PI / 2))
              draw.addMatrix(mat4.fromZRotation(random() * Math.PI * 2))
              draw.setTexture(ContentsManager.texture.bush1)
              draw.draw(ContentsManager.mesh.sprite)
              draw.popMatrix()
            }
          )
        }
      }
    })
}

