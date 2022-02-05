import React from "react"
import type { NextPage } from "next"
import {emptyEcs, KeyState, ref, RefCell, SparseStorage, World} from "../core/world";
import {mat4, vec3} from "../core/declarativeLinalg";
import {
  LaunchSimpleModal,
  Player,
  PlayerDraw,
  PlayerMove, PlayerRemoteMove, PlayerTargetMove, SimpleModal, SimpleModel, SimpleModelDraw,
  Test,
  TestDraw, Tree, TreeDraw, Usable, UsableDraw, UsableUse,
  Wall
} from "../core/components";
import {ContentsManager, disposeContents, initContents} from "../core/contents";
import OtIntroduction from "../components/OtIntroduction";
import seedrandom from "seedrandom"
import getConfig from "next/config";
import {useRouter} from "next/router";
import {useGlobalContext} from "./_app";

interface OuterState {
  width: number
  height: number
  userId: string | null
  world: World<string, any> | null
  ws: WebSocket | null
}

const Modal: React.FunctionComponent<{ show: boolean, onHide?: () => void }> = props => {
  const [opacity, setOpacity] = React.useState("opacity-0")
  const [hider, setHider] = React.useState("")

  React.useEffect(() => {
    if (props.show) {
      setHider("")
      setTimeout(() => setOpacity("opacity-100 "), 10)
    } else {
      setOpacity("opacity-0 ")
      setTimeout(() => setHider("hidden "), 100)
    }
  }, [props.show])

  return (
    <div
      className={"modal fixed flex flex-col justify-center items-center w-screen h-screen bg-slate-900/75 left-0 top-0 px-6 transition-opacity " + opacity + hider}
      style={{ zIndex: "90000" }}
      onClick={e => {
        e.stopPropagation()
        props.onHide?.()
      }}
      onTouchEnd={e => {
        e.stopPropagation()
        props.onHide?.()
      }}
    >
      <div
        className={"max-w-screen-md w-full rounded-md bg-white shadow-2xl shadow-black mb-8 px-8 py-4"}
        onClick={e => { e.stopPropagation() }}
        onTouchEnd={e => { e.stopPropagation() }}
      >
        {props.children}
      </div>
      <button
        className={"text-white rounded outline outline-1 text-xl px-6 py-1 hover:bg-white/25 transition-all active:outline-4 click-on-space"}
        onClick={e => {
          e.stopPropagation()
          props.onHide?.()
        }}
        onTouchEnd={e => {
          e.stopPropagation()
          props.onHide?.()
        }}
      >
        확인
      </button>
    </div>
  )
}

const Poniverse: NextPage = () => {
  const router = useRouter()
  const globalCtx = useGlobalContext()
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const outerStateRef = React.useRef<OuterState>({ width: 0, height: 0, userId: null, world: null, ws: null })
  const [world, setWorld] = React.useState<World<any, any> | null>(null)
  const [showModal, setShowModal] = React.useState(false)
  const [modalContents, setModalContents] = React.useState<React.ReactNode>(undefined)

  React.useEffect(() => {
    outerStateRef.current.world = world
  }, [world])

  React.useEffect(() => {
    if (showModal) {
      world?.keyState.disable()
    } else  {
      world?.keyState.enable()
    }
  }, [showModal, world])

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (canvas !== null) {
      const gl = canvas.getContext("webgl2")
      if (gl !== null) {
        const ecs = emptyEcs()
          .attach("transform", new SparseStorage<RefCell<mat4>>())
          .attach("player", new SparseStorage<RefCell<Player>>())
          .attach("test", new SparseStorage<RefCell<Test>>())
          .attach("simpleModel", new SparseStorage<RefCell<SimpleModel>>())
          .attach("wall", new SparseStorage<RefCell<Wall>>())
          .attach("usable", new SparseStorage<RefCell<Usable>>())
          .attach("simpleModal", new SparseStorage<RefCell<SimpleModal>>())
          .attach("tree", new SparseStorage<RefCell<Tree>>())
          .register("update", PlayerMove)
          .register("update", PlayerTargetMove)
          .register("update", PlayerRemoteMove)
          .register("draw", PlayerDraw)
          .register("draw", TestDraw)
          .register("draw", SimpleModelDraw)
          .register("update", UsableUse)
          .register("draw", UsableDraw)
          .register("update", LaunchSimpleModal)
          .register("draw", TreeDraw)

        ecs.create(
          "transform", ref(mat4.create()),
          "simpleModel", ref({
            mesh: () => ContentsManager.mesh.slogan,
            texture: () => ContentsManager.texture.marble,
          }),
          "wall", ref({ mask: { x1: -7.75, y1: -0.3, x2: 8.5, y2: 0.3 } }),
          "usable", ref({
            label: "📖 새터",
            range:  { x1: -7.75 - 1, y1: -0.3 - 1, x2: 8.5 + 1, y2: 0.3 + 1 },
            hover: false,
          }),
          "simpleModal", ref({
            contents: () => <div>
              <OtIntroduction />
            </div>,
          }),
        )
        ecs.create(
          "transform", ref(mat4.fromTranslation(vec3.fromValues(0.0, 2.0, 0.0))),
          "simpleModel", ref({
            mesh: () => ContentsManager.mesh.toStatue,
            texture: () => ContentsManager.texture.marble,
          }),
          "wall", ref({ mask: { x1: -1.75, y1: -1.75, x2: 1.75, y2: 1.75 } })
        )

        ecs.create(
          "transform", ref(mat4.fromTranslation(vec3.fromValues(10.0, 2.0, 0.0))),
          "simpleModel", ref({
            mesh: () => ContentsManager.mesh.studentCommunityHall,
            texture: () => ContentsManager.texture.studentCommunityHall,
          }),
          "wall", ref({ mask: { x1: -1.75, y1: -1.75, x2: 1.75, y2: 1.75 } })
        )

        const random = seedrandom("")

        for (let i = -3; i < 4; i++) {
          for (let j = -3; j < 4; j++) {
            const x = j * 10
            const y = i * 10
            ecs.create(
              "transform", ref(mat4.mulAll(
                mat4.fromTranslation(vec3.fromValues(x, y, 0.0)),
                mat4.fromScaling(vec3.fromValues(5.0, 5.0, 1.0)),
              )),
              "simpleModel", ref({
                mesh: () => ContentsManager.mesh.tessellatedPlane,
                texture: () => ContentsManager.texture.grassPattern,
              })
            )
          }
        }

        for (let i = -3; i < 0; i++) {
          for (let j = -3; j < 4; j++) {
            ecs.create(
              "transform", ref(mat4.mulAll(
                mat4.fromTranslation(vec3.fromValues(j * 4, i * 4 + 18, 0.0)),
                mat4.fromTranslation(vec3.fromValues((random() - 0.5) * 3, (random() - 0.5) * 3, 0.0)),
                mat4.fromScaling(vec3.fromValues(1.0, 1.0, 1.0)),
              )),
              "tree", ref({
                seed: random(),
              }),
              "wall", ref({
                mask: { x1: -0.5, y1: -0.5, x2: 0.5, y2: 0.5 }
              })
            )
          }
        }


        for (let i = 0; i < 100; i++) {
          ecs.create(
            "transform", ref(mat4.mulAll(
              mat4.fromTranslation(vec3.fromValues(
                (random() * 2 - 1) * 10,
                (random() * 2 - 1) * 10,
                0.35,
              )),
              mat4.fromXRotation(Math.PI / 2),
              mat4.fromScaling([0.35, 0.35, 0.35]),
            )),
            "simpleModel", ref({
              mesh: () => ContentsManager.mesh.sprite,
              texture: () => ContentsManager.texture.grass,
              ambient: 1,
            }),
          )
        }

        const keyState = new KeyState(document)

        const world = new World(
          canvas, window.innerWidth * window.devicePixelRatio, window.innerHeight * window.devicePixelRatio,
          ecs, keyState,
          (node: React.ReactNode) => {
            setModalContents(node)
            setShowModal(true)
          }
        )

        initContents(gl, world.drawContext.defaultShader.program)

        let stopWebSocket = false
        const connect = () => {
          const ws = new WebSocket("wss://a3ek0tva1l.execute-api.ap-northeast-2.amazonaws.com/dev")
          outerStateRef.current.ws = ws

          ws.onopen = (e) => {
            outerStateRef.current.world?.initWebsocket(ws)
          }

          ws.onclose = (e) => {
            if (!stopWebSocket) {
              connect()
            }
          }
        }

        connect()
        setWorld(world)

        return () => {
          world.onDelete()
          stopWebSocket = true
          // eslint-disable-next-line react-hooks/exhaustive-deps
          outerStateRef.current.ws?.close()
          keyState.onDelete()
        }
      }
    }
  }, [])

  React.useEffect(() => {
    if (globalCtx.user !== null && world !== null) {
      if (globalCtx.user.type !== null) {
        world.ecs.create(
          "transform", ref(mat4.fromTranslation(vec3.fromValues(0.0, -3.0, 0.0))),
          "player", ref({
            direction: "right" as const,
            moveAnimation: 0,
            type: globalCtx.user.type,
            username: globalCtx.authUser,
            name: `${globalCtx.user.classId}분반 ${globalCtx.user.fullName}`,
            lastLocationUpdated: new Date(),
            control: true,
            validUntil: new Date(),
            sourcePosition: vec3.fromValues(0, 0, 0),
            targetPosition: vec3.fromValues(0, 0, 0),
            targetPositionRefreshed: new Date(),
          })
        )
      } else {
        router.push("/questionnaire").then()
      }
    }
  }, [globalCtx.user, world])

  React.useEffect(() => {
    const handler = setInterval(() => {
      const canvas = canvasRef.current
      if (canvas !== null) {
        const width = window.innerWidth * window.devicePixelRatio
        const height = window.innerHeight * window.devicePixelRatio
        canvas.style.width = `${window.innerWidth}px`
        canvas.style.height = `${window.innerHeight}px`

        if (outerStateRef.current.width !== width || outerStateRef.current.height !== height) {
          outerStateRef.current.width = width
          outerStateRef.current.height = height
          canvas.width = width
          canvas.height = height

          outerStateRef.current.world?.setViewport?.(width, height)
        }
      }
    }, 100)

    return () => {
      clearInterval(handler)
    }
  }, [])

  React.useEffect(() => {
    const pc = new RTCPeerConnection()
    pc.createOffer()
  }, [])

  return (
    <div className={"overflow-hidden relative w-screen h-screen"}>
      <canvas ref={canvasRef} />
      <div id={"labelPane"} className={"absolute overflow-hidden w-screen h-screen left-0 top-0"} />
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        {modalContents}
      </Modal>
    </div>
  )
}

export default Poniverse
