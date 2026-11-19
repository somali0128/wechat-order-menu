const session = require("../../utils/session");
const visit = require("../../utils/visit");
const share = require("../../utils/share");
const { toast } = require("../../utils/ui");

Page({
  data: {
    code: "",
    id: "",
    dish: null,
    steps: [],
    canCopy: false,
    isMine: false,
    readonly: false,
    familyName: "",
    loading: true,
    errorText: "",
    busy: false
  },

  async onLoad(query) {
    share.enableTimeline();
    this.singlePage = share.isSinglePage();
    this.setData({ code: visit.normalizeCode(query.code), id: query.id || "" });
    try {
      if (!this.singlePage) {
        await session.login();
        share.prepare();
      }
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
      isMine: data.isMine,
      readonly: this.singlePage || Boolean(data.anonymous),
      familyName: data.family.name,
      steps: String(dish.steps || "")
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
    });
  },

  blocked() {
    if (this.data.readonly) {
      toast("点击屏幕下方「前往小程序」后，就能点赞和收藏");
      return true;
    }
    if (this.data.isMine) {
      toast("这是你自己家的菜");
      return true;
    }
    return false;
  },

  async like() {
    if (this.data.busy || this.blocked()) return;
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
    if (this.blocked()) return;
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
      path: `/pages/visit-dish/visit-dish?code=${this.data.code}&id=${this.data.id}`,
      imageUrl: share.image()
    };
  },

  onShareTimeline() {
    return {
      title: `「${this.data.familyName}」的${this.data.dish ? this.data.dish.name : "家常菜"}`,
      query: `code=${this.data.code}&id=${this.data.id}`,
      imageUrl: share.image()
    };
  },

  back() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: "/pages/menu/menu" }) });
  }
});
