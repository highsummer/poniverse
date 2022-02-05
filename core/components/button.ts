import {Rect} from "./index";
import {KeyedSystem} from "../world/ecs";
import {RefCell} from "../world";
import {EmotionSpan, Player} from "./player";

export interface Button {
  mask: Rect
  hover: boolean
  active: boolean
  click: boolean
  disabled: boolean
}

export const ButtonInteract: KeyedSystem<{ button: RefCell<Button> }> = (world, time) => {
  world.ecs.join("button")
    .forEach(([key, button]) => {
      button.value.click = false

      if (button.value.disabled) {
        button.value.hover = false
        button.value.active = false
        return
      }

      const mouse = world.keyState.mouse

      button.value.hover = (
        button.value.mask.x1 <= mouse.graphicX &&
        button.value.mask.x2 > mouse.graphicX &&
        button.value.mask.y1 <= mouse.graphicY &&
        button.value.mask.y2 > mouse.graphicY
      )

      if (button.value.hover && mouse.pressed) {
        button.value.active = true
      }

      if (!mouse.down) {
        if (button.value.hover && button.value.active) {
          button.value.click = true
        }

        button.value.active = false
      }
    })
}

export interface EmotionButton {
  text: string
}

export const EmotionButtonInteract: KeyedSystem<{ button: RefCell<Button>, emotionButton: RefCell<EmotionButton>, player: RefCell<Player> }> = (world, time) => {
  const mainPlayer = world.ecs.join("player").find(([key, player]) => player.value.control)?.[1]
  if (mainPlayer === undefined) {
    return
  }

  world.ecs.join("button", "emotionButton")
    .forEach(([key, button, emotionButton]) => {
      if (button.value.click) {
        mainPlayer.value.emotion = emotionButton.value.text
        mainPlayer.value.emotionUntil = new Date(new Date().getTime() + EmotionSpan)
      }
    })
}

export const EmotionButtonDraw: KeyedSystem<{ button: RefCell<Button>, emotionButton: RefCell<EmotionButton> }> = (world, time) => {
  const draw = world.drawContext

  if (world.keyState.mode === "keyboard") {
    return
  }

  world.ecs.join("button", "emotionButton")
    .forEach(([key, button, emotionButton]) => {
      const textKey = `emotionButton#${emotionButton.value.text.split("").reduce((acc, x) => acc + x.charCodeAt(0), 0)}`
      const position = [(button.value.mask.x1 + button.value.mask.x2) / 2, (button.value.mask.y1 + button.value.mask.y2) / 2]
      draw.drawText(
        textKey,
        emotionButton.value.text,
        [position[0], position[1], 0],
        {
          backgroundColor: button.value.active ? "#ccca" : button.value.hover ? "#888a" : "#000a",
          border: button.value.hover ? "1px solid white" : "",
          padding: "0 12px",
          borderRadius: "6px",
          fontSize: "2.4rem",
        },
        "orthographic"
      )
    })
}
