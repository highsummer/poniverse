import {Mesh, Texture} from "../contents";
import {RefCell, Time} from "../world";
import {mat4, vec3, vec4} from "../declarativeLinalg";
import React from "react";
import {Usable} from "./usable";
import {KeyedSystem} from "../world/ecs";

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
      draw.setAmbient(simpleModel.value.ambient ?? 0.75)
      draw.setTexture(simpleModel.value.texture())
      world.drawContext.draw(simpleModel.value.mesh())
      draw.popMatrix()
    })
}

export interface SimpleMultiModel {
  transforms: mat4[]
  textures: () => Texture[]
  meshes: () => Mesh[]
  ambient?: number
}

export const SimpleMultiModelDraw: KeyedSystem<{ transform: RefCell<mat4>, simpleMultiModel: RefCell<SimpleMultiModel> }> = (world, time) => {
  const draw = world.drawContext
  world.ecs.join("transform", "simpleMultiModel")
    .forEach(([key, transform, simpleMultiModel]) => {
      draw.pushMatrix()
      draw.addMatrix(transform.value)
      draw.setAmbient(simpleMultiModel.value.ambient ?? 0.75)

      const textures = simpleMultiModel.value.textures()
      const meshes = simpleMultiModel.value.meshes()
      const transforms = simpleMultiModel.value.transforms

      for (let i = 0; i < meshes.length; i++) {
        draw.pushMatrix()
        draw.addMatrix(transforms[i])
        draw.setTexture(textures[i])
        world.drawContext.draw(meshes[i])
        draw.popMatrix()
      }

      draw.popMatrix()
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

export interface SimpleMovement {
  move: (position: vec3, time: Time) => vec3
}

export const SimpleMovementMove: KeyedSystem<{ transform: RefCell<mat4>, simpleMovement: RefCell<SimpleMovement> }> = (world, time) => {
  world.ecs.join("transform", "simpleMovement")
    .forEach(([key, transform, simpleMovement]) => {
      const next = simpleMovement.value.move(mat4.getTranslation(transform.value), time)
      const delta = vec3.sub(next, mat4.getTranslation(transform.value))
      transform.value = mat4.mul(mat4.fromTranslation(delta), transform.value)
    })
}
