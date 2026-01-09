const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Carpeta de destino relativa a GammaApi (raíz del proyecto Node.js)
const uploadsDir = path.join(__dirname, "../uploads/imagenes");

// Crear carpeta si no existe
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname); // extensión
    const name = path.basename(file.originalname, ext); // nombre sin extensión
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);

    cb(null, `${name}-${uniqueSuffix}${ext}`); // nombre-169071879-a123.jpg
  },
});

const upload = multer({ storage });

module.exports = upload;

