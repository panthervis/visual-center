

// canvas function
export const useCanvas = (el,image,callback) => {
    el.width = image.width; // img width
    el.height = image.height; // img height
    // draw image in canvas tag
    el.getContext('2d')
    .drawImage(image, 0, 0, image.width, image.height);
    return callback();
  }

 
// convert rgba to hex 
// http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
  
export const rgbToHex = (r, g, b) => {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// #003efc ---> rgb(23,231,44)
export const hexToRgb = (hex) => {
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, function(m, r, g, b) {
    return r + r + g + g + b + b;
  });

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  const rgb = result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;

  return rgb ? `rgb(${rgb.r},${rgb.g},${rgb.b})` : null;
}

// rgb(23,9,23) ---> hsv(178,23%,29%)
export const rgb2hsv = (rgbCss) => {
  console.log("rgbCss", rgbCss);
  const rgb = rgbCss.match(/rgb\(([0-9 ]+),([0-9 ]+),([0-9 ]+)\)/);
  const r = rgb[1], g = rgb[2], b = rgb[3];

  let rabs, gabs, babs, rr, gg, bb, h, s, v, diff, diffc, percentRoundFn;
  rabs = r / 255;
  gabs = g / 255;
  babs = b / 255;
  v = Math.max(rabs, gabs, babs);
  diff = v - Math.min(rabs, gabs, babs);
  diffc = c => (v - c) / 6 / diff + 1 / 2;
  percentRoundFn = num => Math.round(num * 100) / 100;
  if (diff == 0) {
      h = s = 0;
  } else {
    s = diff / v;
    rr = diffc(rabs);
    gg = diffc(gabs);
    bb = diffc(babs);

    if (rabs === v) {
      h = bb - gg;
    } else if (gabs === v) {
      h = (1 / 3) + rr - bb;
    } else if (babs === v) {
      h = (2 / 3) + gg - rr;
    }
    if (h < 0) {
      h += 1;
    }else if (h > 1) {
      h -= 1;
    }
  }
  const hsv = {
    h: Math.round(h * 360),
    s: percentRoundFn(s * 100),
    v: percentRoundFn(v * 100)
  };

  console.log("hsv color", hsv);

  return `hsb(${hsv.h},${hsv.s}%,${hsv.v}%)`;
}
