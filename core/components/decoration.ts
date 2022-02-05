import {KeyedSystem, RefCell} from "../world";
import {mat4, vec3} from "../declarativeLinalg";
import seedrandom from "seedrandom";
import {ContentsManager} from "../contents";

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