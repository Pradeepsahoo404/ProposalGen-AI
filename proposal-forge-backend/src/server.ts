import express from "express";
import cors from "cors";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fileUpload = require("express-fileupload");
import { config, connectDB } from "./config";
import routes from "./routes";
import uploadRoutes from "./routes/uploadRoutes";
import { auth } from "./middleware/auth";
import { errorHandler } from "./middleware/errorHandler";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/upload", auth, fileUpload({
  useTempFiles: false,
  limits: { fileSize: 20 * 1024 * 1024 },
  abortOnLimit: true,
}), uploadRoutes);

app.use("/api", routes);
app.use(errorHandler);

async function start() {
  await connectDB();
  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });
}
start();
