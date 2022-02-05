import {NextPage} from "next";
import {useRouter} from "next/router";

interface Category {
  best: string[],
  name: string,
  adjective: string,
  id: string,
  description: string,
}

const Categories: Category[] = [
  {
    best: ["president", "team_leader"],
    name: "공돌이 포닉스",
    adjective: "뼈속까지 공대생",
    id: "engineer",
    description: "관심있는 분야가 얘기가 나오면 서너시간도 너끈히 대화를 이끌어나갈 수 있는",
  },
  {
    best: ["reader", "journalist"],
    name: "데이터 분석가 포닉스",
    adjective: "철두철미한 전략가",
    id: "analyst",
    description: "눈 앞에 놓인 상황을 잘 분석하고 냉철하게 판단할 줄 아는",
  },
  {
    best: ["moderator", "president"],
    name: "준비위원 포닉스",
    adjective: "나는 커서 새준위가 될래요",
    id: "prepco",
    description: "책임감과 소명의식으로 똘똘뭉쳐있으며 따뜻한 마음씨와 풍부한 리액션을 가진",
  },
  {
    best: ["reader", "journalist"],
    name: "창업가 포닉스",
    adjective: "최고가 아니면 못 참아",
    id: "entrepreneur",
    description: "강한 직관력을 통해 주변 사람들에게 영향을 줄 줄 아는 한편, 사람들이 그 속내를 궁금해하는",
  },
  {
    best: ["frontperson", "team_leader"],
    name: "포카전 선수단 포닉스",
    adjective: "먹물만큼 값진 땀방울",
    id: "athletic",
    description: "뛰어난 현실감각과 임기응변 능력을 통해 출중한 능력을 선보이는",
  },
  {
    best: ["mentor", "senior"],
    name: "총무 포닉스",
    adjective: "철두철미한 매력",
    id: "general_affairs",
    description: "자기관리와 자제력을 통해 업무의 절차와 그 세부사항을 멋지게 수행해내는 ",
  },
  {
    best: ["moderator", "frontperson"],
    name: "융합인재 포닉스",
    adjective: "분야를 넘나드는 에너지",
    id: "renovator",
    description: "타인의 가치를 존중할 줄 알고 다른이의 감정에 민감하게 반응하여 사고할 줄 아는",
  },
  {
    best: ["mentor", "senior"],
    name: "실험조교 포닉스",
    adjective: "정밀도의 고수",
    id: "ta",
    description: "기억력과 관찰력을 통해 프로젝트를 수행할 수 있는 차분하고 책임감있는",
  },
  {
    best: ["entrepreneur", "analyst"],
    name: "학생기자 포닉스",
    adjective: "날 피해갈 이슈는 없다",
    id: "journalist",
    description: "넓은 안목과 풍부한 상상력을 토대로 새로운 일을 해내는 능력이 뛰어난",
  },
  {
    best: ["prepco", "renovator"],
    name: "학생회 포닉스",
    adjective: "학생사회를 이끌어갈 인재",
    id: "president",
    description: "조직을 설계하고 이끄는 것에 흥미를 느끼며 능률과 효율을 잘 찾아내는",
  },
  {
    best: ["prepco", "renovator"],
    name: "다독가 포닉스",
    adjective: "도서관은 기숙사다",
    id: "reader",
    description: "영감과 통찰력이 필요한 일들을 멋지게 해내며 사람과 관계된 문제를 수월히 풀어내는",
  },
  {
    best: ["prepco", "renovator"],
    name: "축제 사회자 포닉스",
    adjective: "임기응변의 달인",
    id: "moderator",
    description: "다른 이들의 잠재력을 알아보고 모두가 융화되어 성장할 수 있도록 돕는",
  },
  {
    best: ["general_affairs", "ta"],
    name: "동아리 선배 포닉스",
    adjective: "엠티의 지배자",
    id: "senior",
    description: "개방적인 성격과 강한 현실감각을 통해 문제를 해결해나가며 높은 사회성을 가진",
  },
  {
    best: ["engineer", "renovator", "athletic"],
    name: "조장 포닉스",
    adjective: "팀플은 나에게 맡겨",
    id: "team_leader",
    description: "체계적으로 일을 해내는 데에 소질이 있으며 솔직함과 뒤끝 없는 성격이 매력인",
  },
  {
    best: ["general_affairs", "ta"],
    name: "멘토 포닉스",
    adjective: "모르는게 있으면 불러줘",
    id: "mentor",
    description: "대인관계에 뛰어난 능력을 발휘하며 모두에게 따뜻하게 대할 줄 아는",
  },
  {
    best: ["renovator", "athletic"],
    name: "분반장 포닉스",
    adjective: "분반친구들아 사랑한다",
    id: "frontperson",
    description: "끈기와 성실성을 바탕으로 모두를 위해 봉사하는",
  },
]

const Result: NextPage = () => {
  const router = useRouter()
  const type = router.query["type"]
  const category = Categories.find(cat => cat.id === type)

  if (category === undefined) {
    return (
      <div className={"flex flex-row justify-center items-center w-screen h-screen bg-gradient-to-br from-violet-700 via-pink-600 to-orange-500"}>
        <div className={"w-96 text-white text-center"}>
          Loading...
        </div>
      </div>
    )
  }

  return (
    <div className={"relative w-screen h-screen bg-gradient-to-br from-violet-700 via-pink-600 to-orange-500"}>
      <div
        className={"absolute left-1/2 max-w-md h-full bg-gradient-to-r from-amber-600/0 via-amber-600/50 to-amber-600/0"}
        style={{ width: "32rem", transform: "translate(-50%, 0)" }}
      />
      <div className={"absolute w-full h-full overflow-y-scroll overflow-x-hidden"}>
        <div className={"max-w-md mx-auto"}>
          <div className={"px-3 flex flex-col justify-center items-center text-white text-center"}>
            <div className={"h-32"} />

            <div className={"w-full flex flex-col justify-center items-center"}>
              <div className={"text-3xl font-main"}>
                {category.adjective}
              </div>
              <div className={"text-6xl font-main"}>
                {category.name}
              </div>
              <div className={"mb-6"}>
                <img src={`/ponix_${category.id}.png`} />
              </div>
              <div className={"w-full"}>
                당신은 {category.description}<br/><strong>“{category.adjective}, {category.name}”</strong><br/>입니다.
              </div>
            </div>

            <div className={"w-full h-0 my-6 border border-t-0 border-l-0 border-r-0 border-b-orange-400"} />

            <div className={"flex flex-col w-full justify-center items-center"}>
              <div className={"text-3xl font-main mb-3"}>
                당신의 베스트 프렌드
              </div>
              <div className={"flex flex-row w-full"}>
                {
                  category.best.map(friend => {
                    const friendCategory = Categories.find(cat => cat.id === friend)!
                    return (
                      <div key={friendCategory.id} className={"w-1/2 px-4"}>
                        <div className={"flex flex-col w-full"}>
                          <img src={`/ponix_${friendCategory.id}.png`} className={"w-full mb-3"} />
                          <div className={"w-full"}>
                            {friendCategory.adjective}
                          </div>
                          <div className={"w-full"}>
                            <strong>{friendCategory.name}</strong>
                          </div>
                        </div>
                      </div>
                    )
                  })
                }
              </div>
            </div>

            <a
              href={"/poniverse"}
              className={"mt-16 cursor-pointer"}
            >
              <div className={"font-main text-2xl"}>
                포니버스로 출발!
              </div>
              <div className={"text-pink-200"}>
                <small>아래를 클릭하여 입장</small>
              </div>
              <div className={"relative h-24"}>
                <div className={"scroll-down-arrow absolute left-1/2 bottom-1/2"}>
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </a>

            <div className={"w-0 overflow-visible"}>
              <a href={"/poniverse"}>
                <img
                  src={"/toniverse.png"}
                  style={{
                    minWidth: "60rem",
                    transform: "translate(-50%, 0)",
                    clipPath: "ellipse(30rem 460px at 30rem 460px)",
                  }}
                />
              </a>
            </div>

            <div
              className={"w-screen h-64 bg-gradient-to-b from-slate-900 to-slate-900/0 pt-16"}
            >
              <div className={"text-slate-300"}>Copyright © 2022 Yoonha Hwang. All rights reserved.</div>
              <hr className={"mx-auto w-96 opacity-50 my-3"}/>
              <div className={"text-slate-400"}>Special Thanks to 2022 새내기새로배움터 준비위원회</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Result