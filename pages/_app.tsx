import React from "react"
import '../styles/globals.css'
import type { AppProps } from 'next/app'
import getConfig from "next/config";
import {useRouter} from "next/router";
import DefaultHeader from "../components/DefaultHeader";

export interface GlobalContext {
  authToken: string | null
  authUser: string | null
  user: {
    username: string
    fullName: string
    classId: string
    type: string | null
  } | null
}

const GlobalContext = React.createContext<ReturnType<typeof useInitGlobalContext>["state"] | null>(null)

export type GlobalContextActions = ActionSetAuth | ActionSetUser | ActionResetAuth
interface ActionSetAuth {
  type: "setAuth"
  authToken: string
  authUser: string
}

interface ActionSetUser {
  type: "setUser"
  user: GlobalContext["user"]
}

interface ActionResetAuth {
  type: "resetAuth"
}

export function useGlobalContext() {
  const ctx = React.useContext(GlobalContext)
  if (ctx === null) {
    throw new Error("context is not provided")
  }

  return ctx
}

function globalContextReducer(oldCtx: GlobalContext, action: GlobalContextActions): GlobalContext {
  if (action.type === "setAuth") {
    window.localStorage.setItem("authToken", action.authToken)
    window.localStorage.setItem("authUser", action.authUser)
    return {
      ...oldCtx,
      authToken: action.authToken,
      authUser: action.authUser,
    }
  } else if (action.type === "setUser") {
    return {
      ...oldCtx,
      user: action.user,
    }
  } else if (action.type === "resetAuth") {
    window.localStorage.removeItem("authToken")
    window.localStorage.removeItem("authUser")
    return {
      ...oldCtx,
      authToken: null,
      authUser: null,
      user: null,
    }
  } else {
    const x: never = action
    return x
  }
}

export function useInitGlobalContext() {
  const { publicRuntimeConfig } = getConfig()
  const router = useRouter()

  const [ready, setReady] = React.useState(false)
  const [state, reducer] = React.useReducer(globalContextReducer, {
    authToken: null,
    authUser: null,
    user: null,
  })

  async function fetchUser(authToken: string, authUser: string) {
    return fetch(`https://${publicRuntimeConfig.URL_REST}/get-user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`,
      },
      body: JSON.stringify({ username: authUser })
    })
      .then(async response => {
        if (response.status === 200) {
          const body = await response.json()
          reducer({
            type: "setUser",
            user: {
              username: body.username,
              fullName: body.fullName,
              classId: body.classId,
              type: body.type ?? null,
            }
          })
        } else {
          throw new Error("failed to auth")
        }
      })
  }

  function bounceToLogin() {
    if (router.pathname !== "/" && router.pathname !== "/register") {
      return router.push("/").then(() => {})
    } else {
      return Promise.resolve()
    }
  }

  React.useEffect(() => {
    const authToken = window.localStorage.getItem("authToken")
    const authUser = window.localStorage.getItem("authUser")

    if (authToken !== null && authUser !== null) {
      reducer({
        type: "setAuth",
        authToken: authToken,
        authUser: authUser,
      })
    }

    setReady(true)
  }, [])

  React.useEffect(() => {
    if (ready) {
      if (state.authToken === null || state.authUser === null) {
        bounceToLogin().then()
      } else {
        fetchUser(state.authToken, state.authUser)
          .catch(e => bounceToLogin())
      }
    }
  }, [ready, state.authToken, state.authUser])

  async function logout() {
    window.localStorage.removeItem("authToken")
    window.localStorage.removeItem("authUser")
    reducer({ type: "resetAuth" })
    return router.push("/")
      .then(() => {})
  }

  function setAuth(token: string, user: string) {
    reducer({ type: "setAuth", authToken: token, authUser: user })
  }

  function call(pathname: string, body: any) {
    return fetch(`https://${publicRuntimeConfig.URL_REST}${pathname}`, {
      method: "POST",
      headers: {
        "Authorization": state.authToken ? `Bearer ${state.authToken}` : "",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    })
  }

  return {
    state: { ...state, logout, setAuth, call },
    reducer,
  }
}

function App({ Component, pageProps }: AppProps) {
  const { state, reducer } = useInitGlobalContext()

  React.useEffect(() => {
    function onSpacePress(e: KeyboardEvent) {
      if (e.key === " ") {
        document.querySelectorAll(".click-on-space")
          .forEach(node => {
            if (node instanceof HTMLButtonElement) {
              node.click()
            }
          })
      }
    }

    document.addEventListener("keypress", onSpacePress)
    return () => document.removeEventListener("keypress", onSpacePress)
  }, [])

  return <DefaultHeader>
    <GlobalContext.Provider value={state}>
      <Component {...pageProps} />
    </GlobalContext.Provider>
  </DefaultHeader>
}

export default App
