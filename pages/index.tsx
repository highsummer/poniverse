import React from "react";
import {NextPage} from "next";
import getConfig from "next/config"
import {useForm} from "react-hook-form";
import {useRouter} from "next/router";
import {useGlobalContext} from "./_app";

interface LoginForm {
  username: string
  password: string
}

const Index: NextPage = () => {
  const globalCtx = useGlobalContext()
  const form = useForm<LoginForm>()
  const router = useRouter()
  const [submitted, setSubmitted] = React.useState(false)
  const [error, setError] = React.useState<string | undefined>(undefined)

  async function onSubmit(data: LoginForm) {
    setSubmitted(true)
    const response = await globalCtx.call("/create-token", {
      username: data.username,
      password: data.password,
    })

    if (response.status === 200) {
      const responseBody = await response.json()
      globalCtx.setAuth(responseBody.token, data.username)
      return router.push("/poniverse/")
    } else {
      const responseBody = await response.json()
      setError(responseBody.message)
      setSubmitted(false)
    }
  }

  React.useEffect(() => {
    if (globalCtx.user !== null) {
      router.push("/poniverse/").then()
    }
  }, [globalCtx.user])

  return (
    <div className={"relative w-screen h-screen flex flex-col justify-center items-center bg-gradient-to-b from-blue-400 to-cyan-200"}>
      <div className={"font-main text-center text-slate-700 mb-8"}>
        <div className={"text-2xl"}>Welcome <strong>TO</strong></div>
        <div className={"text-6xl"}>포니버스</div>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className={"flex flex-col w-80 justify-center items-center"}>
          <div className={"w-full mb-3"}>
            <label
              className={"block uppercase tracking-wide text-slate-700 text-xs font-bold mb-2"}
              htmlFor={"input-username"}
            >
              학번
            </label>
            <input
              id={"input-username"}
              type={"input"}
              className={
                "appearance-none w-full border-2 rounded-md px-3 py-2 " +
                (error !== undefined ? "border-red-700 " : "border-slate-900 ")
              }
              placeholder={"20220000"}
              {...form.register("username")}
            />
          </div>
          <div className={"w-full mb-6"}>
            <label
              className={"block uppercase tracking-wide text-slate-700 text-xs font-bold mb-2"}
              htmlFor={"input-password"}
            >
              비밀번호
            </label>
            <input
              id={"input-password"}
              type={"password"}
              className={
                "appearance-none w-full border-2 rounded-md px-3 py-2 " +
                (error !== undefined ? "border-red-700 " : "border-slate-900 ")
            }
              placeholder={"********"}
              {...form.register("password")}
            />
          </div>
          <button
            className={
              "px-4 py-2 mb-1 border-2 text-slate-500 rounded-md " +
              "hover:bg-slate-200/25 active:bg-slate-200/50 " +
              (error !== undefined ? "border-red-700 " : "border-slate-500 ")
          }
            disabled={submitted}
            type={"submit"}
          >
            로그인
          </button>
          <small className={"text-red-700 mb-2"}>{error ?? <span>&nbsp;</span>}</small>
          <div className={"w-full flex flex-col items-end"}>
            <small className={"text-slate-500 mb-1"}>
              아직 가입하지 않으셨나요?&nbsp;
              <a className={"text-slate-700 font-bold"} href={"/register"}>학번으로 가입하기</a>
            </small>
            {/*<small className={"text-slate-500"}>*/}
            {/*  비밀번호를 잊으셨나요?&nbsp;*/}
            {/*  <a className={"text-slate-700 font-bold"} href={"/reset-password"}>비밀번호 초기화</a>*/}
            {/*</small>*/}
          </div>
        </div>
      </form>
    </div>
  )
}

export default Index