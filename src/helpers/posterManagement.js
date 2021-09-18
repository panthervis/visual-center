import axios from "axios";
import demoImage from "../assets/img/demo.js";

const API_BASE_URL =
  process.env.REACT_APP_POSTER_API_BASE_URL ||
  "https://utpbuilder.com/poster-generator/backend/public/index.php/api";

// do Accept poster, and return unique_id
/**
 * posterType: integer indicating the poster type, 0: Individual poster, 1: Team poster, 2: Combo poster and many more
 *
 * @param {String} base64
 * @param {Object} acceptedFormData
 * @param {Number} posterType
 * @return Promise
 */

export const acceptPoster = async (
  base64,
  acceptedFormData,
  posterType = 0
) => {
  const formData = new FormData();

  // prefix: "data:image/png;base64,"
  formData.append("base64", base64.substring("data:image/png;base64,".length));
  formData.append("approve", true);
  formData.append("posterType", posterType);

  const rawImages = acceptedFormData["rawImages"];

  if (rawImages) {
    for (let pair of rawImages.entries()) {
      formData.append(pair[0], pair[1], pair[1].name);
    }

    formData.append("Submit", true);

    // acceptedFormData["rawImages"] = null;
  }

  formData.append("settings", JSON.stringify(acceptedFormData));

  console.log("before accept", acceptedFormData);

  const config = {
    headers: {
      "content-type": "multipart/form-data",
    },
  };

  // API UPDATE
  return await axios.post(`${API_BASE_URL}/poster/approve`, formData, config);
};

// fetch player data from the event system
export const fetchPlayerData = async (playerId) => {
  const response = await axios.get(`${API_BASE_URL}/player/${playerId}`);

  const { data } = response;
  if (data.statusCode !== 200) {
    throw new Error(
      `${data.type.error} on fetchPlayerData() : data.type.description`
    );
  }

  const playerData = data.data;

  for (const key in playerData) {
    if (playerData[key] === null || playerData[key] === undefined) {
      delete playerData[key];
    }
  }

  return playerData;
};

// fetch team data from the event system
export const fetchTeamData = async (teamId, eventId) => {
  const response = await axios.get(`${API_BASE_URL}/team/${teamId}/${eventId}`);

  const { data } = response;
  if (data.statusCode !== 200) {
    throw new Error(
      `${data.type.error} on fetchPlayerData() : data.type.description`
    );
  }

  return data.data;
};

// fetch poster data from internal API
export const fetchPosterData = async (posterId) => {
  console.log("asdasd", posterId);
  const response = await axios.get(`${API_BASE_URL}/poster/${posterId}`);
  const { data } = response.data;
  if (response.data.statusCode !== 200) {
    throw new Error("Error on fetchPosterData(): ".data.type.description);
  }

  const imageType = (b64) => {
    switch (b64.charAt(0)) {
      case "/":
        return "jpg";
      case "i":
        return "png";
      case "R":
        return "gif";
      case "U":
        return "webp";
      default:
        return "png";
    }
  };

  console.log("response", data);

  const b64ToRawImage = async (v) => {
    return await fetch(v).then((res) => res.blob());
  };

  const rawImages = data.raw_images.map((v) =>
    v ? "data:image/" + imageType(v) + ";base64," + v : null
  );

  for (let i of [0, 1, 2]) {
    if (rawImages[i]) rawImages[i] = await b64ToRawImage(rawImages[i]);
  }

  let posterData = {
    producedImage: "data:image/png;base64," + data.product,

    images: rawImages,

    base64: data.processed_images.map((v) =>
      v ? "data:image/png;base64," + v : demoImage
    ),

    ...JSON.parse(data.settings),
  };

  if (data.logo_raw_link) {
    posterData.pickerImagePath = data.logo_raw_link;
  }

  console.log("posterData", posterData);
  return posterData;
};
