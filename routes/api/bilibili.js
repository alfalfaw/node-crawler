const express = require("express");
const { URLSearchParams } = require("url");
const router = express.Router();
const cheerio = require("cheerio");
const fetch = require("node-fetch");
const { vid } = require("../../config/keys");
const bilibiliDynamicCache = require("../../middleware/bilibili-dynamic-middleware");
const bilibiliDynamic = require("../../models/bilibili-dynamic");
const client = require("../../database/redis");
const sendMail = require("../../tools/sendMail");
const moment = require("moment");

async function getDynamic(req, res, next) {
  const CARD_TYPE = {
    SHARE: 1,
    DAILY: 2,
    VIDEO: 8,
    MICRO_VIDEO: 16,
    POST: 64,
    ACTIVITY: 2048,
  };
  let is_end = 1;
  let next_offset = 0;
  const dynamic_list = [];
  const url =
    "https://api.vc.bilibili.com/dynamic_svr/v1/dynamic_svr/space_history?";
  const options = {
    method: "get",
    headers: {
      "Content-Type": "application/json",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Safari/537.36",
    },
  };
  async function parse_page() {
    try {
      //   console.log(hid);
      const params = new URLSearchParams({
        visitor_uid: vid,
        host_uid: parseInt(req.query.uid),
        need_top: 1,
      });
      if (next_offset) params.append("offset_dynamic_id", next_offset);
      //   console.log(url + params);
      await fetch(url + params, options)
        .then((response) => response.json())
        .then(async (result) => {
          // console.log(result);
          const card_list = [];
          cards = result.data.cards;
          cards.forEach((item) => {
            let card_desc = item.desc;
            let card = JSON.parse(item.card);
            // console.log(card);
            let newCard = {};
            newCard["type"] = card_desc.type;
            newCard["uid"] = card_desc.uid;
            newCard["user"] = {
              name: card_desc.user_profile.info.uname,
              avater: card_desc.user_profile.info.face,
              level: card_desc.user_profile.level_info.current_level,
            };
            newCard["view"] = card_desc.view;
            newCard["share"] = card_desc.repost;
            newCard["pubdate"] = card_desc.timestamp;
            newCard["like"] = card_desc.like;

            if (newCard.type === CARD_TYPE.VIDEO) {
              newCard["cats"] = "视频";
              newCard["aid"] = card.aid;
              newCard["dynamic"] = card.dynamic;
              newCard["content"] = card.title;
              newCard["desc"] = card.desc;
              newCard["pics"] = [card.pic];
              newCard[
                "play_url"
              ] = `https://www.bilibili.com/video/av${card.aid}`;
              newCard["coin"] = card.stat.coin;
              newCard["reply"] = card.stat.reply;
              newCard["danmaku"] = card.stat.danmaku;
              newCard["favorite"] = card.stat.favorite;
              newCard["his_rank"] = card.stat.his_rank;
              newCard["now_rank"] = card.stat.now_rank;
            } else if (newCard.type === CARD_TYPE.ACTIVITY) {
              newCard["cats"] = "活动";
              newCard["reply"] = card_desc.comment;
              newCard["content"] = card.vest.content;
              newCard["activity"] = card.sketch;
            } else if (newCard.type === CARD_TYPE.POST) {
              newCard[
                "play_url"
              ] = `https://www.bilibili.com/read/${card_desc.rid_str}`;
              newCard["cats"] = "文章";
              newCard["content"] = card.title;
              newCard["pics"] = card.origin_image_urls;
              newCard["words"] = card.words;
              newCard["reply"] = "stats" in card ? card.stats.reply : 0;
              newCard["coin"] = "stats" in card ? card.stats.coin : 0;
            } else if (newCard.type === CARD_TYPE.DAILY) {
              newCard[
                "play_url"
              ] = `https://t.bilibili.com/${card_desc.dynamic_id_str}`;
              newCard["cats"] = "日常";
              newCard["content"] = card.item.description;
              newCard["pics"] = card.item.pictures.map((item) => item.img_src);
              newCard["reply"] = card.item.reply;
            } else if (newCard.type === CARD_TYPE.SHARE) {
              newCard[
                "play_url"
              ] = `https://t.bilibili.com/${card_desc.dynamic_id_str}`;

              newCard["cats"] = "分享";
              newCard["content"] = card.item.content;
              newCard["reply"] = card.item.reply;
            } else if (newCard.type === CARD_TYPE.MICRO_VIDEO) {
              newCard["cats"] = "短视频";
              newCard["play_url"] = card.item.video_playurl;
              newCard["content"] = card.item.description;
              newCard["pics"] = [card.item.cover.unclipped];
              newCard["reply"] = card.item.reply;

              // newCard = card;
            }
            // if (newCard["name"]) card_list.push(newCard);
            card_list.push(newCard);
          });

          dynamic_list.push(...card_list);

          is_end = result.data.has_more;
          //   console.log(is_end);
          next_offset = result.data.next_offset;
          if (is_end === 0) {
            parse_page();
          } else {
            // 缓存
            client.setex(req.originalUrl, process.env.CACHE_EXPIRE, 1);
            // 存入数据库
            await bilibiliDynamic.insertMany(dynamic_list);
            // 返回结果
            res.status(200).json({ total: dynamic_list.length, dynamic_list });

            // 发送邮件通知
            if (process.env.EMAIL_NOTYFICATION === "on") {
              const { last_pubdate } = req.query;
              // console.log("email on");
              // const dynamic = await bilibiliDynamic
              //   .findOne()
              //   .sort({ pubdate: -1 });
              const dynamic = dynamic_list[0];

              if (!last_pubdate || parseInt(last_pubdate) !== dynamic.pubdate) {
                // to do send email
                dynamic.pubdate = moment(dynamic.pubdate * 1000).format(
                  "YYYY-MM-DD HH:mm"
                );
                let hitokoto =
                  "生活不可能像你想象得那么好，但也不会像你想象得那么糟。我觉得人的脆弱和坚强都超乎自己的想象。有时，我可能脆弱得一句话就泪流满面；有时，也发现自己咬着牙走了很长的路。";
                // hitokoto
                await fetch("https://international.v1.hitokoto.cn/?c=k")
                  .then((res) => res.json())
                  .then((result) => {
                    hitokoto = result.hitokoto;
                  });

                sendMail({ dynamic, hitokoto }, "bilibili-dynamic.handlebars");

                console.log("send email");
              } else {
                console.log("do nothing");
              }
            }
          }
          //   console.log(next_offset);
        });
    } catch (error) {
      console.error(error);
      res.status(400).json({ msg: "请求失败" });
    }
  }
  await parse_page();
}

// 获取bilibili用户动态
router.get("/dynamic", bilibiliDynamicCache, getDynamic);

module.exports = router;
