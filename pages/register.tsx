import React from "react";
import {NextPage} from "next";
import getConfig from "next/config"
import {useForm, UseFormReturn} from "react-hook-form";
import {useRouter} from "next/router";
import {useGlobalContext} from "./_app";

interface RegisterForm {
  studentId: string
  fullName: string
  classId: string
  password: string
  passwordConfirm: string
}

interface FormInputProps {
  label: React.ReactNode
  placeholder: string
  type: string
  name: keyof RegisterForm
  form: UseFormReturn<RegisterForm>
  half?: boolean
  error?: string
  onChange?: (e: InputEvent) => void
}

const FormInput: React.FunctionComponent<FormInputProps> = props => {
  return (
    <div className={"px-2 mb-1 " + (props.half ? "w-1/2 " : "w-full ")}>
      <label
        className={"block uppercase tracking-wide text-slate-700 text-xs font-bold mb-2"}
        htmlFor={`input-${props.name}`}
      >
        {props.label}
      </label>
      <input
        id={`input-${props.name}`}
        type={props.type}
        className={
          "appearance-none w-full border-2 rounded-md mb-1 px-3 py-2 " +
          (props.error !== undefined ? "border-red-700 " : "border-slate-900 ")
        }
        placeholder={props.placeholder}
        {...props.form.register(props.name)}
      />
      <p className={"text-red-500 text-xs italic mb-0"}>{props.error ?? <span>&nbsp;</span>}</p>
    </div>
  )
}

const Register: NextPage = () => {
  const { publicRuntimeConfig } = getConfig()
  const globalCtx = useGlobalContext()
  const form = useForm<RegisterForm>()
  const router = useRouter()
  const [submitted, setSubmitted] = React.useState(false)
  const [error, setError] = React.useState<string | undefined>(undefined)
  const [success, setSuccess] = React.useState(false)

  async function onSubmit(data: RegisterForm) {
    let isError = false
    {
      if (data.studentId.length === 0) {
        form.setError("studentId", { message: "분반을 입력하세요." })
        isError = true
      } else if (/^[0-9]{8}$/.exec(data.studentId) === null) {
        form.setError("studentId", { message: "잘못된 학번 형식입니다." })
        isError = true
      }

      if (data.classId.length === 0) {
        form.setError("classId", { message: "분반을 입력하세요." })
        isError = true
      } else if (/^[0-9]+|새준위|인솔자 \d+|무은재행정팀$/.exec(data.studentId) === null) {
        form.setError("classId", { message: "잘못된 분반 형식입니다." })
        isError = true
      }

      if (data.fullName.length === 0) {
        form.setError("fullName", { message: "이름을 입력하세요." })
        isError = true
      }

      if (data.password.length < 8) {
        form.setError("password", { message: "패스워드를 8자 이상으로 입력하세요." })
        isError = true
      }

      if (data.passwordConfirm !== data.password) {
        form.setError("passwordConfirm", { message: "패스워드가 다릅니다." })
        isError = true
      }
    }

    if (isError) {
      return
    }

    setSubmitted(true)
    const response = await globalCtx.call("/create-user", {
      studentId: data.studentId,
      fullName: data.fullName,
      classId: data.classId,
      password: data.password,
    })

    if (response.status === 200) {
      setSuccess(true)
      setTimeout(() => router.push("/"), 3000)
    } else {
      const responseBody = await response.json()
      setError(responseBody.message)
      setSubmitted(false)
    }
  }

  return (
    <div className={"relative w-screen h-screen flex flex-col justify-center items-center bg-gradient-to-b from-blue-400 to-cyan-200"}>
      {
        success ?
          (
            <div className={"text-center text-slate-900 leading-snug"}>
              <div className={"text-5xl mb-3 animate-bounce"}>🎉</div>
              <strong className={"text-2xl font-main"}>회원가입 성공!</strong><br/>
              <small className={"text-slate-700"}>3초 뒤 돌아갑니다...</small>
            </div>
          ) :
          (
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className={"flex flex-row flex-wrap w-80 justify-center items-center"}>
                <FormInput
                  form={form} label={"학번"}
                  placeholder={"20220000"} type={"input"} name={"studentId"}
                  error={form.formState.errors.studentId?.message}
                />
                <FormInput
                  half
                  form={form} label={"이름"}
                  placeholder={"김포닉스"} type={"input"} name={"fullName"}
                  error={form.formState.errors.fullName?.message}
                />
                <FormInput
                  half
                  form={form} label={"분반"}
                  placeholder={"16"} type={"input"} name={"classId"}
                  error={form.formState.errors.classId?.message}
                />
                <FormInput
                  form={form} label={"비밀번호"}
                  placeholder={"********"} type={"password"} name={"password"}
                  error={form.formState.errors.password?.message}
                />
                <FormInput
                  form={form} label={"비밀번호 확인"}
                  placeholder={"********"} type={"password"} name={"passwordConfirm"}
                  error={form.formState.errors.passwordConfirm?.message}
                />

                <button
                  className={
                    "px-4 py-2 mb-1 border-2 text-slate-500 rounded-md " +
                    "hover:bg-slate-200/25 active:bg-slate-200/50 " +
                    (error !== undefined ? "border-red-700 " : "border-slate-500 ")
                }
                  disabled={submitted}
                  type={"submit"}
                >
                  회원가입
                </button>
                <small className={"text-red-700 mb-2 text-center"}>{error ?? <span>&nbsp;</span>}</small>
              </div>
            </form>
          )
      }
    </div>
  )
}

export default Register