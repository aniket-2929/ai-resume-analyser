const express = require("express");
const cors = require("cors");
require("dotenv").config();

const analyseRoute = require("./routes/analyse");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

app.use("/api", analyseRoute);

app.get("/", (req, res) => res.json({ message: "API is running!" }));

app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));