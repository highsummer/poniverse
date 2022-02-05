import {Disposable, Time} from "./index";

type Keys = "left" | "right" | "up" | "down" | "use" | "emotion"

export class KeyState implements Disposable {
  document: Document
  keyDownListener: (e: KeyboardEvent) => any
  keyUpListener: (e: KeyboardEvent) => any
  mouseDownListener: (e: MouseEvent) => any
  mouseUpListener: (e: MouseEvent) => any
  mouseMoveListener: (e: MouseEvent) => any
  touchStartListener: (e: TouchEvent) => any
  touchEndListener: (e: TouchEvent) => any
  touchMoveListener: (e: TouchEvent) => any

  keysRaw: Record<Keys, boolean>
  keys: Record<Keys, boolean>
  keysPressed: Record<Keys, boolean>
  keysReleased: Record<Keys, boolean>
  mouse: {
    downRaw: boolean,
    down: boolean,
    x: number,
    y: number,
    tapRaw: boolean,
    tap: boolean,
    pressedAt: Date,
  }

  mode: "keyboard" | "mouse" | "touch"

  disabled: boolean

  static KeyMaps: Record<Keys, string> = {
    left: "ArrowLeft",
    right: "ArrowRight",
    up: "ArrowUp",
    down: "ArrowDown",
    use: " ",
    emotion: "Shift",
  }

  constructor(document: Document) {
    const keyDownListener = (e: KeyboardEvent) => this.onKeyDown(e)
    document.addEventListener("keydown", keyDownListener)
    const keyUpListener = (e: KeyboardEvent) => this.onKeyUp(e)
    document.addEventListener("keyup", keyUpListener)

    const mouseDownListener = (e: MouseEvent) => this.onMouseDown(e)
    document.addEventListener("mousedown", mouseDownListener)
    const mouseUpListener = (e: MouseEvent) => this.onMouseUp(e)
    document.addEventListener("mouseup", mouseUpListener)
    const mouseMoveListener = (e: MouseEvent) => this.onMouseMove(e)
    document.addEventListener("mousemove", mouseMoveListener)

    const touchStartListener = (e: TouchEvent) => this.onTouchStart(e)
    document.addEventListener("touchstart", touchStartListener)
    const touchEndListener = (e: TouchEvent) => this.onTouchEnd(e)
    document.addEventListener("touchend", touchEndListener)
    const touchMoveListener = (e: TouchEvent) => this.onTouchMove(e)
    document.addEventListener("touchmove", touchMoveListener)

    this.document = document
    this.keyDownListener = keyDownListener
    this.keyUpListener = keyUpListener
    this.mouseDownListener = mouseDownListener
    this.mouseUpListener = mouseUpListener
    this.mouseMoveListener = mouseMoveListener
    this.touchStartListener = touchStartListener
    this.touchEndListener = touchEndListener
    this.touchMoveListener = touchMoveListener

    const defaultFalseKeys = Object.fromEntries(Object.keys(KeyState.KeyMaps)
      .map(key => [key, false] as [Keys, boolean])) as Record<Keys, boolean>

    this.keysRaw = { ...defaultFalseKeys }
    this.keys = { ...defaultFalseKeys }
    this.keysPressed = { ...defaultFalseKeys }
    this.keysReleased = { ...defaultFalseKeys }
    this.mouse = {
      downRaw: false,
      down: false,
      x: 0,
      y: 0,
      tapRaw: false,
      tap: false,
      pressedAt: new Date(),
    }
    this.mode = "keyboard"

    this.disabled = false
  }

  update(time: Time) {
    Object.entries(KeyState.KeyMaps)
      .forEach(([key, value]) => {
        if (this.keysRaw[key as Keys]) {
          this.keysPressed[key as Keys] = !this.keys[key as Keys]
          this.keys[key as Keys] = true
        } else {
          this.keysReleased[key as Keys] = this.keys[key as Keys]
          this.keys[key as Keys] = false
        }
      })

    this.mouse.down = this.mouse.downRaw
    this.mouse.tap = this.mouse.tapRaw
    this.mouse.tapRaw = false
  }

  onDelete() {
    this.document.removeEventListener("keydown", this.keyDownListener)
    this.document.removeEventListener("keyup", this.keyUpListener)
    this.document.removeEventListener("mousedown", this.mouseDownListener)
    this.document.removeEventListener("mouseup", this.mouseUpListener)
    this.document.removeEventListener("mousemove", this.mouseMoveListener)
    this.document.removeEventListener("touchstart", this.touchStartListener)
    this.document.removeEventListener("touchend", this.touchEndListener)
    this.document.removeEventListener("touchmove", this.touchMoveListener)
  }

  onKeyDown(e: KeyboardEvent) {
    Object.entries(KeyState.KeyMaps)
      .forEach(([key, value]) => {
        if (e.key === value && !this.disabled) {
          this.keysRaw[key as Keys] = true
        }
      })
    this.mode = "keyboard"
  }

  onKeyUp(e: KeyboardEvent) {
    Object.entries(KeyState.KeyMaps)
      .forEach(([key, value]) => {
        if (e.key === value) {
          this.keysRaw[key as Keys] = false
        }
      })
  }

  onMouseDown(e: MouseEvent) {
    if (!this.disabled) {
      this.mouse.downRaw = true
      this.mouse.x = e.x
      this.mouse.y = e.y
    }
    this.mode = "mouse"
  }

  onMouseUp(e: MouseEvent) {
    this.mouse.downRaw = false
  }

  onMouseMove(e: MouseEvent) {
    if (!this.disabled) {
      this.mouse.x = e.x
      this.mouse.y = e.y
    }
  }

  onTouchStart(e: TouchEvent) {
    e.preventDefault()
    this.mode = "touch"
    if (!this.disabled) {
      this.mouse.downRaw = true
      this.mouse.x = e.touches[0].pageX
      this.mouse.y = e.touches[0].pageY
      this.mouse.pressedAt = new Date()
    }
  }

  onTouchEnd(e: TouchEvent) {
    e.preventDefault()
    this.mouse.downRaw = false
    if (new Date().getTime() - this.mouse.pressedAt.getTime() < 100) {
      this.mouse.tapRaw = true
    }
  }

  onTouchMove(e: TouchEvent) {
    e.preventDefault()
    if (!this.disabled) {
      this.mouse.x = e.touches[0].pageX
      this.mouse.y = e.touches[0].pageY
    }
  }

  disable() {
    this.disabled = true

    Object.entries(KeyState.KeyMaps)
      .forEach(([key, value]) => {
        this.keysPressed[key as Keys] = false
        this.keys[key as Keys] = false
      })

    this.mouse.down = false
  }

  enable() {
    this.disabled = false
  }
}
