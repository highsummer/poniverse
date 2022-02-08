import {mat4, vec2, vec3, vec4} from "../declarativeLinalg";
import {ref, RefCell} from "../world";
import {ContentsManager} from "../contents";
import {Rect, Wall} from "./index";
import {KeyedSystem} from "../world/ecs";

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
  emotion: string
  emotionUntil: Date
}

const MoveAnimationFrameScale = 100
export const PlayerMaskSize = 0.3
const PlayerRemoteUpdateInterval = 200
export const EmotionSpan = 3000

export function aabbCollision(r1: Rect, r2: Rect): boolean {
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

      const d = world.keyState.keys.emotion ? vec2.fromValues(0, 0) : vec2.add(kd, md)

      const direction = vec2.normalize(d)
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

      if (world.keyState.keysReleased.emotion) {
        const kl = world.keyState.keys.left
        const kr = world.keyState.keys.right
        const ku = world.keyState.keys.up
        const kd = world.keyState.keys.down

        for (const [emotion, highlight] of ([
          ["←", false],
          ["→", false],
          ["↑", false],
          ["↓", false],
          ["❤️", kl && !kr && !ku && !kd],
          ["🎉", !kl && kr && !ku && !kd],
          ["✅", !kl && !kr && ku && !kd],
          ["😭", !kl && !kr && !ku && kd],
          ["🔥", kl && !kr && ku && !kd],
          ["👀", !kl && kr && ku && !kd],
          ["⬅️", kl && !kr && !ku && kd],
          ["➡️", !kl && kr && !ku && kd],
        ] as [string, boolean][])) {
          if (highlight) {
            player.value.emotion = emotion
            player.value.emotionUntil = new Date(new Date().getTime() + EmotionSpan)
          }
        }
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
          emotion: "",
          emotionUntil: new Date(),
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
    player.value.emotion = body.emotion
    player.value.emotionUntil = body.emotion !== "" ? new Date(new Date().getTime() + 500) : new Date(0)
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
        if (player.value.control) {
          draw.setHiderPivot([0.0, 0.0, 0.75])
        }
        draw.setAmbient(1)
        draw.setTexture(
          animationFrame === 0 ?
            (ContentsManager.texture as any)[`ponix[${player.value.type}]`] :
            (ContentsManager.texture as any)[`ponixJump[${player.value.type}]`]
        )
        world.drawContext.draw(player.value.direction === "left" ? ContentsManager.mesh.sprite : ContentsManager.mesh.spriteMirror)
        draw.popMatrix()
      })

      if (world.keyState.keys.emotion && player.value.control) {
        const kl = world.keyState.keys.left
        const kr = world.keyState.keys.right
        const ku = world.keyState.keys.up
        const kd = world.keyState.keys.down

        for (const [text, position, fontSize, highlight] of ([
          ["←", [-3.0, 0.0], 1, false],
          ["→", [3.0, 0.0], 1, false],
          ["↑", [0.0, 3.0], 1, false],
          ["↓", [0.0, -3.0], 1, false],
          ["❤️", [-2.0, 0.0], 1.5, kl && !kr && !ku && !kd],
          ["🎉", [2.0, 0.0], 1.5, !kl && kr && !ku && !kd],
          ["✅", [0.0, 2.0], 1.5, !kl && !kr && ku && !kd],
          ["😭", [0.0, -2.0], 1.5, !kl && !kr && !ku && kd],
          ["🔥", [-2.0, 2.0], 1.5, kl && !kr && ku && !kd],
          ["👀", [2.0, 2.0], 1.5, !kl && kr && ku && !kd],
          ["⬅️", [-2.0, -2.0], 1.5, kl && !kr && !ku && kd],
          ["➡️", [2.0, -2.0], 1.5, !kl && kr && !ku && kd],
        ] as [string, vec2, number, boolean][])) {
          draw.drawText(
            `playerEmotionOption#${text.split("").reduce((acc, x) => acc + x.charCodeAt(0), 0)}#${player.value.name}`,
            text,
            [position[0] / 10.0, position[1] / 10.0, 0.0],
            {
              backgroundColor: highlight ? "#888a" : "#000a",
              border: highlight ? "1px solid white" : "",
              padding: "0 6px",
              borderRadius: "3px",
              fontSize: `${fontSize}rem`,
            },
            "orthographic"
          )
        }
      }

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

      if (player.value.emotionUntil.getTime() > new Date().getTime()) {
        draw.drawText(
          `playerEmotion#${player.value.name}`,
          player.value.emotion,
          vec3.add(mat4.getTranslation(transform.value), vec3.fromValues(0, 0, 2.5)),
          {
            animation: "bounce 0.5s infinite",
            backgroundColor: "#fff",
            padding: "0 6px",
            borderRadius: "6px",
            border: "1px solid #cba",
            fontSize: "1.5rem",
          },
        )
      }

      if (player.value.control) {
        draw.pushMatrix()
        draw.addMatrix(transform.value)
        draw.addMatrix(mat4.fromScaling(vec3.fromValues(80.0, 80.0, -80.0)))
        draw.setAmbient(1)
        draw.setTexture(ContentsManager.texture.sky)
        world.drawContext.draw(ContentsManager.mesh.sphere)
        draw.popMatrix()
      }
    })
}