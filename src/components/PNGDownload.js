import React, { Component } from 'react';

class PNGDownload extends Component {

  saveScreenshot = (canvas) =>{
    const link = document.createElement('a');
    link.download = 'poster.png';

    canvas.toBlob(function(blob) {
      console.log(blob)
      link.href = URL.createObjectURL(blob);
      link.click();
    });
  }

  downloadFile = () => {
    const pageImage = new Image();
    pageImage.src = this.props.base64;
    pageImage.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = pageImage.naturalWidth;
      canvas.height= pageImage.naturalHeight;

      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(pageImage, 0, 0);
      
      this.saveScreenshot(canvas);
    }
  }
  render() {
    return (
      <input type="button" value="Download as PNG" onClick={this.downloadFile} className="download-png"
        style={{
          cursor: "pointer",
          padding: "0.5em 1em",
        }}
      />
    );
  }
}

export default PNGDownload;