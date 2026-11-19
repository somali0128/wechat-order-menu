const api = require("../../utils/api");
const session = require("../../utils/session");
const visit = require("../../utils/visit");
const { toast } = require("../../utils/ui");

Page({
  data: {
    code: "",
    recent: [],
    recommends: [],
    loadingRecommends: true
  },

  async onLoad() {
    try {
      await session.login();
    } catch (error) {
      toast(error.message);
      return;
    }
    this.loadRecommends();
  },

  onShow() {
    this.setData({ recent: visit.recent() });
  },

  onCodeInput(event) {
    this.setData({ code: String(event.detail.value || "").toUpperCase() });
  },

  go() {
    const code = this.data.code.trim();
    if (code.length < 6) {
      toast("请输入 6 位访问码");
      return;
    }
    this.openCode(code);
  },

  openCode(code) {
    wx.navigateTo({ url: `/pages/visit-menu/visit-menu?code=${code}` });
  },

  openItem(event) {
    this.openCode(event.currentTarget.dataset.code);
  },

  async loadRecommends() {
    this.setData({ loadingRecommends: true });
    try {
      const list = await api.call("recommendFamilies");
      this.setData({ recommends: list });
    } catch (error) {
      toast(error.message);
    }
    this.setData({ loadingRecommends: false });
  }
});
