const api = require("../../utils/api");
const session = require("../../utils/session");
const { toast } = require("../../utils/ui");
const { mealDateText } = require("../../utils/format");

const PAGE_SIZE = 20;

function pad(num) {
  return String(num).padStart(2, "0");
}

function decorate(visit) {
  const time = new Date(visit.lastAt);
  return {
    ...visit,
    initial: (visit.name || "访").charAt(0),
    timeText: `${pad(time.getHours())}:${pad(time.getMinutes())}`,
    likeText: visit.likes.join("、"),
    copyText: visit.copies.join("、")
  };
}

/** 按日期分组 */
function group(list) {
  const groups = [];
  list.forEach((item) => {
    let current = groups[groups.length - 1];
    if (!current || current.date !== item.date) {
      current = { date: item.date, title: mealDateText(item.date), items: [] };
      groups.push(current);
    }
    current.items.push(item);
  });
  return groups;
}

Page({
  data: {
    loading: true,
    groups: [],
    todayCount: 0,
    hasMore: false,
    loadingMore: false,
    errorText: ""
  },

  list: [],

  async onLoad() {
    const s = await session.requireFamily();
    if (!s) return;
    this.refresh();
  },

  async onPullDownRefresh() {
    await this.refresh();
    wx.stopPullDownRefresh();
  },

  onReachBottom() {
    this.loadMore();
  },

  async refresh() {
    try {
      const res = await api.call("listVisitors", { offset: 0, limit: PAGE_SIZE });
      this.list = res.list.map(decorate);
      this.setData({
        groups: group(this.list),
        todayCount: res.todayCount,
        hasMore: res.hasMore,
        errorText: ""
      });
    } catch (error) {
      if (this.list.length) toast(error.message);
      else this.setData({ errorText: error.message });
    }
    this.setData({ loading: false });
  },

  reload() {
    this.setData({ loading: true, errorText: "" });
    this.refresh();
  },

  async loadMore() {
    if (!this.data.hasMore || this.data.loadingMore) return;
    this.setData({ loadingMore: true });
    try {
      const res = await api.call("listVisitors", { offset: this.list.length, limit: PAGE_SIZE });
      this.list = this.list.concat(res.list.map(decorate));
      this.setData({ groups: group(this.list), hasMore: res.hasMore });
    } catch (error) {
      toast(error.message);
    }
    this.setData({ loadingMore: false });
  }
});
