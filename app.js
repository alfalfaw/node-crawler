require("dotenv").config();

const express = require("express");
const app = express();

const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 连接mongodb
require("./database/mongodb")();
const bilibiliRouter = require("./routes/api/bilibili");

app.use("/bilibili", bilibiliRouter);

app.listen(PORT, () => console.log(`Server listen on ${PORT}`));
