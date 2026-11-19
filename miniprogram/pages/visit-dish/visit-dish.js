const session = require("../../utils/session");
const visit = require("../../utils/visit");
const { toast } = require("../../utils/ui");

Page({
  data: {
    code: "",
    id: "",
    dish: null,
    steps: [],
    canCopy: false,
    familyName: "",
    loading: true,
    errorText: "",
    busy: false
  },

  async onLoad(query) {
    this.setData({ code: visit.normalizeCode(query.code), id: query.id || "" });
    try {
      await session.login();
      if (!visit.get(this.data.code)) {
        await visit.open(this.data.code);
      }
      this.refresh();
    } catch (error) {
      this.setData({ errorText: error.message });
    }
    this.setData({ loading: false });
  },

  refresh() {
    const data = visit.get(this.data.code);
    const dish = data && visit.find(this.data.code, this.data.id);
    if (!dish) {
      this.setData({ dish: null, errorText: "这道菜已被主人删除" });
      return;
    }
    wx.setNavigationBarTitle({ title: dish.name });
    this.setData({
      dish: { ...dish },
      canCopy: data.canCopy,
      familyName: data.family.name,
      steps: String(dish.steps || "")
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
    });
  },

  async like() {
    if (this.data.busy) return;
    this.setData({ busy: true });
    try {
      const res = await visit.toggleLike(this.data.code, this.data.id);
      if (res.liked) wx.vibrateShort({ type: "light", fail() {} });
      this.refresh();
    } catch (error) {
      toast(error.message);
    }
    this.setData({ busy: false });
  },

  async copy() {
    if (this.data.dish.copied) {
      toast("已在你的「收藏」分类里");
      return;
    }
    if (!this.data.canCopy) {
      toast("创建或加入家庭后，才能加入自己的菜谱");
      return;
    }
    try {
      await visit.copy(this.data.code, this.data.id);
      this.refresh();
      toast("已加入「收藏」分类", "success");
    } catch (error) {
      toast(error.message);
    }
  },

  preview() {
    if (this.data.dish && this.data.dish.image) {
      wx.previewImage({ urls: [this.data.dish.image] });
    }
  },

  onShareAppMessage() {
    return {
      title: `「${this.data.familyName}」的${this.data.dish ? this.data.dish.name : "菜单"}`,
      path: `/pages/visit-dish/visit-dish?code=${this.data.code}&id=${this.data.id}`
    };
  },

  back() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: "/pages/menu/menu" }) });
  }
});
