import React from "react"

const ProjectIceBreaking: React.FunctionComponent = props => {
  return <div className={"text-justify"}>
    <strong className={"text-xl"}>아이스브레이킹</strong><br/>
    <hr className={"mb-4"}/>
    <div className={"px-32 mb-4"}>
      <img src={"/assets/icebreaking.png"} />
    </div>
    <div className={"py-4 px-6 bg-slate-100 rounded mb-4"}>
      📃 "머지않아 이곳은 과학과 기술의 요람이 될 것입니다."
    </div>
    <span>
      1986년 포항, 이곳에 대한민국 최고의 이공계 대학교를 지으려 한다.<br/>
      지, 덕, 체를 골고루 갖춘 학교만이 과학과 기술의 요람이 될 수 있다!<br/>
      과연 22학번 새내기들은 노벨상 수상자를 배출할 수 있는 위대한 학교를 지을 수 있을 것인가...!
    </span>
  </div>
}

export default ProjectIceBreaking