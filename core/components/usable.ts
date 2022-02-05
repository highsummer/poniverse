import {RefCell} from "../world";
import {mat4, vec3} from "../declarativeLinalg";
import {Rect} from "./index";
import {aabbCollision, Player, PlayerMaskSize} from "./player";
import {KeyedSystem} from "../world/ecs";

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