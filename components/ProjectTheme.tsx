import React from "react"

const ProjectTheme: React.FunctionComponent = props => {
  return <div className={"text-justify"}>
    <strong className={"text-xl"}>테마기획: 천공의 섬 포스텍</strong><br/>
    <hr className={"mb-4"}/>
    <div className={"px-32 mb-4"}>
      <img src={"/assets/theme.png"} />
    </div>
    <span>
      어느 날 갑작스레 발생한 가속기 오작동. 이로 인해 평화롭던 포스텍은 <strong>공중의 섬</strong>이 되었고, 학교에 있던 존재들은 몬스터가 되어버렸다!<br/>
      때마침 포스텍에 온 새내기 용사들. 변해버린 학교의 모습에 놀라기도 잠시, 보스 몬스터들을 물리치면 포스텍을 원래대로 되돌릴 단서를 얻을 수 있다는 소문을 듣고 용감하게 모험을 떠난다.
    </span>
    <div className={"py-4 px-6 bg-slate-100 rounded mt-4"}>
      ⏳ 개강까지 남은 시간은 단 일주일. 몬스터를 무찌르고 성장하여 <strong>포스텍의 평화</strong>를 되찾자!
    </div>
  </div>
}

export default ProjectTheme