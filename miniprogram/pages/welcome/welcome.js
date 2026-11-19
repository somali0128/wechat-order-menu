const api = require("../../utils/api");
const session = require("../../utils/session");
const { saveProfile } = require("../../utils/profile");
const { toast } = require("../../utils/ui");
const { APP_NAME } = require("../../utils/config");

Page({
  data: {
    appName: APP_NAME,
    status: "loading", // loading | ready | unconfigured | error
    errorText: "",
    mode: "create", // create | join
    avatar: "",
    nickName: "",
    familyName: "",
    withSample: true,
    code: "",
    submitting: false
  },

  onLoad(query) {
    const code = String((query && query.code) || "").toUpperCase();
    if (code) {
      this.setData({ mode: "join", code });
    }
    this.init();
  },

  async init() {
    if (!api.isConfigured()) {
      this.setData({ status: "unconfigured" });
      return;
    }
    this.setData({ status: "loading" });
    try {
      const res = await session.login(true);
      if (res.family) {
        wx.switchTab({ url: "/pages/menu/menu" });
        return;
      }
      this.setData({
        status: "ready",
        avatar: res.user.avatarUrl,
        nickName: res.user.nickName
      });
    } catch (error) {
      this.setData({ status: "error", errorText: error.message });
    }
  },

  switchMode(event) {
    this.setData({ mode: event.currentTarget.dataset.mode });
  },

  onChooseAvatar(event) {
    this.setData({ avatar: event.detail.avatarUrl });
  },

  onNickInput(event) {
    this.setData({ nickName: event.detail.value });
  },

  onFamilyInput(event) {
    this.setData({ familyName: event.detail.value });
  },

  onCodeInput(event) {
    this.setData({ code: String(event.detail.value || "").toUpperCase() });
  },

  onSampleChange(event) {
    this.setData({ withSample: event.detail.value });
  },

  goVisit() {
    wx.navigateTo({ url: "/pages/visit/visit" });
  },

  async submit() {
    if (this.data.submitting) return;
    const { mode, nickName, avatar, familyName, code, withSample } = this.data;
    if (!nickName.trim()) {
      toast("请先填写你的昵称");
      return;
    }
    if (mode === "create" && !familyName.trim()) {
      toast("请填写家庭名称");
      return;
    }
    if (mode === "join" && code.trim().length < 6) {
      toast("请输入 6 位邀请码");
      return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: mode === "create" ? "正在创建" : "正在加入", mask: true });
    try {
      await saveProfile({ nickName: nickName.trim(), avatar });
      const family =
        mode === "create"
          ? await api.call("createFamily", { name: familyName.trim(), withSample })
          : await api.call("joinFamily", { code: code.trim() });
      wx.hideLoading();
      session.setFamily(family);
      session.setUser({ familyId: family.id });
      wx.showToast({ title: mode === "create" ? "创建成功" : "加入成功", icon: "success" });
      setTimeout(() => wx.switchTab({ url: "/pages/menu/menu" }), 600);
    } catch (error) {
      wx.hideLoading();
      toast(error.message);
    } finally {
      this.setData({ submitting: false });
    }
  }
});
