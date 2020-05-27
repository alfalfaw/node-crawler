const fetch = require("node-fetch");
const fs = require("fs");
/**
 * @param {String} url  URL地址
 * @param {String} path 保存路径
 * @returns none
 */
async function download(url, path) {
  const res = await fetch(url);
  await new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(path);
    res.body.pipe(fileStream);
    res.body.on("error", (err) => {
      reject(err);
    });
    fileStream.on("finish", function () {
      resolve();
    });
  });
}

module.exports = download;
