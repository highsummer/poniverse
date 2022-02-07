import {NextPage} from "next";
import React from "react";
import {useRouter} from "next/router";
import getConfig from "next/config";
import {useGlobalContext} from "./_app";

const WelcomeScreen: React.FunctionComponent<{ onSkip: () => void }> = props => {
  const globalCtx = useGlobalContext()
  const [phase, setPhase] = React.useState(-1)

  React.useEffect(() => {
    if (phase < 2) {
      setTimeout(() => setPhase(phase + 1), 300)
    } else if (phase > 2 && phase < 5) {
      setTimeout(() => setPhase(phase + 1), 300)
    }
  }, [phase])

  return (
    <div className={"flex flex-col justify-center items-center pt-8"}>
      <div className={"text-center text-2xl font-main mb-3 duration-300 transition-all " + (phase >= 0 ? "opacity-100 " : "opacity-0 ")}>
        {globalCtx.user?.fullName ?? "..."}님 안녕하세요!
      </div>
      <div className={"text-center font-main mb-4 duration-300 transition-all " + (phase >= 1 ? "opacity-100 " : "opacity-0 ")}>
        친구들을 만나기 전에,<br/>스스로를 알아보는 시간을 가져봅시다.
      </div>

      <button
        className={
          "appearance-none px-4 py-1 -mb-8 rounded-md transition-all duration-200 " +
          "bg-cyan-200/50 border-2 border-cyan-800 text-cyan-800 " +
          "disabled:bg-transparent disabled:border-slate-400 disabled:text-slate-400 " +
          "active:bg-cyan-300 active:outline active:outline-4 active:outline-cyan-500 " +
          "focus:outline focus:outline-2 focus:outline-cyan-500 " +
          (phase === 2 ? "opacity-100 " : "opacity-0 ") +
          (phase > 2 ? "display-none " : "")
        }
        disabled={phase !== 2}
        onClick={e => setPhase(phase + 1)}
      >
        다음
      </button>

      <div className={"text-center font-main mb-8 duration-300 transition-all pointer-events-none " + (phase >= 4 ? "opacity-100 " : "opacity-0 ")}>
        몇 가지 질문에 답해주시면<br/>
        당신에게 어울리는 모습을 추천해드릴게요.
      </div>

      <button
        className={
          "appearance-none px-4 py-1 rounded-md transition-all duration-200 " +
          "bg-cyan-200/50 border-2 border-cyan-800 text-cyan-800 " +
          "disabled:bg-transparent disabled:border-slate-400 disabled:text-slate-400 " +
          "active:bg-cyan-300 active:outline active:outline-4 active:outline-cyan-500 " +
          "focus:outline focus:outline-2 focus:outline-cyan-500 " +
          (phase >= 5 ? "opacity-100 " : "opacity-0 ")
        }
        onClick={e => props.onSkip()}
      >
        확인
      </button>
    </div>
  )
}

export type Score = "I" | "E" | "N" | "S" | "F" | "T" | "J" | "P"

export interface Choice {
  score: Score
  text: string
}

export interface Question {
  question: string
  choices: Choice[]
}

const Questions: Question[] = [
  {
    question: "첫 동아리 모임에 왔다. 조금 적막한데 어떻게 할까?",
    choices: [
      { score: "I", text: "침착하게 선배들의 말을 기다린다." },
      { score: "E", text: "옆의 친구도 마침 신입생 같으니 말을 걸어본다." },
    ],
  }, 
  {
    question: "어제 막 친해진 친구에게 인사를 했는데 못 들은 것 같다.", 
    choices: [
      { score: "I", text: "다음에 얘기하지 뭐, 지나간다." },
      { score: "E", text: "못 들었을 수도 있으니 크게 다시 불러준다." },
    ],
  },
  {
    question: "이제 만날 다른 신입생 친구들은 나를 이렇게 생각할 것 같다.",
    choices: [
      { score: "I", text: "속이 깊고 살가운 친구" },
      { score: "E", text: "먼저 말문을 열어준 친구" },
    ],
  },
  {
    question: "면접을 위해 무은재 기념관 앞에 왔다. 마음을 가다듬기위해 나는,",
    choices: [
      { score: "N", text: "미래의 과학자 상을 보며 나중에 그 위에 올라갈 자신의 모습을 상상한다." },
      { score: "S", text: "학교 전경을 감상하며 계단가로 물이 흐르는 소리를 듣는다." },
    ],
  },
  {
    question: "동아리 공연을 보러 왔다.",
    choices: [
      { score: "N", text: "내가 무대에 있었으면 또 다르게 할 수 있지 않았을까?" },
      { score: "S", text: "실력에 감탄한다. 속으로 진짜 잘한다고 생각한다." },
    ],
  },
  {
    question: "엠티를 준비하게 되었다. 선배들이 엠티에선 어떤 일들이 있는지 알려주었다.",
    choices: [
      { score: "N", text: "과거 자료를 기반으로 전에 없던 새로운 엠티를 만들어본다. " },
      { score: "S", text: "과거 자료를 기반으로 기초가 탄탄한 엠티를 준비한다." },
    ],
  },
  {
    question: "친구가 컨디션 조절 실패로 중간고사를 망쳐서 속상하다고 한다.",
    choices: [
      { score: "F", text: "속상함을 달래주기 위해 같이 음료를 한 잔 대접하며 토닥여준다." },
      { score: "T", text: "다음에 어떻게 컨디션 조절을 잘 할 수 있을지 조언해준다." },
    ],
  },
  {
    question: "좋아하는 학생회 선배가 일을 부탁했는데, 개인 일정상 맡기에 곤란할 것 같다.",
    choices: [
      { score: "F", text: "그래도 좋아하는 선배의 부탁이니 긍정적으로 고려한다." },
      { score: "T", text: "아무리 학생회 일이지만 냉철하게 생각해본다." },
    ],
  },
  {
    question: "내일 가져가야하는 교양 서적을 구할 수 없을 것 같다.",
    choices: [
      { score: "F", text: "교수님께 죄송함을 서두로 양해를 구한다." },
      { score: "T", text: "교수님께 서적을 구하기 힘들었던 이유를 상세히 설명한다." },
    ],
  },
  {
    question: "전공책이 점점 많아진다.",
    choices: [
      { score: "J", text: "더 많아지기 전에 어떻게 하면 유용한 순서로 정리할 수 있을지 생각해본다." },
      { score: "P", text: "원하는 전공책 정도는 어딨는지 안다. 그때 그때 꺼내 쓴다." },
    ],
  },
  {
    question: "과제를 끝내면 오늘 밤에 친구들과 술을 먹기로 했다.",
    choices: [
      { score: "J", text: "과제 끝내면 대충 2시간 쯤 남을테니 방에서 쉬다 나가야겠다." },
      { score: "P", text: "과제가 언제 끝날지는 모르는 얘기니 일단 최선을 다 하자." },
    ],
  },
  {
    question: "팀프로젝트를 시작하려고 한다. 무엇을 먼저 고려할까?",
    choices: [
      { score: "J", text: "타임라인을 잘 세워서 제시간에 성과낼 수 있도록 한다." },
      { score: "P", text: "모두가 자신이 원하는 역할을 수행할 수 있도록 한다." },
    ]
  }
]

Questions.sort((a, b) => Math.random() - Math.random())
Questions.forEach(question => {
  question.choices.sort((a, b) => Math.random() - Math.random())
})

const QuestionPane: React.FunctionComponent<{ question: Question, addScore: (score: Score) => void }> = props => {
  const [selected, setSelected] = React.useState<number | null>(null)
  const balloonSrc = React.useMemo(() => {
    return props.question.choices.map(c => `/text_balloon_${Math.floor(Math.random() * 3) + 1}.svg`)
  }, [])
  const dashedLineSrc = React.useMemo(() => `/dashed_line_${Math.floor(Math.random() * 3) + 1}.svg`, [])

  return (
    <div className={"w-48 flex flex-col items-center"}>
      <div className={"w-80 shrink-0 text-center mb-1 text-xl"}>
        <span className={"font-main text-2xl text-cyan-900"}>{props.question.question}</span>
        <img className={"mt-2"} src={dashedLineSrc} />
      </div>
      {
        props.question.choices.map((choice, i) => {
          return (
            <button
              key={i}
              className={"appearance-none w-64 h-40 px-4 rounded-md text-dark transition-all"}
              onClick={e => {
                props.addScore(choice.score)
                setSelected(i)
              }}
              style={{
                backgroundImage: `url(${balloonSrc[i]})`,
                transform: selected === i ? "scale(107%)" : selected !== null ? "scale(95%)" : undefined,
                filter: selected !== null && selected !== i ? "brightness(80%)" : undefined,
              }}
              disabled={selected !== null}
            >
              <div className={"w-full flex flex-col justify-center"}>
                <div className={"text-center"}>
                  <strong>{i + 1} </strong>
                </div>
                <div className={"text-left px-3"}>
                  <span>{choice.text}</span>
                </div>
              </div>
            </button>
          )
        })
      }
    </div>
  )
}

const SignatureToResult: Record<string, string> = {
  INTP: "engineer",
  INTJ: "analyst",
  INFP: "prepco",
  INFJ: "entrepreneur",
  ISTP: "athletic",
  ISTJ: "general_affairs",
  ISFP: "renovator",
  ISFJ: "ta",
  ENTP: "journalist",
  ENTJ: "president",
  ENFP: "frontperson",
  ENFJ: "moderator",
  ESTP: "senior",
  ESTJ: "team_leader",
  ESFP: "mentor",
  ESFJ: "reader",
}

const Questionnaire: NextPage = () => {
  const [progress, setProgress] = React.useState(0)
  const [score, setScore] = React.useState<Record<Score, number>>({ I: 0, E: 0, F: 0, J: 0, N: 0, P: 0, S: 0, T: 0 })
  const [paneX, setPaneX] = React.useState(0)
  const [transited, setTransited] = React.useState(false)
  const router = useRouter()
  const globalCtx = useGlobalContext()

  function onSkip() {
    setProgress(progress + 1)
    setPaneX(paneX - 96 / 4)
  }

  function addScore(s: Score) {
    setScore({ ...score, [s]: score[s] + 1 })
    setTimeout(() => {
      setProgress(progress + 1)
      setPaneX(paneX - 96 / 4)
    }, 600)
  }

  React.useEffect(() => {
    if (progress === Questions.length + 1) {
      setTimeout(() => {
        setTransited(true)
      }, 2000)

      setTimeout(async () => {
        const IE = score.I > score.E ? "I" : "E"
        const NS = score.N > score.S ? "N" : "S"
        const FT = score.F > score.T ? "F" : "T"
        const JP = score.J > score.P ? "J" : "P"
        const signature = `${IE}${NS}${FT}${JP}`
        const type = SignatureToResult[signature]

        await globalCtx.call("/update-user", { username: globalCtx.authUser, type: type })
        await router.push({ pathname: "/result", query: { type: type } })
      }, 4000)
    }
  }, [progress])

  return (
    <div className={"relative w-screen h-screen bg-gradient-to-b from-blue-400 to-cyan-200"}>
      <div
        className={
          "absolute left-0 top-0 w-screen h-screen transition-all duration-[2000ms] " +
          "bg-gradient-to-br from-violet-700 via-pink-600 to-orange-500 " +
          (transited ? "opacity-100 " : "opacity-0 ")
        }
      />
      <div
        className={
          "absolute w-80 h-full left-1/2 bg-gradient-to-r from-cyan-200/0 via-cyan-200/50 to-cyan-200/0 transition-all duration-[2000ms] " +
          (transited ? "opacity-0 " : "opacity-100 ")
        }
        style={{ transform: "translate(-50%, 0)" }}
      />
      <div className={"w-full h-full flex flex-col justify-center items-center"}>
        <div className={"w-96 overflow-hidden mb-4"}>
          <div
            className={"flex flex-row justify-start items-center shrink-0 transition-transform ease-in-out"}
            style={{ transform: `translate(${paneX}rem, 0)` }}
          >
            <div className={"w-96 flex flex-col justify-center items-center shrink-0"}>
              <WelcomeScreen onSkip={onSkip} />
            </div>
            {
              Questions.map((question, i) => {
                return (
                  <div
                    key={i}
                    className={"w-96 flex flex-row justify-center shrink-0"}
                  >
                    <QuestionPane
                      question={question}
                      addScore={(s) => addScore(s)}
                    />
                  </div>
                )
              })
            }
            <div className={"w-96 flex flex-col justify-center items-center shrink-0"}>
              <div className={"font-main text-2xl mb-8 transition-all duration-[2000ms] " + (transited ? "text-white " : "text-cyan-800 ")}>
                당신의 성향을 분석중입니다...
              </div>
              <div className={"w-8 h-8 rounded-full bg-white animate-bounce"}>

              </div>
            </div>
          </div>
        </div>
        <div className={"h-6"}>
          {progress >= 1 && progress <= Questions.length ? <span>{progress} / {Questions.length}</span> : undefined}
        </div>
      </div>
    </div>
  )
}

export default Questionnaire