const multer = require("multer");
const path = require("path");
const fs = require("fs");
const os = require("os");

// Carpeta de destino: ruta absoluta desde la raíz del proyecto (GammaApi)
// __dirname = /...../GammaApi/middlewares
// Subimos un nivel: /...../GammaApi
const projectRoot = path.resolve(__dirname, "..");
const defaultUploadsDir = path.join(projectRoot, "uploads", "imagenes");
const envUploadsDir = process.env.UPLOADS_DIR
  ? path.join(path.resolve(process.env.UPLOADS_DIR), "imagenes")
  : null;

const ensureUploadsDir = (dir) => {
  if (!dir) {
    return null;
  }
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Carpeta de uploads creada: ${dir}`);
    }
    return dir;
  } catch (error) {
    console.warn(`⚠️ No se pudo crear la carpeta de uploads (${dir}):`, error.message);
    return null;
  }
};

const uploadsDir =
  ensureUploadsDir(envUploadsDir) ||
  ensureUploadsDir(defaultUploadsDir) ||
  ensureUploadsDir(path.join(os.tmpdir(), "gamma-uploads"));

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    if (!uploadsDir) {
      return cb(new Error("Directorio de uploads no disponible."));
    }
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

