const mongoose = require("mongoose");

module.exports.connect = () => {
  try{
    console.log("Success!");
  } catch (e) {
    console.log("Error: ", e);
  }
}

mongoose.connect(process.env.MONGO_URL);