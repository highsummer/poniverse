import {RefCell} from "../world";
import {mat4} from "../declarativeLinalg";
import {ContentsManager} from "../contents";
import {KeyedSystem} from "../world/ecs";

export interface Rect {
  x1: number,
  y1: number,
  x2: number,
  y2: number,
}

export namespace Rect {
  export function translate(r: Rect, x: number, y: number): Rect {
    return {x1: r.x1 + x, y1: r.y1 + y, x2: r.x2 + x, y2: r.y2 + y}
  }
}

export interface Test {
}

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

export interface Wall {
  mask: Rect
}