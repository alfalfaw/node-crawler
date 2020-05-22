const express = require("express");
const { URLSearchParams } = require("url");
const router = express.Router();
const cheerio = require("cheerio");
const fetch = require("node-fetch");
const { vid } = require("../../config/keys");
const bilibiliDynamicCache = require("../../middleware/bilibili-dynamic-middleware");
const bilibiliDynamic = require("../../models/bilibili-dynamic");
const client = require("../../database/redis");

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
        .then((result) => {
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
              newCard["title"] = card.title;
              newCard["desc"] = card.desc;
              newCard["pics"] = [card.pic];
              newCard[
                "play_url"
              ] = `https://m.bilibili.com/video/av${card.aid}`;
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
              newCard["cats"] = "文章";
              newCard["title"] = card.title;
              newCard["pics"] = card.origin_image_urls;
              newCard["words"] = card.words;
              newCard["reply"] = "stats" in card ? card.stats.reply : 0;
              newCard["coin"] = "stats" in card ? card.stats.coin : 0;
            } else if (newCard.type === CARD_TYPE.DAILY) {
              newCard["cats"] = "日常";
              newCard["desc"] = card.item.description;
              newCard["pics"] = card.item.pictures.map((item) => item.img_src);
              newCard["reply"] = card.item.reply;
            } else if (newCard.type === CARD_TYPE.SHARE) {
              newCard["cats"] = "分享";
              newCard["content"] = card.item.content;
              newCard["reply"] = card.item.reply;
            } else if (newCard.type === CARD_TYPE.MICRO_VIDEO) {
              newCard["cats"] = "短视频";
              newCard["play_url"] = card.item.video_playurl;
              newCard["desc"] = card.item.description;
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
          if (is_end !== 0) {
            parse_page();
          } else {
            client.setex(req.originalUrl, process.env.CACHE_EXPIRE, 1);
            bilibiliDynamic.insertMany(dynamic_list);

            res.status(200).json({ total: dynamic_list.length, dynamic_list });
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
