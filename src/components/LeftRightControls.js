import React from "react";

import UpArrow from "../assets/svg/up-arrow.svg";

export default function LeftRightControls(props) {
  return (
    <div className="demo-image-bottom-controller">
      <div className="move-image-up">
        <img
          src={UpArrow}
          className="move-image-up-action"
          onClick={evt => props.handler(evt, 1)}
          alt="left-control"
        />
      </div>
      <div className="move-image-down">
        <img
          src={UpArrow}
          className="move-image-down-action"
          onClick={evt => props.handler(evt, -1)}
          alt="right-control"
        />
      </div>
    </div>
  );
}
