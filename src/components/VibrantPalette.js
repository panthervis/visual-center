import React, { Component } from "react";

class VibrantPalette extends Component {
  render() {
    return (
      <div className="vibrant-palette">
        {Object.keys(this.props.palette).map(colorName => (
          <div
            onClick={() =>
              this.props.onVibrantColorSelect(
                colorName,
                this.props.palette[colorName]
              )
            }
            key={colorName.toLowerCase()}
          >
            <div
              className="color shadow-z-1"
              style={{
                backgroundColor: this.props.palette[colorName]
              }}
            ></div>
            <span>{colorName}</span>
          </div>
        ))}
      </div>
    );
  }
}

export default VibrantPalette;
