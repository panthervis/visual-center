import React from "react";

export default function CuratedColorSelect({ colorName, handler }) {
  return (
    <label className="app-control">
      <div>
        <i>Curated Colors</i>
      </div>
      <select value={colorName} onChange={e => handler(e.target.value)}>
        <option value="Blue">Blue</option>
        <option value="Red">Red</option>
        <option value="Navy">Navy</option>
        <option value="Purple">Purple</option>
        <option value="Maroon">Maroon</option>
        <option value="Vegas Gold">Vegas Gold</option>
        <option value="Green">Green</option>
        <option value="Orange">Orange</option>
        <option value="Yellow">Yellow</option>
        <option value="Gray">Gray</option>
      </select>
    </label>
  );
}
