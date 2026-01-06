const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const contactoRoute = require("./routes/contactoRoute");
const authRoutes = require("./routes/authRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = process.env.FRONTEND_URLS
  ? process.env.FRONTEND_URLS.split(",").map((url) => url.trim()).filter(Boolean)
  : ["http://localhost:5173", "http://localhost:5175"];

/** CORS */
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // Postman / server-to-server
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("CORS bloqueado"));
    },
    credentials: true,
  })
);

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

app.use(express.json());

/** Healthcheck */
app.get("/", (_req, res) => {
  res.status(200).send("API OK");
});

app.get("/", (req, res) => {
  res.send("API OK");
});

app.get("/api/debug/env", (req, res) => {
  res.json({
    NODE_ENV: process.env.NODE_ENV,
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    DB_USER_present: Boolean(process.env.DB_USER),
    DB_PASSWORD_present: Boolean(process.env.DB_PASSWORD),
    DB_NAME: process.env.DB_NAME,
  });
});


/** Routes */
app.use("/api", authRoutes);
app.use("/api/contacto", contactoRoute);
app.use("/api/familias", require("./routes/familiasRoutes"));
app.use("/api/usuarios", require("./routes/usuariosRoutes"));
app.use("/api/productos", require("./routes/productosRoutes"));
app.use("/api/precios", require("./routes/preciosRoutes"));
app.use("/api/ideas", require("./routes/ideasRoutes"));

/**
 * Static files
 * IMPORTANT: estas carpetas deben existir dentro del repo del backend.
 * Si no existen, no rompe nada.
 */
function safeStatic(route, relativeDir) {
  const full = path.join(__dirname, relativeDir);
  if (fs.existsSync(full)) {
    app.use(route, express.static(full));
    console.log(`✅ Static: ${route} -> ${full}`);
  } else {
    console.log(`ℹ️ Static missing (skip): ${route} -> ${full}`);
  }
}

safeStatic("/imgCata", "public/imgCata");
safeStatic("/ideas", "public/ideas");
safeStatic("/familias", "public/assets/familias");

/** Start */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

