import performanceRoutes from "./routes/performance.routes.js";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import { port, corsOrigins } from "./config/env.js";
import errorMiddleware from "./middleware/error.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import employeeRoutes from "./routes/employee.routes.js";
import roleRoutes from "./routes/role.routes.js";
import hradminRoutes from "./routes/hradmin.routes.js";
import leaveRoutes from "./routes/leave.routes.js";
import entitlementRoutes from "./routes/entitlement.routes.js";
import reportRoutes from "./routes/report.routes.js";
import { initializeReportNotificationScheduler } from "./jobs/reportNotificationScheduler.js";
import { runMigrations } from "../run_migration.js";
import { logInfo, logError } from "./utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cookieParser());
app.disable("x-powered-by");
app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));
app.use("/api/performance", performanceRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/hradmin", hradminRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/leave/entitlements", entitlementRoutes);
app.use("/api/reports", reportRoutes);

app.get("/api/health", (_req, res) =>
  res.json({ success: true, data: { status: "ok" } }),
);

app.use(errorMiddleware);

async function startServer() {
  await runMigrations();

  initializeReportNotificationScheduler();

  app.listen(port, () => {
    logInfo(`Server running on port ${port}`, {
      port,
      environment: process.env.NODE_ENV || "development",
    });
    logInfo("Report notification scheduler initialized");
  });
}

startServer().catch((error) => {
  logError("Failed to start server", error);
  process.exit(1);
});

export default app;
