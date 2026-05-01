const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const dotenv = require("dotenv");

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_KEY,
  api_secret: process.env.CLOUD_SECRET
});

const streamUpload = (buffer) => {
  return new Promise((resolve, reject) => {
    let stream = cloudinary.uploader.upload_stream(
      { resource_type: 'auto' },
      (error, result) => {
        if (result) {
          resolve(result);
        } else {
          reject(error);
        }
      }
    );

    streamifier.createReadStream(buffer).pipe(stream);
  });
};

const uploadToCloudinary = async (buffer) => {
  let result = await streamUpload(buffer);
  return result["url"];
};

const uploadSingle = async (req, res, next) => {
  try {
    if (req.file) {
      const link = await uploadToCloudinary(req.file.buffer);
      req.body[req.file.fieldname] = link;
    }
    next();
  } catch (error) {
    console.log("Error Cloudinary:", error);
    next();
  }
};

const uploadFields = async (req, res, next) => {
  for (const key in req["files"]) {
    req.body[key] = [];
    const array = req["files"][key];

    for (const item of array) {
      try {
        const link = await uploadToCloudinary(item.buffer);
        req.body[key].push(link);
      } catch (error) {
        console.log(error);
      }
    }
  }
  next();
};

module.exports = {
  uploadSingle,
  uploadFields
};