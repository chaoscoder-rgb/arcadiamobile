import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";
import { errorHandler } from "./middleware/errorHandler";
import projectsRoutes from "./routes/projects";
import ordersRoutes from "./routes/orders";

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

// Static for uploads (photos)
app.use("/uploads", express.static("uploads"));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectsRoutes);
app.use("/api/orders", ordersRoutes);

// TODO: add projects, orders, receipts, analytics, sync routes

// Error handler
app.use(errorHandler);

export default app;