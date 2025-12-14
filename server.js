require("dotenv").config();
console.log("=== STARTING APP ===");

try {
  const express = require("express");
  console.log("Express loaded OK");

  const path = require("path");
  console.log("Path loaded OK");

  const app = express();
  const PORT = process.env.PORT || 3000;

  console.log("Dirname:", __dirname);
  console.log("Public path:", path.join(__dirname, "public"));

  app.use(express.static(path.join(__dirname, "public")));

  // Endpoint para obtener configuración de Supabase
  app.get("/api/config", (req, res) => {
    res.json({
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_KEY,
    });
  });

  app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "reset-password.html"));
  });

  app.get("/reset-password", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "reset-password.html"));
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log("=== SERVER RUNNING ON PORT", PORT, "===");
  });
} catch (error) {
  console.log("=== ERROR ===");
  console.log(error);
}
