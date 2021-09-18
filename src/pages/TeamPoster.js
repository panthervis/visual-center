import React from "react";
import InputColor from "react-input-color";
import Dropzone from "react-dropzone";
import { Button, Container, Row, Col } from "react-bootstrap";
import { Link } from "react-router-dom";
import ClipLoader from "react-spinners/ClipLoader";
import Switch from "react-switch";
import Lightbox from "react-image-lightbox";
import { ToastContainer, toast } from "react-toastify";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";

import "react-image-lightbox/style.css";
import "react-circular-progressbar/dist/styles.css";
import "react-toastify/dist/ReactToastify.css";

import { Subject } from "rxjs";
import { debounceTime } from "rxjs/operators";
import { css } from "@emotion/core";
import axios from "axios";
import _ from "lodash";
import * as Vibrant from "node-vibrant";
import queryString from "query-string";

// animation
import { easeQuad } from "d3-ease";
import config from "../config";

// components
// import PNGDownload from "../components/PNGDownload";
import VibrantPalette from "../components/VibrantPalette.js";
import ChangingProgressProvider from "../components/ChangingProgressProvider.js";

// internal helpers
import visualCenter from "../helpers/visualCenter.js";
import * as textFit from "../helpers/textFit.js";
import trimCanvas from "../helpers/trimCanvas.js";
import { useCanvas, rgbToHex, hexToRgb } from "../helpers/pickColor.js";
import { base64EncArr, base64DecToArr } from "../helpers/base64Helper.js";
import {
  acceptPoster,
  fetchPosterData,
  fetchTeamData,
} from "../helpers/posterManagement";

// assets
import demoImage from "../assets/img/demo.js";
import UpArrow from "../assets/svg/up-arrow.svg";
import RightArrow from "../assets/img/right-arrow.png";
import MoveUp from "../assets/svg/move-up.svg";
import DropperIcon from "../assets/img/dropper-cursor.png";
import ClearImageIcon from "../assets/img/clear-image-icon.png";
import LeftRightControls from "../components/LeftRightControls";

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

class TeamPoster extends React.Component {
  constructor(props) {
    super();

    this.teamNamePG = null;

    this.setTeamNamePG = (element) => {
      this.teamNamePG = element;
    };

    this.previewLeftImageRef = React.createRef();
    this.previewRightImageRef = React.createRef();

    this.state = {
      isAuto: false, // required for auto build
      eventId: 0, // required for auto build
      teamId: 0, // required for auto build
      apiload: 0,
      posterload: 0,

      base64: [null, null, null],
      bgRemoved: [true, true, true],
      bgRemoving: [false, false, false],
      bgRemovingBtnText: ["Modify", "Modify", "Remove bg"],
      images: [null, null, null],
      imageFileNames: ["", "", ""], // without Extension
      imageBaseNames: ["", "", ""], // with Extension,
      originLinks: ["", "", ""], //s3 links to original images

      imageCMInfos: [
        // image information obtained through ClippingMagic tool
        { id: null, secret: null },
        { id: null, secret: null },
        { id: null, secret: null },
      ],

      palette: {}, // vibrant.js

      producedImage: null,
      visualPos: [
        // visual center positions
        {
          visualLeft: 0.5,
          visualTop: 0.667,
        },
        {
          visualLeft: 0.5,
          visualTop: 0.667,
        },
        {
          visualLeft: 0.5,
          visualTop: 0.667,
        },
      ],

      previewOffsets: [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
      ],
      elementsPos: {},

      isOnePhotoMode: false,
      isBanner: false,
      rightPhotoOffset: 0,

      sport: "hockey",
      headerCopy: "2021 HOCKEY SEASON",

      posterSize: "normal",

      isPickerImageOpen: false,
      pickerImagePath: null, // path of uploaded player image

      tintColor: "Blue",
      tintColorValue: "#275BD6",
      originTintColorValue: "#000000", // tint color that suggested on the event system (automation purpose)

      teamName: "BLACK KNIGHTS",
      teamNameSize: 200,
      teamNameMaxSize: 200,
      teamNameColor: "rgb(0,0,139)",
      teamNameStroke: "#32fc4d",
      teamNameFamily: "Algerian",

      teamImageHeight: 720,

      productLoading: false,
      percentPoints: [],
      estimatedTime: 12,

      productUniqueId: "",
      productAccepting: false,
      copyTooltipText: "Copy to clipboard",

      acceptedFormData: null,

      vendorName: "",
      templateStyle: "template5",
    };

    this.serializableStateKeys = [
      "isOnePhotoMode",
      "isBanner",
      "rightPhotoOffset",
      "headerCopy",
      "teamName",
      "teamNameColor",
      "teamNameSize",
      "teamNameFamily",
      "teamNameStroke",
      "templateStyle",
      "tintColor",
    ];

    this.logoFirstSports = ["hockey", "soccer"];
    this.uniformFirstSports = [
      "baseball",
      "soccer",
      "football",
      "lacrosse",
      "basketball",
    ];

    this.API_BASE_URL = config.apiUrl;

    this.onFNameChange$ = new Subject();
    this.onFNameChange = this.onFNameChange.bind(this);
  }

  async componentDidMount() {
    const routeParams = queryString.parse(this.props.location.search);
    this.setState({
      base64: [demoImage, demoImage, demoImage],
      isAuto: false,
      isBanner: !!routeParams.banner,
      eventId: 0,
      teamId: 0,
    });

    if (routeParams.poster_id) {
      await this.loadPoster(routeParams.poster_id);
    } else if (routeParams.event_id && routeParams.team_id) {
      await this.loadTeam(
        routeParams.team_id,
        routeParams.event_id,
        !!routeParams.auto
      );
    } else {
      this.setState(await this.fetchTemplateConfig("template5"));
    }

    this.determineTeamNameMaxSize();

    this.fnSubscription = this.onFNameChange$
      .pipe(debounceTime(300))
      .subscribe((_) => {
        this.determineTeamNameMaxSize();
      });
  }

  componentWillUnmount() {
    if (this.fnSubscription) {
      this.fnSubscription.unsubscribe();
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
    });
  }

  async loadTeam(teamId, eventId, automate = false) {
    // show toast notification
    toast.info("Loading team images ...", {
      position: toast.POSITION.TOP_CENTER,
    });

    const teamData = await fetchTeamData(teamId, eventId);
    let sportC;

    if (teamData.sport === "volleyball") {
      sportC = "soccer";
    } else if (teamData.sport === "basketball 5 on 5") {
      sportC = "basketball";
    } else {
      sportC = teamData.sport;
    }

    const sportConfig = await this.fetchSportConfig(teamData.sport);
    const templateConfig = await this.fetchTemplateConfig(
      teamData.templateStyle
    );

    this.setState({
      ...sportConfig,
      ...templateConfig,
      ...teamData,
      base64: teamData.images.map((t) => (t.link ? t.base64 : demoImage)),

      // TODO: team poster automation

      originTintColorValue: teamData.tintColorValue,
      teamId,
      eventId,
      isAuto: automate,
    });

    // convert base64 to blob, and pass it to main handler
    teamData.images
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
        this.onReadUrlHandler(blob, teamData.images[idx].baseName, idx);
      });
  }

  handleKeyEvent(e) {
    e = e || window.event;

    if (e.keyCode == 37) {
      // left arrow
      this.moveVisualHorizPos(e, e.ctrlKey ? 1 : 0, 1);
    } else if (e.keyCode === 39) {
      // right arrow
      this.moveVisualHorizPos(e, e.ctrlKey ? 1 : 0, -1);
    } else if (e.keyCode === 38) {
      // upwards
      this.moveVisualVertPos(e, e.ctrlKey ? 1 : 0, 1);
    } else if (e.keyCode === 40) {
      // downwards
      this.moveVisualVertPos(e, e.ctrlKey ? 1 : 0, -1);
    }
  }

  async fetchSportConfig(sport) {
    // API UPDATE
    let sportC;

    if (sport === "volleyball") {
      sportC = "soccer";
    } else if (sport === "basketball 5 on 5") {
      sportC = "basketball";
    } else {
      sportC = sport;
    }

    const response = await fetch(`${this.API_BASE_URL}/product/team/${sportC}`);
    const json = await response.json();

    if (json.statusCode !== 200) {
      throw new Error(`${json.error.type} : ${json.error.description}`);
    }
    const { data } = json;
    data.tintColorValue = predefinedColors[data.tintColor];
    data.elementsPos = {};
    data.sport = sportC;

    if (sport === "baseball") {
      data.footerCopy = "2021";
    } else if (sport === "hockey") {
      data.headerCopy = "2021 HOCKEY SEASON";
    } else if (sport === "soccer") {
      data.headerCopy = "SOCCER 2021 SEASON";
    } else if (sport === "basketball") {
      data.headerCopy = "BASKETBALL 2021 SEASON";
    } else {
      if (data.footerCopy == "2020") {
        data.footerCopy = "2021";
      }
      if (data.headerCopy == "2020") {
        data.headerCopy = "2021";
      }
    }

    return data;
  }

  async fetchTemplateConfig(templateStyle) {
    const response = await fetch(
      `${this.API_BASE_URL}/product/team/${templateStyle}`
    );
    const json = await response.json();

    if (json.statusCode !== 200) {
      throw new Error(`${json.error.type} : ${json.error.description}`);
    }
    const { data } = json;
    const sport = data.sport;

    data.tintColorValue = predefinedColors[data.tintColor];
    data.elementsPos = {};
    data.templateStyle = templateStyle;

    if (sport === "baseball") {
      data.footerCopy = "2021";
    } else if (sport === "hockey") {
      data.headerCopy = "2021 HOCKEY SEASON";
    } else if (sport === "soccer") {
      data.headerCopy = "SOCCER 2021 SEASON";
    } else if (sport === "basketball") {
      data.headerCopy = "BASKETBALL 2021 SEASON";
    } else {
      if (data.footerCopy == "2020") {
        data.footerCopy = "2021";
      }
      if (data.headerCopy == "2020") {
        data.headerCopy = "2021";
      }
    }

    return data;
  }

  onFNameChange(e) {
    const name = e.target.value;
    this.setState({ teamName: name });
    this.onFNameChange$.next(name);
  }

  sleep = (m) => new Promise((r) => setTimeout(r, m));

  determineTeamNameMaxSize() {
    if (!!this.teamNamePG === false) return;
    textFit(this.teamNamePG, { alignHoriz: true, maxFontSize: 400 });

    const style = window
      .getComputedStyle(
        document.querySelector(".first-name-playground > .textFitted"),
        null
      )
      .getPropertyValue("font-size");
    const maxSize = parseInt(style);

    this.setState({
      teamNameMaxSize: maxSize,
      teamNameSize:
        this.state.teamNameSize > maxSize ? maxSize : this.state.teamNameSize,
    });
  }

  async processAutoClipping(rawData, s3Link, fileName) {
    const formData = new FormData();

    if (s3Link) {
      formData.append("link", s3Link);
    } else {
      formData.append("image", rawData, fileName);
    }

    const config = {
      headers: {
        "content-type": "multipart/form-data",
      },
    };

    // API UPDATE
    return await axios.post(
      `${this.API_BASE_URL}/clipping/upload`,
      formData,
      config
    );
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

  // remove logo bg by auto clipping
  async removeLogoBg(evt) {
    const { images, bgRemoving, imageCMInfos, originLinks, imageBaseNames } =
      this.state;
    evt.stopPropagation();

    if (!images[2]) return;

    // before API call, start loading animator
    this.setState({
      bgRemoving: bgRemoving.map((f, i) => (i === 2 ? true : f)),
      imageCMInfos: imageCMInfos.map((f, i) =>
        i === 2 ? { id: null, secret: null } : f
      ),
    });

    try {
      // get base64 of auto clipped image
      const { data } = await this.processAutoClipping(
        images[2],
        originLinks[2],
        imageBaseNames[2]
      );

      if (data.statusCode !== 200) {
        throw new Error(`${data.error.type} : ${data.error.description}`);
      }

      // download image, get base64, and show image
      this.processClippingMagicResultImage(2, data.data.base64);
    } catch (err) {
      console.log("Error on removeLogoBg(): ", err);

      this.setState({
        bgRemoving: this.state.bgRemoving.map((f, i) => (i === 2 ? false : f)),
      });
    }
  }

  modifyWithClippingMagicTool(evt, idx) {
    evt.stopPropagation();
    const { images, imageBaseNames, imageCMInfos, originLinks } = this.state;
    const config = {
      headers: {
        "content-type": "multipart/form-data",
      },
    };

    if (imageCMInfos[idx].id) {
      this.showClippingMagicEditingTool(idx);
      return;
    }

    if (!imageBaseNames[idx] && !originLinks[idx]) return;

    const formData = new FormData();

    if (originLinks[idx]) {
      formData.append("link", originLinks[idx]);
    } else {
      formData.append("image", images[idx], imageBaseNames[idx]);
    }
    formData.append("modify", true);

    /* upload image to ClippingMagic backend, and open the editor */

    // show the loading animator
    this.setState({
      bgRemoving: this.state.bgRemoving.map((f, i) => (i === idx ? true : f)),
    });

    // API UPDATE
    axios
      .post(`${this.API_BASE_URL}/clipping/upload`, formData, config)
      .then(({ data }) => {
        if (data.statusCode !== 200) {
          console.log(`${data.error.type} : ${data.error.description}`);
          return;
        }

        this.setState({
          imageCMInfos: this.state.imageCMInfos.map((f, i) =>
            i === idx
              ? {
                  id: data.data.image.id,
                  secret: data.data.image.secret,
                }
              : f
          ),
        });

        this.showClippingMagicEditingTool(idx);
      });
  }

  onDropHandler = async (files, idx) => {
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
      previewOffsets: [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
      ],
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
          fileName
        );
        this.setState({ apiload: 1 });
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
        const { isAuto, sport, originTintColorValue, tintColorValue } =
          this.state;
        console.log("palette", palette);

        const colorSettings = {
          palette: {
            Vibrant: palette.Vibrant.hex,
            LightVibrant: palette.LightVibrant.hex,
            DarkVibrant: palette.DarkVibrant.hex,
            Muted: palette.Muted.hex,
            LightMuted: palette.LightMuted.hex,
            DarkMuted: palette.DarkMuted.hex,
          },
          teamNameColor: palette.Vibrant.hex,
          teamNameStroke: palette.DarkVibrant.hex,
        };

        // TODO: tintColor is ultimate override

        if (isAuto) {
          colorSettings.tintColorValue =
            originTintColorValue === "#000000" ||
            !!originTintColorValue === false
              ? palette.DarkVibrant.hex
              : tintColorValue;
        } else {
          colorSettings.tintColorValue = palette.DarkVibrant.hex;
        }

        // swtich to Vibrant from DarkVibrant, because Vibrant looks better
        if (
          this.uniformFirstSports.includes(sport) &&
          colorSettings.tintColorValue === palette.DarkVibrant.hex
        ) {
          colorSettings.tintColorValue = palette.Vibrant.hex;
        }

        this.setState(colorSettings);
      })
      .catch((err) => {
        console.log("Virbrant.js, error :", err);
      });
  }

  processClippingMagicResultImage(idx, base64) {
    const img = new Image();
    const comp = this;

    img.crossOrigin = "Anonymous";
    img.src = base64.startsWith("data:image")
      ? base64
      : `data:image/png;base64,${base64}`;

    img.onload = function () {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext("2d").drawImage(this, 0, 0, img.width, img.height);

      // Returns a copy of a canvas element with surrounding transparent space removed, and then get base64 data
      comp.processBase64(trimCanvas(canvas, 60).toDataURL("image/png"), idx);

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
    const { sport, isAuto, eventId, teamId, isBanner, templateStyle } =
      this.state;
    const params = [
      "isOnePhotoMode",
      "rightPhotoOffset",
      "headerCopy",
      "teamName",
      "teamNameColor",
      "teamNameSize",
      "teamNameFamily",
      "teamNameStroke",
      "tintColor",
      "productUniqueId",
      "posterSize",
    ];

    for (let p of params) {
      formData.append(p, this.state[p]);
    }

    formData.append("tintColorValue", this.state.tintColorValue);
    // formData.append("tintColorValue", hexToRgb(this.state.tintColorValue));
    formData.append("visualPos", JSON.stringify(this.state.visualPos));
    formData.append("elementsPos", JSON.stringify(this.state.elementsPos));

    let rightPhotoOffset = 0;
    if (!this.state.isOnePhotoMode) {
      rightPhotoOffset =
        (this.state.teamImageHeight *
          (this.state.previewOffsets[1].x - this.state.previewOffsets[0].x)) /
        this.previewLeftImageRef.current.offsetHeight;
    }
    formData.append("rightPhotoOffset", rightPhotoOffset);

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
        "teamId",
        "eventId",
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
        "productUniqueId",
        // "productAccepting"

        "previewOffsets",
        "rightPhotoOffset",
        "posterSize",
      ];

      for (let p of serializableStateKeys) {
        settings[p] = this.state[p];
      }
      formData.append("isAutoMode", isAuto);
      formData.append("eventId", eventId);
      formData.append("teamId", teamId);
      formData.append("settings", JSON.stringify(settings));
    }

    formData.append("Submit", true);

    const config = {
      headers: {
        "content-type": "multipart/form-data",
        accept: "application/json",
      },
    };

    /* calculate steps for progressing ; split a second into 10 parts */
    const estimatedTime = isBanner ? 1500 : this.state.estimatedTime * 10; // count of 100ms
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

    let sportC;

    if (sport === "volleyball") {
      sportC = "soccer";
    } else if (sport === "basketball 5 on 5") {
      sportC = "basketball";
    } else {
      sportC = sport;
    }

    const resource =
      templateStyle && templateStyle.startsWith("template")
        ? templateStyle
        : sportC;

    // API UPDATE
    const type = isBanner ? "banner" : "team";
    axios
      .post(
        `${this.API_BASE_URL}/product/${type}/${resource}`,
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

        console.log("timeElapsed", timeElapsed);

        if (isAuto) {
          const { poster } = data.data;
          this.setState({
            productUniqueId: poster.unique_id,
            productAccepting: false,
            posterload: 1,
          });
          console.log("isAuto mode", poster);
        }
      })
      .catch((err) => {
        console.log("error during product generation", err);

        this.setState({
          productLoading: false,
        });
      });
  };

  wrapAcceptedFormData() {
    const { isOnePhotoMode } = this.state;
    // wrap accepted form data
    const acceptedData = {};
    const serializableStateKeys = [
      "sport",
      ...this.serializableStateKeys,
      "palette",
      "visualPos",
      "elementsPos",
      "previewOffsets",
      "rightPhotoOffset",
      "imageFileNames",
      "bgRemoved",
      "bgRemovingBtnText",
      "imageBaseNames",
      "imageCMInfos",
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

    if (isOnePhotoMode) acceptedData["image1"] = "";

    // wrap image Blobs
    const rawImageFormData = new FormData();
    for (let i of [0, 1, 2]) {
      rawImageFormData.append(
        "rawImage[]",
        this.state.images[i]
          ? this.state.images[i]
          : new Blob([demoImage], { type: "image/png" }),
        isOnePhotoMode && i === 1 ? "" : this.state.imageBaseNames[i]
      );
    }

    acceptedData["rawImages"] = rawImageFormData;

    this.setState({
      acceptedFormData: acceptedData,
    });
  }

  showColorOnMove() {
    const img = document.querySelector(
        "div.ReactModalPortal div.ril-inner img"
      ),
      canvas = document.querySelector("#cs"),
      toolbar = document.querySelector(
        "div.ReactModalPortal div.ril-toolbar ul.ril-toolbar-left"
      ),
      listItem = document.createElement("li"),
      comp = this;

    let x, y;

    listItem.className =
      "ril-toolbar__item ril__toolbarItem player-image-picked-box";
    toolbar.appendChild(listItem);

    const pickedItem = document.createElement("li");
    pickedItem.className =
      "ril-toolbar__item ril__toolbarItem player-image-picked-color-box";
    toolbar.appendChild(pickedItem);

    img.addEventListener(
      "mousemove",
      function (e) {
        // chrome
        if (e.offsetX) {
          x = e.offsetX;
          y = e.offsetY;
        }
        // firefox
        else if (e.layerX) {
          x = e.layerX;
          y = e.layerY;
        }

        useCanvas(canvas, img, function () {
          // get image data
          const p = canvas.getContext("2d").getImageData(x, y + 36, 1, 1).data;

          const listItem = document.querySelector(
            "div.ReactModalPortal div.ril-toolbar ul.ril-toolbar-left li.player-image-picked-box"
          );

          // show preview color
          listItem.style.background = rgbToHex(p[0], p[1], p[2]);
        });
      },
      false
    );

    img.addEventListener(
      "click",
      function (e) {
        // chrome
        if (e.offsetX) {
          x = e.offsetX;
          y = e.offsetY;
        }
        // firefox
        else if (e.layerX) {
          x = e.layerX;
          y = e.layerY;
        }
        useCanvas(canvas, img, function () {
          // get image data
          var p = canvas.getContext("2d").getImageData(x, y + 36, 1, 1).data;

          const listItem = document.querySelector(
            "div.ReactModalPortal div.ril-toolbar ul.ril-toolbar-left li.player-image-picked-color-box"
          );

          // show preview color
          listItem.style.background = rgbToHex(p[0], p[1], p[2]);

          // save color
          comp.setState({
            tintColorValue: rgbToHex(p[0], p[1], p[2]),
          });
        });
      },
      false
    );
  }

  processBase64(base64, idx) {
    visualCenter(base64, (err, result) => {
      const { visualTop, visualLeft, bgColor } = result;
      const { sport } = this.state;

      if (
        bgColor.r === bgColor.g &&
        bgColor.g === bgColor.b &&
        bgColor.b === bgColor.a &&
        bgColor.a === 255
      )
        console.log("transparent or white bg");

      if (this.logoFirstSports.includes(sport)) {
        if (idx === 2 || (idx === 0 && !this.state.images[2])) {
          this.getColorsFromBase64(base64);
        }
      } else if (this.uniformFirstSports.includes(sport)) {
        if (idx === 0 || (idx === 2 && !this.state.images[0])) {
          this.getColorsFromBase64(base64);
        }
      }

      this.setState({
        visualPos: this.state.visualPos.map((v, i) =>
          i === idx ? { visualLeft: visualLeft, visualTop: visualTop } : v
        ),
        base64: this.state.base64.map((b, i) => (i === idx ? base64 : b)),
      });
    });
  }

  // clear image on the upload area
  clearImage(evt, idx) {
    evt.stopPropagation();
    this.setState({
      base64: this.state.base64.map((b, i) => (i === idx ? demoImage : b)),
      file: this.state.images.map((b, i) => (i === idx ? null : b)),
      imageFileNames: this.state.imageFileNames.map((b, i) =>
        i === idx ? "" : b
      ),
    });
  }

  moveVisualVertPos(evt, idx, dir = 1) {
    const step = dir * 0.01;

    evt.stopPropagation();
    this.setState({
      visualPos: this.state.visualPos.map((v, i) =>
        i === idx
          ? { visualLeft: v.visualLeft, visualTop: v.visualTop + step }
          : v
      ),
    });

    if (idx === 0 || idx === 1) {
      this.setState({
        previewOffsets: this.state.previewOffsets.map((v, i) =>
          i === idx ? { x: v.x, y: v.y + dir * 2.5 } : v
        ),
      });
    }
  }

  moveVisualHorizPos(evt, idx, dir = 1) {
    const step = dir * 0.003;
    evt.stopPropagation();

    this.setState({
      visualPos: this.state.visualPos.map((v, i) =>
        i === idx
          ? { visualLeft: v.visualLeft + step, visualTop: v.visualTop }
          : v
      ),
    });

    if (idx === 0 || idx === 1) {
      this.setState({
        previewOffsets: this.state.previewOffsets.map((v, i) =>
          i === idx ? { x: v.x - dir, y: v.y } : v
        ),
      });
    }
  }

  moveElementVert(name, dir = 1) {
    const step = dir * 0.1;
    const { elementsPos } = this.state;
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

  async handleTemplateStyleChange(e) {
    const templateStyle = e.target.value;
    const config = await this.fetchTemplateConfig(templateStyle);
    this.setState({
      ...config,
      templateStyle,
    });
  }

  render() {
    const {
      isOnePhotoMode,
      isBanner,
      base64,
      previewOffsets,
      visualPos,
      headerCopy,
      tintColor,
      tintColorValue,
      sport,
      teamName,
      teamNameColor,
      teamNameSize,
      teamNameFamily,
      teamNameStroke,
      producedImage,
      productLoading,
      teamNameMaxSize,
      bgRemoving,
      bgRemoved,
      isPickerImageOpen,
      pickerImagePath,
      palette,
      posterSize,
      percentPoints,
      acceptedFormData,
      copyTooltipText,
      productUniqueId,
      productAccepting,
      templateStyle,
    } = this.state;

    return (
      <div
        className="app team-app"
        style={{ color: "#333" }}
        onKeyDown={(e) => this.handleKeyEvent(e)}
        tabIndex="0"
      >
        <div className="app-header">
          <h2 className="title">Team poster</h2>
          <Link to="/" className="back-link">
            «&nbsp;Back to Home
          </Link>
        </div>

        <div className="app-main">
          <div className="app-control-container">
            {/* <label className="app-control">
              <div>Sports</div>
              <select
                value={sport}
                onChange={async (e) => {
                  const sport = await this.fetchSportConfig(e.target.value);
                  this.setState(sport);
                }}
              >
                <option value="baseball">Baseball</option>
                <option value="basketball">Basketball</option>
                <option value="football">Football</option>
                <option value="hockey">Hockey</option>
                <option value="lacrosse">Lacrosse</option>
                <option value="soccer">Soccer</option>
                <option value="softball">Softball</option>
                <option value="fast pitch">Fast Pitch</option>
                <option value="cheerleading">Cheerleading</option>
              </select>
            </label> */}

            <label className="app-control">
              <div>Poster template</div>
              <select
                value={templateStyle}
                onChange={this.handleTemplateStyleChange.bind(this)}
              >
                <option value="none">None</option>
                {new Array(9).fill(0).map((_, i) => (
                  <option key={i} value={`template${i + 1}`}>{`Template ${
                    i + 1
                  }`}</option>
                ))}
              </select>
            </label>

            <label>
              <span>One photo</span>
              <Switch
                onChange={(e) =>
                  this.setState({
                    isOnePhotoMode: !isOnePhotoMode,
                  })
                }
                checked={isOnePhotoMode}
                className="clipping-magic-switch"
              />
            </label>
          </div>

          <div className="app-control-container">
            <label className="app-control">
              <div>Poster size</div>
              <select
                value={posterSize}
                onChange={async (e) => {
                  this.setState(
                    {
                      ...this.state,
                      posterSize: e.target.value,
                    },
                    () => this.determineTeamNameMaxSize()
                  );
                }}
              >
                <option value="normal">Normal</option>
                <option value="small">Small</option>
              </select>
            </label>

            <label style={{ marginLeft: "30px" }}>
              <span>Banner</span>
              <Switch
                onChange={(e) =>
                  this.setState({
                    isBanner: !isBanner,
                  })
                }
                checked={isBanner}
                className="clipping-magic-switch"
              />
            </label>
          </div>
          <div className="images-section -show-guides">
            <div className={"column" + (isOnePhotoMode ? " two-span" : "")}>
              <Dropzone
                onDrop={(files) => this.onDropHandler(files, 0)}
                className="dropzone"
              >
                <div className="demo-image-container-title"></div>
                <h2>{!isOnePhotoMode ? "Left Photo" : "Main Photo"}</h2>
                <div style={{ margin: "1rem" }}>
                  Start by selecting your image. Click or drop here.
                </div>

                <div className="demo-image-container">
                  <img
                    src={base64[0]}
                    style={{
                      transform: `translatey(-${
                        visualPos[0].visualTop * 100
                      }%) translatex(${-visualPos[0].visualLeft * 100}%)`,
                    }}
                    className="demo-image"
                    alt="left part shot"
                  />

                  <div className="demo-image-controller">
                    {base64[0] !== demoImage && (
                      <div className="move-image-up">
                        <img
                          src={ClearImageIcon}
                          className="move-image-up-action"
                          onClick={(evt) => this.clearImage(evt, 0)}
                          alt="clear-control"
                        />
                      </div>
                    )}

                    <div className="move-image-up">
                      <img
                        src={UpArrow}
                        className="move-image-up-action"
                        onClick={(evt) => this.moveVisualVertPos(evt, 0, 1)}
                        alt="up-control"
                      />
                    </div>
                    <div className="move-image-down">
                      <img
                        src={UpArrow}
                        className="move-image-down-action"
                        onClick={(evt) => this.moveVisualVertPos(evt, 0, -1)}
                        alt="down-control"
                      />
                    </div>
                  </div>

                  {!isOnePhotoMode && (
                    <LeftRightControls
                      handler={(e, d) => this.moveVisualHorizPos(e, 0, d)}
                    />
                  )}
                </div>

                <label
                  className={
                    "app-control loader-button " +
                    (bgRemoved[0] ? "bg-removed" : "")
                  }
                  onClick={(e) => this.modifyWithClippingMagicTool(e, 0)}
                >
                  <div>{this.state.bgRemovingBtnText[0]}</div>

                  {bgRemoving[0] && (
                    <ClipLoader
                      size={20}
                      color={"white"}
                      className="loader"
                      loading={bgRemoving[0]}
                    />
                  )}
                </label>
              </Dropzone>
            </div>

            {!isOnePhotoMode && (
              <div className="column">
                <Dropzone
                  onDrop={(files) => this.onDropHandler(files, 1)}
                  className="dropzone"
                >
                  <h2>Right Photo</h2>
                  <div style={{ margin: "1rem" }}>
                    Start by selecting your image. Click or drop here.
                  </div>

                  <div className="demo-image-container">
                    <img
                      src={base64[1]}
                      className="demo-image"
                      style={{
                        transform: `translatey(-${
                          visualPos[1].visualTop * 100
                        }%) translatex(${-visualPos[1].visualLeft * 100}%)`,
                      }}
                      alt="right part shot"
                    />

                    <div className="demo-image-controller">
                      {base64[1] !== demoImage && (
                        <div className="move-image-up">
                          <img
                            src={ClearImageIcon}
                            className="move-image-up-action"
                            onClick={(evt) => this.clearImage(evt, 1)}
                            alt="clear-control"
                          />
                        </div>
                      )}

                      <div className="move-image-up">
                        <img
                          src={UpArrow}
                          className="move-image-up-action"
                          onClick={(e) => this.moveVisualVertPos(e, 1, 1)}
                          alt="up-control"
                        />
                      </div>
                      <div className="move-image-down">
                        <img
                          src={UpArrow}
                          className="move-image-down-action"
                          onClick={(e) => this.moveVisualVertPos(e, 1, -1)}
                          alt="down-control"
                        />
                      </div>
                    </div>

                    {!isOnePhotoMode && (
                      <LeftRightControls
                        handler={(e, d) => this.moveVisualHorizPos(e, 1, d)}
                      />
                    )}
                  </div>

                  <label
                    className={
                      "app-control loader-button " +
                      (bgRemoved[1] ? "bg-removed" : "")
                    }
                    onClick={(e) => this.modifyWithClippingMagicTool(e, 1)}
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
            )}

            <div className="column">
              <Dropzone
                onDrop={(files) => this.onDropHandler(files, 2)}
                className="dropzone"
              >
                <h2>Team logo</h2>
                <div style={{ margin: "1rem" }}>
                  Start by selecting your image. Click or drop here.
                </div>

                <div className="demo-image-container">
                  <img
                    src={base64[2]}
                    className="demo-image"
                    style={{
                      transform: `translatey(-${
                        visualPos[2].visualTop * 100
                      }%) translatex(${-visualPos[2].visualLeft * 100}%)`,
                    }}
                    alt="team logo"
                  />

                  <div className="demo-image-controller">
                    {base64[2] !== demoImage && (
                      <div className="move-image-up">
                        <img
                          src={ClearImageIcon}
                          className="move-image-up-action"
                          onClick={(evt) => this.clearImage(evt, 2)}
                          alt="clear-control"
                        />
                      </div>
                    )}

                    <div className="move-image-up">
                      <img
                        src={UpArrow}
                        className="move-image-up-action"
                        onClick={(e) => this.moveVisualVertPos(e, 2, 1)}
                        alt="up-control"
                      />
                    </div>
                    <div className="move-image-down">
                      <img
                        src={UpArrow}
                        className="move-image-down-action"
                        onClick={(e) => this.moveVisualVertPos(e, 2, -1)}
                        alt="down-control"
                      />
                    </div>
                  </div>

                  <LeftRightControls
                    handler={(e, d) => this.moveVisualHorizPos(e, 2, d)}
                  />
                </div>

                <div
                  style={{ display: "flex", justifyContent: "space-around" }}
                >
                  <label
                    className={
                      "app-control loader-button " +
                      (bgRemoved[2] ? "bg-removed" : "")
                    }
                    onClick={(e) => this.removeLogoBg(e)}
                  >
                    <div>{this.state.bgRemovingBtnText[2]}</div>

                    {bgRemoving[2] && (
                      <ClipLoader
                        size={20}
                        color={"white"}
                        className="loader"
                        loading={bgRemoving[2]}
                      />
                    )}
                  </label>

                  <label
                    className={
                      "app-control loader-button " +
                      (bgRemoved[2] ? "bg-removed" : "")
                    }
                    onClick={(e) => this.modifyWithClippingMagicTool(e, 2)}
                  >
                    <div>Modify</div>
                  </label>
                </div>
              </Dropzone>
            </div>
          </div>

          <div className="image-preview-container">
            {/* <input
              type="number"
              style={{
                width: "7vmin",
                marginLeft: "10px",
                verticalAlign: "middle"
              }}
              value={rightPhotoOffset}
              onChange={e =>
                this.setState({
                  rightPhotoOffset: e.target.value
                })
              }
            />
            <span>
              <i>px</i>
            </span> */}
            <img
              src={base64[0]}
              style={{
                transform: `translatey(-${previewOffsets[0].y}px) translatex(${previewOffsets[0].x}px)`,
              }}
              ref={this.previewLeftImageRef}
              className="preview-image"
              alt="left part preview"
            />

            {!isOnePhotoMode && (
              <img
                src={base64[1]}
                style={{
                  transform: `translatey(-${previewOffsets[1].y}px) translatex(${previewOffsets[1].x}px)`,
                }}
                ref={this.previewRightImageRef}
                className="preview-image"
                alt="right part preview"
              />
            )}
          </div>

          <div className="app-control-container">
            <label className="app-control">
              <div>Footer Copy</div>
              <input
                type="text"
                value={headerCopy}
                onChange={(e) => {
                  this.setState({ headerCopy: e.target.value });
                }}
              />
            </label>
            <label className="app-control">
              <div>Tint Color</div>
            </label>

            <InputColor
              initialHexColor={tintColorValue}
              onChange={(e) =>
                this.setState({
                  tintColorValue: e.hex,
                })
              }
              key="tint-color-picker"
            />

            <label className="app-control">
              <div>
                <i>Curated colors</i>
              </div>
              <select
                value={tintColor}
                onChange={(e) =>
                  this.setState({
                    tintColor: e.target.value,
                    tintColorValue: predefinedColors[e.target.value],
                  })
                }
              >
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

            {pickerImagePath && pickerImagePath.indexOf("uploads") >= 0 && (
              <label className="app-control">
                <div>Pick color</div>
                <img
                  src={DropperIcon}
                  className="color-pick"
                  alt="Pick color"
                  onClick={() => this.setState({ isPickerImageOpen: true })}
                />
              </label>
            )}
          </div>

          {palette && palette.Vibrant && (
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
          )}

          {/* {isPickerImageOpen && (
            <Lightbox
              mainSrc={`${this.BASE_URL}/${pickerImagePath}`}
              imageCrossOrigin="Anonymous"
              onCloseRequest={() => this.setState({ isPickerImageOpen: false })}
              onAfterOpen={() => {
                setTimeout(() => this.showColorOnMove(), 3000);
              }}
            />
          )} */}

          <div className="app-control-container">
            <label className="app-control">
              <div>Team Name 1</div>
              <input
                type="text"
                value={teamName}
                onChange={this.onFNameChange}
              />
            </label>
            <label className="app-control">
              <div>Font Family</div>
              <select
                value={teamNameFamily}
                onChange={(e) => {
                  this.setState({ teamNameFamily: e.target.value });
                  this.onFNameChange$.next(teamName);
                }}
              >
                <option value="EthnocentricRg">EthnocentricRg</option>
                <option value="Freshman">Freshman</option>
                <option value="Master of Break">Master of Break</option>
                <option value="Amigos">Amigos</option>
                <option value="Algerian">Algerian</option>
                <option value="Airstrike">Airstrike</option>
                <option value="NHLDucks">NHLDucks</option>
                <option value="A Grazing Mace">A Grazing Mace</option>
                <option value="ShadedLarch">ShadedLarch</option>
              </select>
            </label>
            <label className="app-control">
              <div>
                Font Size <i>(px)</i>
              </div>
              <input
                type="number"
                value={teamNameSize}
                min={40}
                max={teamNameMaxSize}
                onChange={(e) => {
                  this.setState({ teamNameSize: e.target.value });
                }}
              />
            </label>
            <label className="app-control">
              <div>
                <i>Up to {teamNameMaxSize} (px)</i>
              </div>
            </label>
            <InputColor
              initialHexColor={teamNameColor}
              onChange={(e) =>
                this.setState({
                  teamNameColor: e.hex,
                })
              }
              key="first-name-color-picker"
            />
            <i>&nbsp; Stroke</i>{" "}
            <InputColor
              initialHexColor={teamNameStroke}
              onChange={(e) =>
                this.setState({
                  teamNameStroke: e.hex,
                })
              }
              key="first-name-stroke-color-picker"
            />
            <label className="app-control name">
              {this.state.elementsPos["teamName"] &&
                `${parseInt(32 * this.state.elementsPos["teamName"], 10)}px  `}
              <div className="move-image-up">
                <img
                  src={MoveUp}
                  className="move-image-up-action"
                  onClick={(evt) => this.moveElementVert("teamName", 1)}
                  alt="up-control"
                />
              </div>
              <div className="move-image-down">
                <img
                  src={MoveUp}
                  className="move-image-down-action"
                  onClick={(evt) => this.moveElementVert("teamName", -1)}
                  alt="down-control"
                />
              </div>
            </label>
          </div>

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
                      1
                    ); // second param means team poster
                    this.setState({
                      productUniqueId: data.data.unique_id,
                      productAccepting: false,
                      acceptedFormData: null,
                    });
                  }}
                />
              )}
            </label>
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
                  key="productAcceptingLoader"
                />,
              ]}
            </label>
          </div>

          <div className="app-control-container hidden-ground">
            <div
              className={
                "first-name-playground" +
                (posterSize === "small" ? " poster-size-small" : "")
              }
              style={{ color: teamNameColor, fontFamily: teamNameFamily }}
              ref={this.setTeamNamePG}
            >
              {teamName}
            </div>
          </div>
        </div>

        <div className="app-footer">
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
              alt="produced poster"
              className={"producedImage" + (isBanner ? " banner" : "")}
            />
          )}
        </div>

        <ToastContainer autoClose={4000} />
      </div>
    );
  }
}

export default TeamPoster;
