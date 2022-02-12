import React from "react"

const ProjectTheme: React.FunctionComponent = props => {
  return <div className={"text-justify"}>
    <strong className={"text-xl"}>미션투어: 쿠키런: 새내기들의 쿠키탈출 대작전</strong><br/>
    <hr className={"mb-4"}/>
    <div className={"px-32 mb-4"}>
      <img src={"/assets/missiontour.png"} />
    </div>
    <span>
      포스텍에 입학한 22학번 새내기들, 꿈꿔왔던 캠퍼스 라이프를 시작하기도 전 새내기들을 환영하는 마녀의 쿠키를 먹고 <strong>쿠키</strong>로 변해버렸다!
      그런데 <strong>학교 구석구석</strong>에서 미니게임을 수행해 젤리를 얻으면 다시 사람으로 돌아올 수 있다고?
    </span>
    <div className={"py-4 px-6 bg-slate-100 rounded mt-4"}>
      🔮 과연 새내기들은 <strong>다시 사람이 될 수 있을까?</strong>
    </div>
  </div>
}

export default ProjectTheme