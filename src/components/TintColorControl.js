import React from "react";
import InputColor from "react-input-color";

import CuratedColorSelect from "./CuratedColorSelect";

export default function TintColorControl({
  title,
  color,
  colorName,
  colorHandler,
  selectHandler,
}) {
  return (
    <div className="app-control-container">
      <label className="app-control">
        <div>{title}</div>
      </label>

      <InputColor
        initialHexColor={color}
        onChange={(e) => colorHandler(e.hex)}
        key="tint-color-picker"
      />

      {selectHandler ? (
        <CuratedColorSelect handler={(value) => selectHandler(value)} />
      ) : null}
    </div>
  );
}
