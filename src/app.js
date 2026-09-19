import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import blogRoutes from "./routes/blogRoutes.js";
import blogCommentRoutes from "./routes/blogCommentRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import passwordResetRoutes from "./routes/passwordResetRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import serviceReviewRoutes from "./routes/serviceReviewRoutes.js";
import { errorHandler, notFound } from "./middleware/error.js";

const app = express();
app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL?.split(",") || ["http://localhost:5173"],
    credentials: true,
  }),
);
app.use(
  express.json({
    limit: "10mb",
  }),
);
app.use(
  express.urlencoded({
    extended: true,
  }),
);

app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 500,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.get("/api/health", (_req, res) =>
  res.json({
    ok: true,
    name: "Explore Koh Rong Booking API",
    version: "2.0.0",
  }),
);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api/blogs", blogCommentRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/auth", passwordResetRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/services", serviceReviewRoutes);
app.use(notFound);
app.use(errorHandler);
export default app;
