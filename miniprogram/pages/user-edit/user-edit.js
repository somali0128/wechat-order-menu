const session = require("../../utils/session");
const { saveProfile } = require("../../utils/profile");
const { toast } = require("../../utils/ui");

Page({
  data: {
    avatar: "",
    nickName: "",
    saving: false
  },

  async onLoad() {
    const s = await session.requireFamily();
    if (!s) return;
    this.setData({ avatar: s.user.avatarUrl, nickName: s.user.nickName });
  },

  onChooseAvatar(event) {
    this.setData({ avatar: event.detail.avatarUrl });
  },

  onNickInput(event) {
    this.setData({ nickName: event.detail.value });
  },

  async save() {
    if (this.data.saving) return;
    const nickName = this.data.nickName.trim();
    if (!nickName) {
      toast("请填写昵称");
      return;
    }
    this.setData({ saving: true });
    wx.showLoading({ title: "正在保存", mask: true });
    try {
      await saveProfile({ nickName, avatar: this.data.avatar });
      wx.hideLoading();
      wx.showToast({ title: "已保存", icon: "success" });
      setTimeout(() => wx.navigateBack(), 600);
    } catch (error) {
      wx.hideLoading();
      toast(error.message);
    }
    this.setData({ saving: false });
  }
});
