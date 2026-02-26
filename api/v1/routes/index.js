const chatbotRoute = require("./chatbot.route");
const userRoute = require("./user.route");
const songRoute = require("./song.route");
const artistRoute = require("./artist.route");
const albumRoute = require("./album.route");
const playlistRoute = require("./playlist.route");

module.exports = (app) => {
  const version = `/api/v1`;

  app.use(`${version}/chatbot`, chatbotRoute);
  app.use(`${version}/users`, userRoute);
  app.use(`${version}/songs`, songRoute);
  app.use(`${version}/artists`, artistRoute);
  app.use(`${version}/albums`, albumRoute);
  app.use(`${version}/playlists`, playlistRoute);
}