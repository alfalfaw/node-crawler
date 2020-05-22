// mongodb
const mongoose = require("mongoose");

// 连接mongo数据库
module.exports = () => {
  mongoose.connect(process.env.DATABASE_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  const db = mongoose.connection;
  db.on("error", (error) => {
    console.error(error);
  });
  db.once("open", () => {
    console.log("Database connect");
  });
};
