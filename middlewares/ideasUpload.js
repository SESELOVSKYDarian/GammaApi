const multer = require("multer");
const path = require("path");
const fs = require("fs");

const gammaVaseIdeasDir = path.resolve(__dirname, "../../GammaVase/public/ideas");
const uploadsIdeasDir = path.resolve(__dirname, "../uploads/ideas");

const resolveIdeasDir = () => {
  if (fs.existsSync(gammaVaseIdeasDir)) {
    return gammaVaseIdeasDir;
  }
  if (!fs.existsSync(uploadsIdeasDir)) {
    fs.mkdirSync(uploadsIdeasDir, { recursive: true });
  }
  return uploadsIdeasDir;
};

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, resolveIdeasDir());
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

module.exports = multer({ storage });
