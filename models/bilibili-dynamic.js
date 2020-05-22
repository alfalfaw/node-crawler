const mongoose = require("mongoose");
const bilibiliDynamicSchema = new mongoose.Schema({
  type: {
    type: Number,
    required: true,
  },
  uid: {
    type: Number,
    required: true,
  },

  user: {
    type: Object,
    required: true,
  },
  view: {
    type: Number,
    required: true,
  },
  share: {
    type: Number,
    required: true,
  },
  pubdate: {
    type: Number,
    required: true,
  },
  like: {
    type: Number,
    required: true,
  },
  cates: {
    type: String,
  },

  aid: {
    type: Number,
  },
  dynamic: {
    type: String,
  },
  title: {
    type: String,
  },
  desc: {
    type: String,
  },
  pics: {
    type: Object,
  },
  coin: {
    type: Number,
  },
  reply: {
    type: Number,
  },
  danmaku: {
    type: Number,
  },
  favorite: {
    type: Number,
  },
  his_rank: {
    type: Number,
  },
  now_rank: {
    type: Number,
  },
  content: {
    type: String,
  },
  activity: {
    type: Object,
  },
  words: {
    type: Number,
  },
});

module.exports = mongoose.model("BilibiliDynamic", bilibiliDynamicSchema);
