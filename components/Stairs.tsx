import React from "react"

const Stairs: React.FunctionComponent = props => {
  return <div className={"text-justify"}>
    <strong>새터 78계단 공고</strong><br/>
    <hr className={"mb-4"}/>
    <div className={"w-full flex flex-row justify-center"}>
      <img className={"w-full"} src={"/assets/78stairs.png"} />
    </div>
  </div>
}

export default Stairs