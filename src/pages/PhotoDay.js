import React from "react";
import InputColor from "react-input-color";
import Dropzone from "react-dropzone";
import ClipLoader from "react-spinners/ClipLoader";
import { Link } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import "react-toastify/dist/ReactToastify.css";

import { Subject } from "rxjs";
import { debounceTime } from "rxjs/operators";
import axios from "axios";
import * as Vibrant from "node-vibrant";
import queryString from "query-string";

// animation
import { easeQuad } from "d3-ease";
import config from "../config";

// components
// import PNGDownload from "../components/PNGDownload";
import VibrantPalette from "../components/VibrantPalette";
import ChangingProgressProvider from "../components/ChangingProgressProvider";
import TintColorControl from "../components/TintColorControl";

// internal helpers
import visualCenter from "../helpers/visualCenter.js";
import * as textFit from "../helpers/textFit.js";
import trimCanvas from "../helpers/trimCanvas.js";
import { useCanvas, rgbToHex, hexToRgb } from "../helpers/pickColor.js";
import {
  acceptPoster,
  fetchPlayerData,
  fetchPosterData,
} from "../helpers/posterManagement";
import { base64EncArr, base64DecToArr } from "../helpers/base64Helper.js";

// assets
import demoImage from "../assets/img/demo.js";
import UpArrow from "../assets/svg/up-arrow.svg";
import MoveUp from "../assets/svg/move-up.svg";
import ClearImageIcon from "../assets/img/clear-image-icon.png";
import LeftRightControls from "../components/LeftRightControls";
import { sendToEditor, storeEditorAction } from "./../Actions/index.tsx";
import { connect } from "react-redux";
import Editor from "./Editor";
const predefinedColors = {
  Blue: "#275BD6",
  Red: "#D61E21",
  Navy: "#020F70",
  Purple: "#943BD9",
  Maroon: "#7D0909",
  "Vegas Gold": "#BFA88F",
  Green: "#24B519",
  Orange: "#E3841E",
  Yellow: "#D9B93B",
  Gray: "#A8A8A5",
};

class PhotoDay extends React.Component {
  constructor(props) {
    super(props);

    this.firstNamePG = null;
    this.secondNamePG = null;

    this.setFirstNamePG = (element) => {
      this.firstNamePG = element;
    };

    this.setSecondNamePG = (element) => {
      this.secondNamePG = element;
    };

    this.state = {
      isAuto: false, // required for auto build
      playerId: 0, // required for auto build
      apiload: 0,
      posterload: 0,
      photoDayTemplateStyle: "template1",
      base64: [null, null, null],
      removedImages: [null, null, null],
      orignalImages: [null, null, null],
      bgRemoved: [true, true, true],
      bgRemoving: [false, false, false],
      bgRemovingBtnText: ["Modify", "Modify", "Remove bg"],
      images: [null, null, null],
      originLinks: ["", "", ""], //s3 links to original images
      pickerImagePath: "",
      imageFileNames: ["", "", ""], // without Extension
      imageBaseNames: ["", "", ""], // with Extension,

      imageCMInfos: [
        // image information obtained through ClippingMagic tool
        { id: null, secret: null },
        { id: null, secret: null },
        { id: null, secret: null },
      ],
      storeEditor: [
        {
          drawnPos: [],
          mode: 0,
          color: "",
          image: null,
          blur: 0,
        },
        {
          drawnPos: [],
          mode: 0,
          color: "",
          image: null,
          blur: 0,
        },
        {
          drawnPos: [],
          mode: 0,
          color: "",
          image: null,
          blur: 0,
        },
      ],
      palette: {}, // vibrant.js
      orignalImage: "",
      removedImage: "",
      producedImage: null,
      visualPos: [
        // visual center positions
        {
          visualLeft: 0.5,
          visualTop: 0.5,
        },
        {
          visualLeft: 0.5,
          visualTop: 0.5,
        },
        {
          visualLeft: 0.5,
          visualTop: 0.5,
        },
      ],

      elementsPos: {},

      sport: "hockey",

      headerCopy: "2021",

      playerNum: 55,
      playerNumStroke: "rgb(200,12,0)",

      tintColor: "Blue",
      tintColorValue: "#275BD6",

      secondTintColor: "Yellow",
      secondTintColorValue: "#D9B93B",

      originTintColorValue: "#000000", // tint color that suggested on the event system (automation purpose)
      originPatternColorValue: "#000000", // pattern color that suggested on the event system (automation purpose)

      firstName: "John",
      firstNameSize: 100,
      firstNameMaxSize: 100,
      firstNameColor: "#00008B",
      firstNameFamily: "Amigos",

      secondName: "Doe",
      secondNameSize: 125,
      secondNameMaxSize: 100,
      secondNameColor: "#E91205",
      secondNameFamily: "Freshman",

      headerCopyColor: "#00008B",
      footerCopyColor: "#00008B",

      footerCopy: "",

      productLoading: false,
      percentPoints: [],
      estimatedTime: 12,
      playerImageWidth: 800,

      productUniqueId: "",
      productAccepting: false,

      playerImageScaleMode: "Contain", // Contain
      copyTooltipText: "Copy to clipboard",

      acceptedFormData: null,
    };

    this.serializableStateKeys = [
      "headerCopy",
      "footerCopy",
      "playerNum",
      "playerNumStroke",
      "firstName",
      "firstNameColor",
      "firstNameSize",
      "firstNameFamily",
      "secondName",
      "secondNameColor",
      "secondNameSize",
      "secondNameFamily",
      "tintColor",
      "secondTintColor",
      "playerImageWidth",
      "tintColorValue",
      "secondTintColorValue",
      "headerCopyColor",
      "footerCopyColor",
    ];

    this.API_BASE_URL = config.apiUrl;
    this.API_BASE_URL1 = config.apiUrl1;

    this.onFNameChange$ = new Subject();
    this.onFNameChange = this.onFNameChange.bind(this);

    this.onSNameChange$ = new Subject();
    this.onSNameChange = this.onSNameChange.bind(this);
  }

  async componentDidMount() {
    const routeParams = queryString.parse(this.props.location.search);

    // set placeholder images
    this.setState({
      base64: new Array(3).fill(demoImage),
      isAuto: false,
      playerId: 0,
    });

    // if player_id is available in the URI param, load player data
    if (routeParams.player_id) {
      await axios
        .get(
          `https://utproducts.com/wp-json/utpe/v1/player/${routeParams.player_id}/abcd12345`
        )
        .then(async (res) => {
          const playerData = await fetchPlayerData(routeParams.player_id);

          if (res.data.is_background_removed === 1) {
            this.setState({
              bgRemoving: this.state.bgRemoving.map((f, i) =>
                i !== 2 ? false : f
              ),
              autoRemove: false,
              playerId: routeParams.player_id,
              isAuto: !!routeParams.auto,
            });

            if (res.data.player_photo_background_removed) {
              this.setState({
                bgRemoved: this.state.bgRemoved.map((f, i) =>
                  i === 1 ? false : f
                ),
              });
              this.setState({
                imageFileNames: this.state.imageFileNames.map((f, i) =>
                  i === 1 ? "player_photo" : f
                ),
              });
              this.setState({
                imageBaseNames: this.state.imageBaseNames.map((f, i) =>
                  i === 1 ? "player_photo" : f
                ),
              });
              //this.setState({ originLinks: this.state.originLinks.map((f, i) => (i === 1) ? res.data.player_photo : f) })
              this.processClippingMagicResultImage(
                1,
                res.data.player_photo_background_removed
              );
            }

            let photoDayConfig;
            if (res.data.sport.toLowerCase() === "volleyball") {
              photoDayConfig = await this.fetchPhotoDayConfig("soccer");
            } else if (res.data.sport.toLowerCase() === "basketball 5 on 5") {
              photoDayConfig = await this.fetchPhotoDayConfig("basketball");
            } else {
              photoDayConfig = await this.fetchPhotoDayConfig("basketball");
            }

            this.setState({
              ...photoDayConfig,
              ...playerData,
              footerCopy: playerData.thirdName,
              originLinks: playerData.images.map((t) =>
                !!t.link ? t.link : ""
              ),
              originTintColorValue: playerData.tintColorValue,
              originPatternColorValue: playerData.secondTintColorValue,
            });
            // convert base64 to blob, and pass it to main handler
            playerData.images
              .map((t) => t.base64)
              .map((b64) => {
                const type = b64.match(/^data:(image\/[a-z]+);base64,/);
                return !type
                  ? null
                  : new Blob(
                      [
                        base64DecToArr(
                          b64.replace(/^data:image\/[a-z]+;base64,/, ""),
                          2
                        ),
                      ],
                      {
                        type: type.slice(-1).pop(),
                      }
                    );
              })
              .map((blob, idx) => {
                this.setState({
                  images: this.state.images.map((f, i) =>
                    i === idx ? blob : f
                  ),
                });
              });
          } else {
            await this.loadPlayer(routeParams.player_id, !!routeParams.auto);
          }
        })
        .catch(async (err) => {
          console.log("error", err);
          await this.loadPlayer(routeParams.player_id, !!routeParams.auto);
        });
    } else if (routeParams.poster_id) {
      await this.loadPoster(routeParams.poster_id);
    } else {
      // load photoday's initial config
      this.setState(await this.fetchPhotoDayConfig());
    }

    this.determineFirstNameMaxSize();
    this.determineSecondNameMaxSize();

    this.fnSubscription = this.onFNameChange$
      .pipe(debounceTime(300))
      .subscribe((_) => {
        this.determineFirstNameMaxSize();
      });

    this.snSubscription = this.onSNameChange$
      .pipe(debounceTime(300))
      .subscribe((_) => {
        this.determineSecondNameMaxSize();
      });
  }

  componentWillUnmount() {
    if (this.fnSubscription) {
      this.fnSubscription.unsubscribe();
    }

    if (this.snSubscription) {
      this.snSubscription.unsubscribe();
    }
  }

  async loadPoster(posterId) {
    // show toast notification
    toast.info("Loading poster ...", {
      position: toast.POSITION.TOP_CENTER,
    });

    const posterData = await fetchPosterData(posterId);

    console.log(`loaded poster ${posterId}`, posterData);
    this.setState({
      ...posterData,
      productUniqueId: posterId,
      autoPoster: true,
    });
  }

  async loadPlayer(playerId, automate = false) {
    // show toast notification
    toast.info("Loading images ...", {
      position: toast.POSITION.TOP_CENTER,
    });

    const playerData = await fetchPlayerData(playerId);
    const photoDayConfig = await this.fetchPhotoDayConfig(playerData.sport);

    this.setState({
      ...photoDayConfig,
      ...playerData,
      footerCopy: playerData.thirdName,
      base64: playerData.images.map((t) => (t.link ? t.base64 : demoImage)),
      isAuto: automate,
      originLinks: playerData.images.map((t) => (!!t.link ? t.link : "")),
      originTintColorValue: playerData.tintColorValue,
      originPatternColorValue: playerData.secondTintColorValue,
      playerId,
    });

    // convert base64 to blob, and pass it to main handler
    playerData.images
      .map((t) => t.base64)
      .map((b64) => {
        const type = b64.match(/^data:(image\/[a-z]+);base64,/);
        return !type
          ? null
          : new Blob(
              [
                base64DecToArr(
                  b64.replace(/^data:image\/[a-z]+;base64,/, ""),
                  2
                ),
              ],
              {
                type: type.slice(-1).pop(),
              }
            );
      })
      .map((blob, idx) => {
        this.onReadUrlHandler(blob, playerData.images[idx].baseName, idx);
      });
  }

  async fetchPhotoDayConfig(sportc) {
    // API UPDATE
    const response = await fetch(`${this.API_BASE_URL}/product/photo-day`);
    const json = await response.json();

    if (json.statusCode !== 200) {
      throw new Error(`${json.error.type} : ${json.error.description}`);
    }

    const { data } = json;

    if (
      !data.tintColor &&
      Object.keys(predefinedColors).includes(data.tintColor)
    )
      data.tintColorValue = predefinedColors[data.tintColor];

    if (
      !data.secondTintColor &&
      Object.keys(predefinedColors).includes(data.secondTintColor)
    )
      data.secondTintColorValue = predefinedColors[data.secondTintColor];
    data.elementsPos = data.elementsPos || {};
    data.sport = "photo-day";
    if (sportc === "baseball") {
      data.headerCopy = "2021";
    } else {
      data.headerCopy = "2021";
    }
    if (!Object.keys(data).find((e) => e === "playerNum"))
      data.playerNum = null;

    if (data.playerImageWidth === 670) data.playerImageScaleMode = "Contain";
    else if (data.playerImageWidth === 900) data.playerImageScaleMode = "Cover";
    else data.playerImageScaleMode = "Manual";

    return data;
  }

  onFNameChange(e) {
    const name = e.target.value;
    this.setState({ firstName: name });
    this.onFNameChange$.next(name);
  }

  onSNameChange(e) {
    const name = e.target.value;
    this.setState({ secondName: name });
    this.onSNameChange$.next(name);
  }

  sleep = (m) => new Promise((r) => setTimeout(r, m));

  determineFirstNameMaxSize() {
    if (!!this.firstNamePG === false) return;
    textFit(this.firstNamePG, { alignHoriz: true, maxFontSize: 300 });

    const style = window
      .getComputedStyle(
        document.querySelector(".first-name-playground > .textFitted"),
        null
      )
      .getPropertyValue("font-size");
    const maxSize = parseInt(style);

    this.setState({
      firstNameMaxSize: maxSize,
      firstNameSize:
        this.state.firstNameSize > maxSize ? maxSize : this.state.firstNameSize,
    });
  }

  determineSecondNameMaxSize() {
    if (!!this.secondNamePG === false) return;
    textFit(this.secondNamePG, { alignHoriz: true, maxFontSize: 300 });

    const style = window
      .getComputedStyle(
        document.querySelector(".second-name-playground > .textFitted"),
        null
      )
      .getPropertyValue("font-size");

    const maxSize = parseInt(style);
    this.setState({
      secondNameMaxSize: maxSize,
      secondNameSize:
        this.state.secondNameSize > maxSize
          ? maxSize
          : this.state.secondNameSize,
    });
  }

  async processAutoClipping(rawData, s3Link, fileName) {
    const formData = new FormData();

    if (s3Link) {
      formData.append("link", s3Link);

      formData.append("logo", "False");
    } else {
      formData.append("file", rawData, fileName);

      formData.append("logo", "False");
    }

    const config = {
      headers: {
        "content-type": "multipart/form-data",
      },
    };

    // API UPDATE
    return await axios.post(`${this.API_BASE_URL1}`, formData, config);
  }

  processClippedImage(imageId, idx) {
    /* download and show */
    const formData = new FormData();

    formData.append("imageid", imageId);
    formData.append("download", true);

    const config = {
      headers: {
        "content-type": "multipart/form-data",
      },
    };

    // before downloading, show the loading animator
    this.setState({
      bgRemoving: this.state.bgRemoving.map((f, i) => (i === idx ? true : f)),
    });

    // API UPDATE
    axios
      .post(`${this.API_BASE_URL}/clipping/download`, formData, config)
      .then(({ data }) => {
        if (data.statusCode !== 200) {
          console.log(
            `Error on processClippedImage(): ${data.error.type} : ${data.error.description}`
          );
          return;
        }
        this.processClippingMagicResultImage(idx, data.data.base64);
      });
  }

  showClippingMagicEditingTool(idx) {
    const cmInfo = this.state.imageCMInfos[idx];
    if (!cmInfo.id || !cmInfo.secret) return;

    // hide the loading animator
    this.setState({
      bgRemoving: this.state.bgRemoving.map((f, i) => (i === idx ? false : f)),
    });

    // open the clippingMagic editing tool
    window.ClippingMagic.edit(
      {
        image: {
          id: cmInfo.id,
          secret: cmInfo.secret,
        },
        locale: "en-US",
      },
      (opts) => {
        if (opts.event === "result-generated") {
          console.log("result-generated");

          // download the result image
          this.processClippedImage(cmInfo.id, idx);
        }
      }
    );
  }

  async modifyWithClippingMagicTool(evt, idx) {
    evt.stopPropagation();

    const {
      images,
      imageBaseNames,
      originLinks,
      orignalImages,
      bg2remove,
      is_background_removed,
      autoPoster,
    } = this.state;
    if (!imageBaseNames[idx] && !originLinks[idx]) return;
    //this.setState({orignalImage: this.state.orignalImages[idx],removedImage: this.state.removedImages[idx],idx:idx})
    if ((!(idx === 2) || bg2remove === true) && orignalImages[idx] !== null) {
      this.props.sendToEditor({
        orignalImage: this.state.orignalImages[idx],
        removedImage: this.state.removedImages[idx],
        idx,
      });
      this.props.storeEditorAction(this.state.storeEditor[idx]);
      this.setState({ editor: true });
    } else {
      let response;
      this.setState({
        bgRemoving: this.state.bgRemoving.map((f, i) => (i === idx ? true : f)),
      });

      if (autoPoster === true) {
        const base64Response = await fetch(this.state.base64[idx]);
        const blob = await base64Response.blob();
        response = await this.processAutoClipping(
          blob,
          originLinks[idx],
          imageBaseNames[idx],
          "person"
        );
      } else {
        response = await this.processAutoClipping(
          images[idx],
          originLinks[idx],
          imageBaseNames[idx],
          "person"
        );
      }
      const { data } = response;
      this.props.sendToEditor({
        orignalImage: `data:image/png;charset=utf-8;base64,${data.data.original}`,
        removedImage: `data:image/png;charset=utf-8;base64,${data.data.base64}`,
        idx,
      });
      this.props.storeEditorAction(this.state.storeEditor[idx]);
      this.setState({
        removedImages: this.state.removedImages.map((f, i) =>
          i === idx
            ? `data:image/png;charset=utf-8;base64,${data.data.base64}`
            : f
        ),
        orignalImages: this.state.orignalImages.map((f, i) =>
          i === idx
            ? `data:image/png;charset=utf-8;base64,${data.data.original}`
            : f
        ),
      });
      this.setState({
        bgRemoving: this.state.bgRemoving.map((f, i) =>
          i === idx ? false : f
        ),
      });

      this.setState({ editor: true });
      this.setState({ bg2remove: true });
    }

    //this.props.history.push('/editor')
  }
  onDropHandler = async (files, idx) => {
    this.setState({
      storeEditor: this.state.storeEditor.map((f, i) => {
        if (i === idx) {
          return {
            drawnPos: [],
            mode: 0,
            color: "",
            image: null,
            blur: 0,
          };
        } else return f;
      }),
    });
    const fileName = files[0].name;
    const file = await fetch(files[0].preview).then((res) => res.blob());

    this.setState({
      originLinks: this.state.originLinks.map((l, i) => (i === idx ? "" : l)),
    });
    this.onReadUrlHandler(file, fileName, idx);
  };

  onReadUrlHandler = async (file, fileName, idx) => {
    const isLogoImage = idx === 2;

    if (!file) {
      this.setState({
        images: this.state.images.map((f, i) => (i === idx ? null : f)),
        imageBaseNames: this.state.imageBaseNames.map((f, i) =>
          i === idx ? "" : f
        ),
        base64: this.state.base64.map((f, i) => (i === idx ? demoImage : f)),
      });
      return;
    }

    this.setState({
      imageFileNames: this.state.imageFileNames.map((p, i) =>
        i === idx ? fileName.split(".").slice(0, -1).join(".") : p
      ),
      imageBaseNames: this.state.imageBaseNames.map((f, i) =>
        i === idx ? fileName : f
      ),
      images: this.state.images.map((f, i) => (i === idx ? file : f)),
      bgRemoved: this.state.bgRemoved.map((f, i) => (i === idx ? false : f)),
    });

    // Before API call, start loading animator
    this.setState({
      bgRemoving: this.state.bgRemoving.map((f, i) => (i === idx ? true : f)),
      bgRemovingBtnText: this.state.bgRemovingBtnText.map((t, i) =>
        i === idx ? (isLogoImage ? "Loading" : "Auto clipping") : t
      ),
      imageCMInfos: this.state.imageCMInfos.map((f, i) =>
        i === idx ? { id: null, secret: null } : f
      ),
      visualPos: this.state.visualPos.map((v, i) =>
        i === idx
          ? {
              visualLeft: 0.5,
              visualTop: 0.5,
            }
          : v
      ),
    });

    try {
      if (isLogoImage) {
        const reader = new FileReader();
        reader.onloadend = () => {
          this.processClippingMagicResultImage(idx, reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        // get base64 of auto clipped image
        const { data } = await this.processAutoClipping(
          file,
          this.state.originLinks[idx],
          fileName,
          "person"
        );
        this.setState({
          removedImages: this.state.removedImages.map((f, i) =>
            i === idx
              ? `data:image/png;charset=utf-8;base64,${data.data.base64}`
              : f
          ),
          orignalImages: this.state.orignalImages.map((f, i) =>
            i === idx
              ? `data:image/png;charset=utf-8;base64,${data.data.original}`
              : f
          ),
        });
        this.setState({ apiload: 1 });
        /* this.setState({orignalImage: `data:image/png;charset=utf-8;base64,${data.data.original}`,removedImage:`data:image/png;charset=utf-8;base64,${data.data.base64}`}) */
        if (data.statusCode !== 200) {
          throw new Error(`${data.error.type} : ${data.error.description}`);
        }

        // download image, get base64, and show image
        this.processClippingMagicResultImage(idx, data.data.base64);
      }
    } catch (err) {
      console.log("Errror on onReadUrlHandler(): ", err);

      this.setState({
        bgRemoving: this.state.bgRemoving.map((f, i) => (i === 2 ? false : f)),
      });
    }

    this.setState({
      bgRemovingBtnText: this.state.bgRemovingBtnText.map((t, i) =>
        i === idx ? (isLogoImage ? "Remove bg" : "Modify") : t
      ),
    });
  };

  getColorsFromBase64(base64) {
    const imageElement = document.createElement("img");
    imageElement.src = base64;

    Vibrant.from(imageElement)
      .getPalette()
      .then((palette) => {
        const {
          sport,
          isAuto,
          originTintColorValue,
          originPatternColorValue,
          tintColorValue,
          secondTintColorValue,
        } = this.state;
        console.log("palette", palette);
        const tintVibrantHex = palette.Vibrant.hex;

        const colorSettings = {
          palette: {
            Vibrant: palette.Vibrant.hex,
            LightVibrant: palette.LightVibrant.hex,
            DarkVibrant: palette.DarkVibrant.hex,
            Muted: palette.Muted.hex,
            LightMuted: palette.LightMuted.hex,
            DarkMuted: palette.DarkMuted.hex,
          },
          playerNumStroke: palette.DarkVibrant.hex,
          // secondNameColor: palette.DarkVibrant.hex,
        };

        /*  debugger; */
        // TODO: tintColor is ultimate override

        if (isAuto) {
          colorSettings.tintColorValue =
            originTintColorValue === "#000000" ||
            !!originTintColorValue === false
              ? tintVibrantHex
              : tintColorValue;

          colorSettings.secondTintColorValue =
            originPatternColorValue === "#000000" ||
            !!originPatternColorValue === false
              ? palette.DarkVibrant.hex
              : secondTintColorValue;
        } else {
          colorSettings.tintColorValue = tintVibrantHex;
          colorSettings.originPatternColorValue = palette.DarkVibrant.hex;
        }

        colorSettings.secondNameColor = colorSettings.tintColorValue;

        this.setState(colorSettings);
      })
      .catch((err) => {
        console.log("Virbrant.js, error :", err);
      });
  }

  async processClippingMagicResultImage(idx, base64) {
    const img = new Image();
    const comp = this;

    img.crossOrigin = "Anonymous";
    img.src = base64.startsWith("data:image")
      ? base64
      : `data:image/png;charset=utf-8;base64,${base64}`;

    img.onload = async function () {
      console.log(img.width, img.height);
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext("2d").drawImage(this, 0, 0, img.width, img.height);
      console.log("isAuto model", img.width);

      // Returns a copy of a canvas element with surrounding transparent space removed, and then get base64 data
      await comp.processBase64(trimCanvas(canvas).toDataURL("image/png"), idx);

      // After auto-clipping result, stop the loading animator
      comp.setState({
        bgRemoving: comp.state.bgRemoving.map((f, i) =>
          i === idx ? false : f
        ),
      });
    };
  }

  async base64ToRawPng(idx) {
    const base64 = this.state.base64[idx];
    return await fetch(base64).then((res) => res.blob());
  }

  getImageTypeFromBase64(idx) {
    const base64 = this.state.base64[idx];
    const type = base64.match(/^data:image\/(.*?);base64/);
    return type ? "." + type[1] : ".png";
  }

  onSubmitHandler = async () => {
    const formData = new FormData();
    const { sport, isAuto, playerId } = this.state;

    for (let p of this.serializableStateKeys) {
      formData.append(p, this.state[p]);
    }

    formData.append("visualPos", JSON.stringify(this.state.visualPos));
    formData.append("rotateAngle", JSON.stringify([0, 0, 0]));
    formData.append("elementsPos", JSON.stringify(this.state.elementsPos));

    // replace file extension
    formData.append(
      "images[]",
      await this.base64ToRawPng(0),
      this.state.imageFileNames[0].length > 0
        ? this.state.imageFileNames[0] + this.getImageTypeFromBase64(0)
        : ""
    );
    formData.append(
      "images[]",
      await this.base64ToRawPng(1),
      this.state.imageFileNames[1].length > 0
        ? this.state.imageFileNames[1] + this.getImageTypeFromBase64(1)
        : ""
    );
    formData.append(
      "images[]",
      await this.base64ToRawPng(2),
      this.state.imageFileNames[2].length > 0
        ? this.state.imageFileNames[2] + this.getImageTypeFromBase64(2)
        : ""
    );

    // automate
    if (isAuto) {
      const settings = {};
      const serializableStateKeys = [
        "playerId",
        "sport",
        ...this.serializableStateKeys,
        "palette",
        "visualPos",
        "elementsPos",
        "imageFileNames",
        "bgRemoved",
        "bgRemovingBtnText",
        "imageBaseNames",
        "imageCMInfos",
        "playerImageScaleMode",
        "originLinks",
        "originTintColorValue",
        "originPatternColorValue",
        // "productUniqueId",
        // "productAccepting"
      ];

      for (let p of serializableStateKeys) {
        settings[p] = this.state[p];
      }
      formData.append("isAutoMode", isAuto);
      formData.append("playerId", playerId);
      formData.append("settings", JSON.stringify(settings));
    }

    formData.append("Submit", true);

    const config = {
      headers: {
        "content-type": "multipart/form-data",
        accept: "image/png",
      },
    };

    /* calculate steps for progressing ; split a second into 10 parts */

    const estimatedTime = this.state.estimatedTime * 10; // count of 100ms
    const step = 1.0 / estimatedTime;
    let points = Array(estimatedTime);

    for (let idx = 0; idx < estimatedTime; idx++)
      points[idx] = (100 * easeQuad(idx * step)).toFixed(0);

    points = ["0", ...points.filter((p) => p > 0), "100"];

    this.setState({
      productLoading: true,
      percentPoints: points,
      producedImage: null,
    });

    // API UPDATE
    axios
      .post(
        `${this.API_BASE_URL}/product/photo-day/${this.state.photoDayTemplateStyle}`,
        formData,
        config
      )
      .then(async ({ data }) => {
        if (data.statusCode !== 200) {
          throw new Error(`${data.error.type} : ${data.error.description}`);
        }
        const timeElapsed = data.data.time_elapsed;
        const base64 =
          "data:image/png;base64," +
          (timeElapsed ? data.data.base64 : data.data);
        const sleep = (time) =>
          new Promise((resolve) => setTimeout(resolve, time));

        this.setState({
          producedImage: base64,
          percentPoints: [98, 98, 98, 98, 99, 99, 99, 100],
        });

        await sleep(900);

        this.setState({ productLoading: false });

        this.wrapAcceptedFormData();

        if (isAuto) {
          const { poster } = data.data;
          this.setState({
            productUniqueId: poster.unique_id,
            productAccepting: false,
            posterload: 1,
          });
        }
      })
      .catch((err) => {
        console.log("Error on onSubmitHandler()", err);

        this.setState({
          productLoading: false,
        });
      });
  };

  async wrapAcceptedFormData() {
    // wrap accepted form data
    const acceptedData = {};
    const serializableStateKeys = [
      "sport",
      ...this.serializableStateKeys,
      "palette",
      "visualPos",
      "elementsPos",
      "imageFileNames",
      "bgRemoved",
      "bgRemovingBtnText",
      "imageBaseNames",
      "imageCMInfos",
      "playerImageScaleMode",
      "productUniqueId",
      "productAccepting",
      "originLinks",
    ];

    for (let p of serializableStateKeys) {
      acceptedData[p] = this.state[p];
    }

    for (let i of [0, 1, 2])
      acceptedData[`image${i}`] =
        this.state.base64[i] === demoImage ? "" : this.state.base64[i];

    const rawImageFormData = new FormData();
    for (let i of [0, 1, 2]) {
      rawImageFormData.append(
        "rawImage[]",
        this.state.images[i]
          ? this.state.images[i]
          : new Blob([demoImage], { type: "image/png" }),
        this.state.imageBaseNames[i]
      );
    }

    acceptedData["rawImages"] = rawImageFormData;

    this.setState({
      acceptedFormData: acceptedData,
    });
  }

  async processBase64(base64, idx) {
    visualCenter(base64, (err, result) => {
      const { visualTop, visualLeft, bgColor } = result;

      if (idx === 1) {
        this.getColorsFromBase64(base64);
      }

      this.setState({
        visualPos: this.state.visualPos.map((v, i) =>
          i === idx ? { visualLeft: visualLeft, visualTop: 0.5 } : v
        ),
        base64: this.state.base64.map((b, i) => (i === idx ? base64 : b)),
        apiload: 1,
      });
    });
  }

  // clear image on the upload area
  clearImage(evt, idx) {
    evt.stopPropagation();
    this.setState({
      storeEditor: this.state.storeEditor.map((f, i) => {
        if (i === idx) {
          return {
            drawnPos: [],
            mode: 0,
            color: "",
            image: null,
            blur: 0,
          };
        } else return f;
      }),
    });
    this.setState({
      base64: this.state.base64.map((b, i) => (i === idx ? demoImage : b)),
      file: this.state.images.map((b, i) => (i === idx ? null : b)),
      imageFileNames: this.state.imageFileNames.map((b, i) =>
        i === idx ? "" : b
      ),
      imageBaseNames: this.state.imageBaseNames.map((b, i) =>
        i === idx ? "" : b
      ),
      bgRemoved: this.state.bgRemoved.map((b, i) => (i === idx ? true : b)),
      originLinks: this.state.originLinks.map((b, i) => ""),
      orignalImages: this.state.orignalImages.map((b, i) => null),
      removedImages: this.state.removedImages.map((b, i) => null),
    });
  }

  moveVisualVertPos(evt, idx, dir = 1) {
    const step = dir * 0.02;
    evt.stopPropagation();

    this.setState({
      visualPos: this.state.visualPos.map((v, i) =>
        i === idx
          ? { visualLeft: v.visualLeft, visualTop: v.visualTop + step }
          : v
      ),
    });
  }

  moveVisualHorizPos(evt, idx, dir = 1) {
    const step = dir * 0.02;
    evt.stopPropagation();

    this.setState({
      visualPos: this.state.visualPos.map((v, i) =>
        i === idx
          ? { visualLeft: v.visualLeft + step, visualTop: v.visualTop }
          : v
      ),
    });
  }

  moveElementVert(name, dir = 1) {
    const step = dir * 0.1;
    let { elementsPos } = this.state;
    if (Array.isArray(elementsPos)) {
      elementsPos = {};
    }

    elementsPos[name] = elementsPos[name] ? elementsPos[name] + step : step;
    this.setState({
      elementsPos,
    });
  }

  // copy code to clipboard
  copyProductUniqueIdToClipboard() {
    const textArea = document.createElement("textarea");
    textArea.value = this.state.productUniqueId;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("Copy");
    textArea.remove();
    this.setState({ copyTooltipText: "Copied" });
  }
  saveFun = (removed, idx, obj) => {
    this.setState({ editor: false });
    this.setState({
      storeEditor: this.state.storeEditor.map((f, i) => {
        if (i === idx) {
          return {
            drawnPos: obj.drawnPos,
            mode: obj.mode,
            color: obj.color,
            image: obj.image,
            blur: obj.blur,
          };
        } else return f;
      }),
    });

    this.processClippingMagicResultImage(idx, removed);
    //this.setState({base64:this.state.base64.map((f, i) => (i === idx ? removed : f))})
  };
  closeFun = () => {
    this.setState({ editor: false });
  };
  handleTemplateStyleChange(e) {
    this.setState({
      photoDayTemplateStyle: e.target.value,
    });
  }

  render() {
    const {
      base64,
      visualPos,
      headerCopy,
      footerCopy,
      playerNum,
      playerNumStroke,
      tintColor,
      tintColorValue,
      secondTintColor,
      secondTintColorValue,
      photoDayTemplateStyle,
      firstName,
      firstNameColor,
      firstNameSize,
      firstNameFamily,
      secondName,
      secondNameColor,
      secondNameSize,
      secondNameFamily,
      producedImage,
      productLoading,
      firstNameMaxSize,
      secondNameMaxSize,
      bgRemoving,
      bgRemoved,
      palette,
      percentPoints,
      playerImageScaleMode,
      playerImageWidth,
      copyTooltipText,

      productUniqueId,
      productAccepting,
      acceptedFormData,
      footerCopyColor,
      headerCopyColor,
    } = this.state;

    return (
      <>
        {this.state.editor ? (
          <Editor
            orignal={this.state.orignalImage}
            removed={this.state.removedImage}
            idx={this.state.idx}
            saveFun={this.saveFun}
            closeFun={this.closeFun}
          />
        ) : (
          <div className="app photo-day-app" style={{ color: "#333" }}>
            <div className="app-sidebar">
              <div>
                <canvas id="cs" style={{ display: "none" }}></canvas>
              </div>

              <h1 className="heading">Poster</h1>
              <input
                type="text"
                class="d-none"
                id="apiload"
                value={this.state.apiload}
              />
              <input
                type="text"
                class="d-none"
                id="posterload"
                value={this.state.posterload}
              />
              {productLoading && (
                <ChangingProgressProvider values={percentPoints}>
                  {(percentage) => (
                    <CircularProgressbar
                      value={percentage}
                      text={`${percentage}%`}
                      styles={buildStyles({
                        pathTransitionDuration: 0.15,
                        pathColor: `rgba(62, 152, 199)`,
                        textColor: "#e88",
                        trailColor: "#d6d6d6",
                        backgroundColor: "#3e98c7",
                      })}
                      className="product-progress-bar"
                    />
                  )}
                </ChangingProgressProvider>
              )}

              {/* <PNGDownload base64={producedImage} /> */}

              {!productLoading && producedImage && producedImage.length > 0 && (
                <img
                  src={producedImage}
                  alt="producedPoster"
                  className="producedImage"
                  onContextMenu={(e) => e.preventDefault()}
                  draggable={false}
                />
              )}
            </div>

            <div className="app-header">
              <h2 className="title">Photo Day</h2>
              <Link to="/" className="back-link">
                «&nbsp;Back to Home
              </Link>
            </div>

            <div className="app-main">
              <div className="images-section -show-guides">
                {/* first image dropzone */}
                <div className="column">
                  <Dropzone
                    onDrop={(files) => this.onDropHandler(files, 1)}
                    className="dropzone"
                  >
                    <div className="demo-image-container-title"></div>
                    <h2>Player Image</h2>
                    <div style={{ marginTop: "1rem" }}>
                      Start by selecting your image. Click or drop here.
                    </div>

                    <div className="demo-image-container">
                      <img
                        src={base64[1]}
                        style={{
                          transform: `translatey(-${
                            visualPos[1].visualTop * 100
                          }%) translatex(${-visualPos[1].visualLeft * 100}%)`,
                        }}
                        className="demo-image"
                        alt="double pose"
                      />

                      {/* Move up/down controls */}
                      <div className="demo-image-controller">
                        {base64[1] !== demoImage && (
                          <div className="clear-image">
                            <img
                              src={ClearImageIcon}
                              className="clear-image-action"
                              onClick={(evt) => this.clearImage(evt, 1)}
                              alt="clear-control"
                            />
                          </div>
                        )}
                        <div className="move-image-up">
                          <img
                            src={UpArrow}
                            className="move-image-up-action"
                            onClick={(evt) => this.moveVisualVertPos(evt, 1, 1)}
                            alt="up-control"
                          />
                        </div>
                        <div className="move-image-down">
                          <img
                            src={UpArrow}
                            className="move-image-down-action"
                            onClick={(evt) =>
                              this.moveVisualVertPos(evt, 1, -1)
                            }
                            alt="down-control"
                          />
                        </div>
                      </div>

                      <LeftRightControls
                        handler={(e, d) => this.moveVisualHorizPos(e, 1, d)}
                      />
                    </div>

                    <label
                      className={
                        "app-control loader-button " +
                        (bgRemoved[1] ? "bg-removed" : "")
                      }
                      onClick={(e) => {
                        this.modifyWithClippingMagicTool(e, 1);
                      }}
                    >
                      <div>{this.state.bgRemovingBtnText[1]}</div>

                      {bgRemoving[1] && (
                        <ClipLoader
                          size={20}
                          color={"white"}
                          className="loader"
                          loading={bgRemoving[1]}
                        />
                      )}
                    </label>
                  </Dropzone>
                </div>

                <div className="column">
                  <div className="app-control-container">
                    <label className="app-control">
                      <div>Poster template</div>
                      <select
                        value={photoDayTemplateStyle}
                        onChange={this.handleTemplateStyleChange.bind(this)}
                      >
                        {new Array(3).fill(0).map((_, i) => (
                          <option
                            key={i}
                            value={`template${i + 1}`}
                          >{`Template ${i + 1}`}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="app-control-container">
                    <label className="app-control">
                      <div>Header Copy</div>
                      <input
                        type="text"
                        value={headerCopy}
                        onChange={(e) => {
                          this.setState({ headerCopy: e.target.value });
                        }}
                      />
                    </label>

                    <InputColor
                      initialHexColor={headerCopyColor}
                      onChange={(e) =>
                        this.setState({
                          headerCopyColor: e.hex,
                        })
                      }
                      key="header-copy-colorpicker"
                    />

                    <label className="app-control" key="footer-copy-label">
                      <div>Team Name</div>
                      <input
                        type="text"
                        value={footerCopy}
                        onChange={(e) => {
                          this.setState({ footerCopy: e.target.value });
                        }}
                      />
                    </label>

                    <InputColor
                      initialHexColor={footerCopyColor}
                      onChange={(e) =>
                        this.setState({
                          footerCopyColor: e.hex,
                        })
                      }
                      key="footer-copy-colorpicker"
                    />
                  </div>
                  {!!playerNumStroke && (
                    <div className="app-control-container">
                      <label className="app-control">
                        <div>Player Number</div>
                        <input
                          type="number"
                          value={playerNum}
                          onChange={(e) => {
                            this.setState({ playerNum: e.target.value });
                          }}
                        />
                      </label>

                      <InputColor
                        initialHexColor={playerNumStroke}
                        onChange={(e) =>
                          this.setState({
                            playerNumStroke: e.hex,
                          })
                        }
                        key="playernum-color-picker"
                        disabled={true}
                      />

                      <label className="app-control name">
                        {this.state.elementsPos["playerNum"] &&
                          `${parseInt(
                            32 * this.state.elementsPos["playerNum"],
                            10
                          )}px`}
                        <div className="move-image-up">
                          <img
                            src={MoveUp}
                            className="move-image-up-action"
                            onClick={(evt) =>
                              this.moveElementVert("playerNum", 1)
                            }
                            alt="up-control"
                          />
                        </div>
                        <div className="move-image-down">
                          <img
                            src={MoveUp}
                            className="move-image-down-action"
                            onClick={(evt) =>
                              this.moveElementVert("playerNum", -1)
                            }
                            alt="down-control"
                          />
                        </div>
                      </label>
                    </div>
                  )}

                  <TintColorControl
                    title="Primary Color"
                    color={tintColorValue}
                    colorHandler={(color) =>
                      this.setState({
                        tintColorValue: color,
                      })
                    }
                  />

                  <TintColorControl
                    title="Secondary Color"
                    color={secondTintColorValue}
                    colorHandler={(color) =>
                      this.setState({
                        secondTintColorValue: color,
                        playerNumStroke: color,
                      })
                    }
                  />

                  <div className="app-control-container">
                    <label className="app-control image-width-scale-mode">
                      <div>Player Image Width</div>

                      <label>
                        <input
                          type="radio"
                          value="Contain"
                          checked={playerImageScaleMode === "Contain"}
                          onChange={(e) =>
                            this.setState({
                              playerImageScaleMode: "Contain",
                              playerImageWidth: 700,
                            })
                          }
                        />
                        Contain
                      </label>
                      <label>
                        <input
                          type="radio"
                          value="Cover"
                          checked={playerImageScaleMode === "Cover"}
                          onChange={(e) =>
                            this.setState({
                              playerImageScaleMode: "Cover",
                              playerImageWidth: 900,
                            })
                          }
                        />
                        Cover
                      </label>
                      <label>
                        <input
                          type="radio"
                          value="Manual"
                          checked={playerImageScaleMode === "Manual"}
                          onChange={(e) =>
                            this.setState({ playerImageScaleMode: "Manual" })
                          }
                        />
                        Manual
                        <input
                          type="number"
                          name="imageManualWidth"
                          value={playerImageWidth}
                          disabled={!(playerImageScaleMode === "Manual")}
                          onChange={(e) =>
                            this.setState({ playerImageWidth: e.target.value })
                          }
                        />
                        <i>px</i>
                      </label>
                    </label>
                  </div>
                </div>
              </div>

              {/* {palette && palette.Vibrant && (
                <div className="app-control-container">
                  <label className="app-control">
                    <div>
                      <i>Suggested colors</i>
                    </div>
                    <VibrantPalette
                      palette={palette}
                      onVibrantColorSelect={(colorName, colorHex) =>
                        this.setState({
                          tintColor: colorName,
                          tintColorValue: colorHex,
                        })
                      }
                      key="vibrant-palette"
                    />
                  </label>
                </div>
              )} */}

              {!!firstNameSize && (
                <div className="app-control-container">
                  <label className="app-control">
                    <div>First Name</div>
                    <input
                      type="text"
                      value={firstName}
                      onChange={this.onFNameChange}
                    />
                  </label>

                  <label className="app-control">
                    <div>Font Family</div>
                    <select
                      value={firstNameFamily}
                      onChange={(e) => {
                        this.setState({ firstNameFamily: e.target.value });
                        this.onFNameChange$.next(firstName);
                      }}
                    >
                      <option value="Freshman">Freshman</option>
                      <option value="Amigos">Amigos</option>
                      <option value="Howard">Howard</option>
                      <option value="Blacksword">Blacksword</option>
                      <option value="Master of Break">Master of Break</option>
                    </select>
                  </label>

                  <label className="app-control">
                    <div>
                      Font Size <i>(px)</i>
                    </div>
                    <input
                      type="number"
                      value={firstNameSize}
                      min={40}
                      max={firstNameMaxSize}
                      onChange={(e) => {
                        this.setState({ firstNameSize: e.target.value });
                      }}
                    />
                  </label>

                  <label className="app-control">
                    <div>
                      <i>Up to {firstNameMaxSize} (px)</i>
                    </div>
                  </label>

                  <InputColor
                    initialHexColor={firstNameColor}
                    onChange={(e) =>
                      this.setState({
                        firstNameColor: e.hex,
                      })
                    }
                    key="first-name-color-picker"
                  />

                  <label className="app-control name">
                    {this.state.elementsPos["firstName"] &&
                      `${parseInt(
                        32 * this.state.elementsPos["firstName"],
                        10
                      )}px  `}
                    <div className="move-image-up">
                      <img
                        src={MoveUp}
                        className="move-image-up-action"
                        onClick={(evt) => this.moveElementVert("firstName", 1)}
                        alt="up-control"
                      />
                    </div>
                    <div className="move-image-down">
                      <img
                        src={MoveUp}
                        className="move-image-down-action"
                        onClick={(evt) => this.moveElementVert("firstName", -1)}
                        alt="down-control"
                      />
                    </div>
                  </label>
                </div>
              )}

              {!!secondNameSize && (
                <div className="app-control-container">
                  <label className="app-control">
                    <div>Second Name</div>
                    <input
                      type="text"
                      value={secondName}
                      onChange={this.onSNameChange}
                    />
                  </label>

                  <label className="app-control">
                    <div>Font Family</div>
                    <select
                      value={secondNameFamily}
                      onChange={(e) => {
                        this.setState({ secondNameFamily: e.target.value });
                        this.onSNameChange$.next(secondName);
                      }}
                    >
                      <option value="Freshman">Freshman</option>
                      <option value="Amigos">Amigos</option>
                      <option value="times new roman bold">
                        Times New Roman
                      </option>
                      <option value="Blacksword">Blacksword</option>
                      <option value="Nachtwache">Nachtwache</option>
                    </select>
                  </label>

                  <label className="app-control ">
                    <div>
                      Font Size <i>(px)</i>
                    </div>
                    <input
                      type="number"
                      value={secondNameSize}
                      min={40}
                      max={secondNameMaxSize}
                      onChange={(e) => {
                        this.setState({ secondNameSize: e.target.value });
                      }}
                    />
                  </label>

                  <label className="app-control">
                    <div>
                      <i>Up to {secondNameMaxSize} (px)</i>
                    </div>
                  </label>

                  <InputColor
                    initialHexColor={secondNameColor}
                    onChange={(e) =>
                      this.setState({
                        secondNameColor: e.hex,
                      })
                    }
                    key="second-name-color-picker"
                  />

                  <label className="app-control name">
                    {this.state.elementsPos["secondName"] &&
                      `${parseInt(
                        32 * this.state.elementsPos["secondName"],
                        10
                      )}px  `}
                    <div className="move-image-up">
                      <img
                        src={MoveUp}
                        className="move-image-up-action"
                        onClick={(evt) => this.moveElementVert("secondName", 1)}
                        alt="up-control"
                      />
                    </div>
                    <div className="move-image-down">
                      <img
                        src={MoveUp}
                        className="move-image-down-action"
                        onClick={(evt) =>
                          this.moveElementVert("secondName", -1)
                        }
                        alt="down-control"
                      />
                    </div>
                  </label>
                </div>
              )}

              <div className="app-control-container">
                <label className="app-control">
                  <input
                    type="button"
                    value="Produce"
                    className="produce submit"
                    onClick={async () => await this.onSubmitHandler()}
                  />

                  {producedImage && acceptedFormData && (
                    <input
                      type="button"
                      value={!!productUniqueId ? "Update" : "Accept"}
                      className="accept submit"
                      // disabled={!!productUniqueId}
                      onClick={async () => {
                        this.setState({ productAccepting: true });
                        const { data } = await acceptPoster(
                          producedImage,
                          acceptedFormData,
                          3
                        );
                        this.setState({
                          productUniqueId: data.data.unique_id,
                          productAccepting: false,
                          acceptedFormData: null,
                        });
                      }}
                    />
                  )}
                </label>

                {/* <label className="app-control">
              <input type="button" value="Download as PSD" className="submit download-psd" disabled={bgRemoving} onClick={async () => await this.onSubmitHandler()}/>
            </label> */}
              </div>

              <div className="app-control-container">
                <label className="app-control copy-tooltip">
                  {!!productUniqueId && [
                    <div
                      className="product-id"
                      onClick={() => this.copyProductUniqueIdToClipboard()}
                      onMouseOut={() =>
                        this.setState({ copyTooltipText: "Copy to clipboard" })
                      }
                      key="copy-to-clipboard"
                    >
                      {productUniqueId}
                    </div>,
                    <span
                      className="tooltiptext"
                      id="myTooltip"
                      key="copy-to-clipboard-tip"
                    >
                      {copyTooltipText}
                    </span>,
                  ]}
                  {productAccepting && [
                    <ClipLoader
                      size={40}
                      color={"#227f26"}
                      className="loader"
                      loading={productAccepting}
                      key="product-accepting-loader"
                    />,
                  ]}
                </label>
              </div>

              <div className="app-control-container hidden-ground">
                <div
                  className="first-name-playground"
                  style={{ color: firstNameColor, fontFamily: firstNameFamily }}
                  ref={this.setFirstNamePG}
                >
                  {firstName}
                </div>
              </div>

              <div className="app-control-container hidden-ground">
                <div
                  className="second-name-playground"
                  style={{
                    color: secondNameColor,
                    fontFamily: secondNameFamily,
                  }}
                  ref={this.setSecondNamePG}
                >
                  {secondName}
                </div>
              </div>
            </div>

            <ToastContainer autoClose={4000} />
          </div>
        )}
      </>
    );
  }
}
const mapStateToProps = (state) => ({
  editor: state.editor,
});
export default connect(mapStateToProps, { sendToEditor, storeEditorAction })(
  PhotoDay
);
