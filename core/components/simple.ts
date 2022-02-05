import {Mesh, Texture} from "../contents";
import {KeyedSystem, RefCell} from "../world";
import {mat4} from "../declarativeLinalg";
import React from "react";
import {Usable} from "./usable";

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