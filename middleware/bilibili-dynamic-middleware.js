const bilibiliDynamic = require("../models/bilibili-dynamic");
const client = require("../database/redis");

async function cache(req, res, next) {
  client.get(req.originalUrl, async (err, data) => {
    if (err) throw err;
    if (data !== null) {
      const { uid } = req.query;
      const results = await bilibiliDynamic.find({ uid }, { _id: 0, __v: 0 });
      if (results.length > 0) {
        res.send({ total: results.length, dynamic_list: results });
      } else {
        res.send({ msg: "没有数据" });
      }
    } else {
      await bilibiliDynamic.deleteMany({});
      next();
    }
  });
}

module.exports = cache;
