import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";

import authRoutes from "./routes/authRoutes.js";
import leagueRoutes from "./routes/leagueRoutes.js";
import leagueGetRoutes from "./routes/leagueGetRoutes.js";
import teamRoutes from "./routes/teamRoutes.js";
import playerRoutes from "./routes/playerRoutes.js";
import matchRoutes from "./routes/matchRoutes.js";
import socialMatchRoutes from "./routes/socialMatchRoutes.js";
import { uploadsDir } from "./middlewares/uploadMiddleware.js";
import { startExpireJob } from "./utils/expireListings.js";

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(morgan("dev"));
app.use("/uploads", express.static(uploadsDir));

app.use("/api/auth", authRoutes);
app.use("/api/leagues", leagueGetRoutes);
app.use("/api/leagues", leagueRoutes);
app.use("/api", teamRoutes);
app.use("/api", playerRoutes);
app.use("/api", matchRoutes);
app.use("/api", socialMatchRoutes);

app.get("/", (req, res) => {
  res.send("API is running");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  startExpireJob();
});
