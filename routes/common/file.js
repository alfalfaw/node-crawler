const express = require("express");
const router = express.Router();
const fs = require("fs");
const util = require("util");
const path = require("path");
const download = require("../../tools/download");
const moment = require("moment");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const client = require("../../database/redis");
// https://www.wandoujia.com/apps/8095853/download/dot
// https://download.alicdn.com/wireless/tmallandroid/latest/tmallandroid_10002119.apk
function calSize(num) {
  if (num > 1024 ** 2) {
    return (num / 1024 ** 2).toFixed(1) + "M";
  } else if (num > 1024) {
    return (num / 1024).toFixed(1) + "K";
  } else {
    return num + "B";
  }
}

// function getFileList() {
//   const dir = process.env.UPLOAD_DIR;
//   var file_list = [];
//   fs.readdir(dir, (err, files) => {
//     files.forEach((file) => {
//       fs.stat(`${dir}/${file}`, function (err, info) {
//         if (info.isFile() && !file.startsWith(".")) {
//           file_list.push({
//             name: file,
//             size: calSize(info.size),
//             ctime: info.ctime.toLocaleString(),
//           });
//         }
//       });
//     });
//   });
//   return file_list;
// }
function getUploadId(name) {
  return new Promise((resolve, reject) => {
    client.get(name, function (err, reply) {
      if (err) return reject("ok");
      else return resolve(reply);
    });
  });
}

const readdirAsync = util.promisify(fs.readdir);
const statAsync = util.promisify(fs.stat);
async function getFileList() {
  const order = 1;
  const dir = process.env.UPLOAD_DIR;
  const files = await readdirAsync(dir);

  let infos = await Promise.all(
    files.map((name) =>
      statAsync(path.join(dir, name)).then((stat) => ({
        name,
        stat,
      }))
    )
  );

  infos.sort(
    (a, b) => order * (b.stat.ctime.getTime() - a.stat.ctime.getTime())
  );
  infos = infos.filter((item) => item.stat.isFile() === true);
  // console.log(infos);
  return Promise.all(
    infos.map(async (info) => {
      return {
        name: info.name,
        size: calSize(info.stat.size),
        // ctime: info.stat.ctime.toLocaleString(),
        ctime: moment(info.stat.ctime).format("YYYY-MM-DD HH:mm"),
        upload_id: await getUploadId(info.name),
      };
    })
  );
}

module.exports = function (io) {
  // 获取文件列表
  router.get("/", async (req, res) => {
    // console.log(list);
    // list.map((item) => {
    //   client.get(item.name, function (err, reply) {
    //     item["upload_id"] = reply;
    //   });
    // });
    const list = await getFileList();

    res.render("file", { files: list });
  });

  // 下载文件
  router.get("/download/:filename", (req, res) => {
    const { filename } = req.params;
    // console.log(filename);

    const path = process.env.UPLOAD_DIR + "/" + filename;
    fs.access(path, fs.F_OK, (err) => {
      if (err) {
        res.status(400).json({ msg: "文件不存在" });
      } else {
        // res.download(path);
        res.writeHead(200, {
          "Content-Type": "application/octet-stream", //告诉浏览器这是一个二进制文件
          "Content-Disposition": "attachment;filename=" + encodeURI(filename), //告诉浏览器这是一个需要下载的文件  encodeURI(filename) 解决汉字编码问题
        });
        fs.createReadStream(path).pipe(res);
      }
    });
  });

  io.on("connection", (socket) => {
    socket.on("upload", async ({ url }) => {
      let filename = url.substring(url.lastIndexOf("/") + 1);
      filename = filename.replace(/[\#\?].*$/, "");
      const path = process.env.UPLOAD_DIR + "/" + filename;
      const upload_id = uuidv4();
      io.emit(
        "uploadStart",
        upload_id,
        filename,
        moment().format("YYYY-MM-DD HH:mm")
      );
      // 缓存
      client.set(filename, upload_id);

      const writer = fs.createWriteStream(path);

      const { data, headers } = await axios({
        url,
        method: "GET",
        responseType: "stream",
      });
      const totalBytes = headers["content-length"];
      let receivedBytes = 0;
      let cnt = 0;
      // let percent = 0;
      data.on("data", (chunk) => {
        receivedBytes += chunk.length;
        cnt++;
        if (cnt > 10) {
          io.emit(
            "progressUpdate",
            upload_id,
            calSize(receivedBytes),
            calSize(totalBytes)
          );
          // percent = ((receivedBytes / totalBytes) * 100).toFixed(1);
          // console.log(`percent:${percent}%`);
          cnt = 0;
        }
      });
      data.pipe(writer);

      data.on("error", (error) => {
        // 删除下载错误文件
        fs.unlink(path);
        // 删除缓存
        client.del(filename);
        console.error(error);
      });
      data.on("end", () => {
        // 下载完成关闭文件
        io.emit("complete", upload_id, calSize(totalBytes));
        // 删除缓存
        client.del(filename);

        // console.log(`total:${totalBytes},received:${receivedBytes}`);
      });
    });
  });

  // 上传文件
  router.post("/upload", async (req, res) => {
    if (req.files && Object.keys(req.files).length !== 0) {
      // upload from file
      // .file 和 input field 的 name 一致
      const file = req.files.file;
      // file.mv(target_dir,callback) 将文件转移至指定目录
      file.mv(`${process.env.UPLOAD_DIR}/${file.name}`, (err) => {
        if (err) {
          console.error(err);
          return res.status(500).send(err);
        }

        // res.redirect("/file");
        res.json({ status: "ok", redirect_url: "/file" });
        // res.json({
        //   fileName: file.name,
        //   filePath: `${process.env.UPLOAD_DIR}/${file.name}`,
        // });
      });
    } else {
      res.json({ status: "ok", redirect_url: "/file" });
    }
  });

  // 删除文件
  router.post("/delete", (req, res) => {
    const { name } = req.body;
    // console.log(name);

    const path = process.env.UPLOAD_DIR + "/" + name;

    fs.unlinkSync(path);
    // 删除缓存
    client.del(name);
    res.json({ status: "ok", redirect_url: "/file" });
  });

  return router;
};
