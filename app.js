require("dotenv").config();
const path = require("path");
const express = require("express");
const app = express();

const exphbs = require("express-handlebars");
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// view engine setup
app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");
// Static folder
app.use("/public", express.static(path.join(__dirname, "public")));

// 连接mongodb
require("./database/mongodb")();
const bilibiliRouter = require("./routes/api/bilibili");

// index
app.get("/", (req, res) => {
  res.render("index");
});

app.use("/bilibili", bilibiliRouter);

app.listen(PORT, () => console.log(`Server listen on ${PORT}`));
