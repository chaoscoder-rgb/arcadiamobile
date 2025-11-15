import app from "./app";
import { pool } from "./config/database";

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await pool.query("SELECT 1"); // basic connectivity check
    app.listen(PORT, () => {
      console.log(`Arcadia backend running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server", err);
    process.exit(1);
  }
}

start();