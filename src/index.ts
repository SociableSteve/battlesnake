import * as express from "express";
import * as morgan from "morgan";

import handleRegister from "./handlers/register";
import handleStart from "./handlers/start";
import handleMove from "./handlers/move";
import handleEnd from "./handlers/end";

const app = express();
app.use(morgan("dev"));
app.use(express.json());

app.get("/", handleRegister);
app.post("/start", handleStart);
app.post("/move", handleMove);
app.post("/end", handleEnd);

app.listen(3000, () => console.log("Listening"));
