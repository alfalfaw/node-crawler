require("dotenv").config();
const express = require("express");
const path = require("path");
const fileUpload = require("express-fileupload");
const exphbs = require("express-handlebars");
const http = require("http");
const socketio = require("socket.io");
const compression = require("compression");
const PORT = process.env.PORT || 5010;

const app = express();
// 如果使用websocket，必须使用http的createServer()创建http server
const server = http.createServer(app);

const io = socketio(server);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// 页面gzip压缩
app.use(compression());
// 文件上传
app.use(fileUpload());

// view engine setup
app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");
// Static folder
app.use(
  "/public",
  express.static(path.join(__dirname, "public"), { maxAge: 31557600 })
);

// 连接mongodb
require("./database/mongodb")();
const bilibiliRouter = require("./routes/api/bilibili/bilibili-dynamic");
const fileRouter = require("./routes/common/file")(io);

// index
app.get("/", (req, res) => {
  res.render("index");
});

// test
app.get("/test", (req, res) => {
  res.render("test");
});

// // file
// app.get("/file", (req, res) => {
//   res.render("file");
// });
app.use("/bilibili", bilibiliRouter);
app.use("/file", fileRouter);

server.listen(PORT, () => console.log(`Server listen on ${PORT}`));
