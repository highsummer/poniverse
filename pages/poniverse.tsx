import React from "react"
import type { NextPage } from "next"
import {mat4, vec3} from "../core/declarativeLinalg";
import {
  ContentsManager,
  disposeContents,
  GlobalCacheAsyncMesh,
  GlobalCacheAsyncTexture,
  initContents
} from "../core/contents";
import OtIntroduction from "../components/OtIntroduction";
import seedrandom from "seedrandom"
import getConfig from "next/config";
import {useRouter} from "next/router";
import {useGlobalContext} from "./_app";
import {Player, PlayerDraw, PlayerMove, PlayerRemoteMove, PlayerTargetMove} from "../core/components/player";
import {LaunchSimpleModal, SimpleModal, SimpleModel, SimpleModelDraw} from "../core/components/simple";
import {Usable, UsableDraw, UsableUse} from "../core/components/usable";
import {Tree, TreeDraw} from "../core/components/decoration";
import {Test, TestDraw, Wall} from "../core/components";
import {World} from "../core/world/world";
import {emptyEcs, SparseStorage} from "../core/world/ecs";
import {ref, RefCell} from "../core/world";
import {KeyState} from "../core/world/input";
import {
  Button,
  ButtonInteract,
  EmotionButton,
  EmotionButtonDraw,
  EmotionButtonInteract
} from "../core/components/button";

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
  const { publicRuntimeConfig } = getConfig()
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
          .attach("button", new SparseStorage<RefCell<Button>>())
          .attach("emotionButton", new SparseStorage<RefCell<EmotionButton>>())
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
          .register("update", ButtonInteract)
          .register("update", EmotionButtonInteract)
          .register("draw", EmotionButtonDraw)

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
          "transform", ref(mat4.fromTranslation(vec3.fromValues(-0.0, 15.0, 0.0))),
          "simpleModel", ref({
            mesh: () => ContentsManager.mesh.studentCommunityHall,
            texture: () => ContentsManager.texture.studentCommunityHall,
          }),
          "wall", ref({ mask: { x1: -4, y1: -4.7, x2: 4, y2: 2.5 } })
        )

        ecs.create(
          "transform", ref(mat4.fromTranslation(vec3.fromValues(-15.0, 0.0, 0.0))),
          "simpleModel", ref({
            mesh: () => ContentsManager.mesh.board,
            texture: () => ContentsManager.texture.board,
          }),
          "wall", ref({ mask: { x1: -1, y1: -0.3, x2: 1, y2: 0.3 } })
        )

        for (const [i, text] of [
          "❤️", "🎉", "✅", "😭",
          "🔥", "👀", "⬅️", "➡️",
        ].map((e, i) => [i, e] as [number, string])) {
          const x = ((i >= 4 ? i - 4 : i) - 1.5) / 3 * 0.6
          const y = i >= 4 ? -0.9 : -0.725

          ecs.create(
            "button", ref({
              mask: { x1: x - 0.08, x2: x + 0.08, y1: y - 0.075, y2: y + 0.075 },
              hover: false,
              active: false,
              click: false,
              disabled: false,
            }),
            "emotionButton", ref({
              text: text,
            })
          )
        }

        const random = seedrandom("")

        const unitTile = 4
        const offset = [0, 0]

        const placeGrass = (x: number, y: number) => {
          ecs.create(
            "transform", ref(mat4.mulAll(
              mat4.fromTranslation(vec3.fromValues((x - offset[0]) * unitTile, (y - offset[1]) * unitTile, 0.0)),
              mat4.fromScaling(vec3.fromValues(unitTile / 2, unitTile / 2, 1.0)),
            )),
            "simpleModel", ref({
              mesh: () => ContentsManager.mesh.tessellatedPlane,
              texture: () => ContentsManager.texture.grassPattern,
            })
          )

          for (let i = 0; i < random() * 2; i++) {
            ecs.create(
              "transform", ref(mat4.mulAll(
                mat4.fromTranslation(vec3.fromValues((x - offset[0]) * unitTile, (y - offset[1]) * unitTile, 0.0)),
                mat4.fromTranslation(vec3.fromValues(
                  (random() * 2 - 1) * unitTile / 2,
                  (random() * 2 - 1) * unitTile / 2,
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
        }

        const placeBrick = (x: number, y: number) => {
          const texture = `/textures/brick_${Math.floor(random() * 3) + 1}.png`
          ecs.create(
            "transform", ref(mat4.mulAll(
              mat4.fromTranslation(vec3.fromValues((x - offset[0]) * unitTile, (y - offset[1]) * unitTile, 0.0)),
              mat4.fromScaling(vec3.fromValues(unitTile / 2, unitTile / 2, 1.0)),
            )),
            "simpleModel", ref({
              mesh: () => ContentsManager.mesh.tessellatedPlane,
              texture: () => new GlobalCacheAsyncTexture(texture),
            })
          )
        }

        for (let j = -8; j <= 8; j++) {
          for (let i = 0; i <= 5; i++) {
            placeGrass(j, i)
          }
        }

        for (let j = -8; j <= 8; j++) {
          placeBrick(j, -1)
        }

        for (let i = -6; i <= -2; i++) {
          placeBrick(0, i)
          for (let j = -8; j < 0; j++) {
            placeGrass(j, i)
            placeGrass(-j, i)
          }
        }

        for (let i = -2; i < 0; i++) {
          for (let j = -3; j < 4; j++) {
            ecs.create(
              "transform", ref(mat4.mulAll(
                mat4.fromTranslation(vec3.fromValues(-18.0, 0.0, 0.0)),
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

        for (let i = -2; i < 0; i++) {
          for (let j = -3; j < 4; j++) {
            ecs.create(
              "transform", ref(mat4.mulAll(
                mat4.fromTranslation(vec3.fromValues(18.0, 0.0, 0.0)),
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

        let stopWebSocket = false
        const connect = () => {
          const ws = new WebSocket("wss://" + publicRuntimeConfig.URL_WEBSOCKET)
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
            name: globalCtx.user.classId === "새준위" ?
              `새준위 ${globalCtx.user.fullName}` :
              `${globalCtx.user.classId}분반 ${globalCtx.user.fullName}`,
            lastLocationUpdated: new Date(),
            control: true,
            validUntil: new Date(),
            sourcePosition: vec3.fromValues(0, 0, 0),
            targetPosition: vec3.fromValues(0, 0, 0),
            targetPositionRefreshed: new Date(),
            emotion: "",
            emotionUntil: new Date(),
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
