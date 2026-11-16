const api = require("../../utils/api");
const session = require("../../utils/session");
const cart = require("../../utils/cart");
const subscribe = require("../../utils/subscribe");
const { toast, confirm, prompt, actionSheet } = require("../../utils/ui");
const { APP_NAME } = require("../../utils/config");

function initial(name) {
  return (name || "我").charAt(0);
}

function decorateUser(user) {
  return { ...user, initial: initial(user.nickName) };
}

Page({
  data: {
    user: null,
    family: null,
    members: [],
    stats: { dishes: 0, orders: 0, active: 0, members: 0 },
    subscribeEnabled: false,
    loading: true
  },

  async onShow() {
    const s = await session.requireFamily();
    if (!s) return;
    cart.updateBadge();
    this.setData({
      user: decorateUser(s.user),
      family: s.family,
      subscribeEnabled: subscribe.enabled()
    });
    this.load();
  },

  async onPullDownRefresh() {
    await this.load();
    wx.stopPullDownRefresh();
  },

  async load() {
    try {
      const res = await api.call("getFamily");
      session.setFamily(res.family);
      this.setData({
        family: res.family,
        members: res.members.map((member) => ({ ...member, initial: initial(member.nickName) })),
        stats: res.stats,
        user: decorateUser(session.get().user)
      });
    } catch (error) {
      toast(error.message);
    }
    this.setData({ loading: false });
  },

  editProfile() {
    wx.navigateTo({ url: "/pages/user-edit/user-edit" });
  },

  copyCode() {
    wx.setClipboardData({
      data: this.data.family.inviteCode,
      success: () => toast("邀请码已复制", "success")
    });
  },

  onShareAppMessage() {
    const { family, user } = this.data;
    if (!family) {
      return { title: APP_NAME, path: "/pages/menu/menu" };
    }
    return {
      title: `${user.nickName || "家人"}邀请你加入「${family.name}」，一起点菜吧`,
      path: `/pages/welcome/welcome?code=${family.inviteCode}`
    };
  },

  async onMemberTap(event) {
    const member = this.data.members[event.currentTarget.dataset.index];
    if (!this.data.family.isOwner || member.isMe) return;
    const index = await actionSheet(["设为管理员", "移出家庭"]);
    if (index === 0) {
      const ok = await confirm({
        title: "转让管理员",
        content: `确定把管理员转让给「${member.nickName}」吗？转让后你将成为普通成员。`
      });
      if (!ok) return;
      try {
        await api.call("transferOwner", { openid: member.openid }, { loading: "正在转让" });
        toast("已转让", "success");
        this.load();
      } catch (error) {
        toast(error.message);
      }
    } else if (index === 1) {
      const ok = await confirm({
        title: "移出家庭",
        content: `确定把「${member.nickName}」移出家庭吗？`,
        confirmText: "移出",
        danger: true
      });
      if (!ok) return;
      try {
        await api.call("removeMember", { openid: member.openid }, { loading: "正在移出" });
        toast("已移出", "success");
        this.load();
      } catch (error) {
        toast(error.message);
      }
    }
  },

  async renameFamily() {
    if (!this.data.family.isOwner) return;
    const name = await prompt({ title: "修改家庭名称", value: this.data.family.name, placeholder: "最多 16 个字" });
    if (name === null || name === this.data.family.name) return;
    if (!name) {
      toast("名称不能为空");
      return;
    }
    try {
      const family = await api.call("updateFamily", { name }, { loading: "正在保存" });
      session.setFamily(family);
      this.setData({ family });
      toast("已修改", "success");
    } catch (error) {
      toast(error.message);
    }
  },

  async resetCode() {
    const ok = await confirm({
      title: "重置邀请码",
      content: "重置后旧邀请码和已发出的邀请链接将失效，已加入的成员不受影响。"
    });
    if (!ok) return;
    try {
      const family = await api.call("resetInviteCode", {}, { loading: "正在重置" });
      session.setFamily(family);
      this.setData({ family });
      toast("已重置", "success");
    } catch (error) {
      toast(error.message);
    }
  },

  async subscribeNotice() {
    const accepted = await subscribe.request(["newOrder", "statusChange"]);
    if (accepted > 0) {
      toast("订阅成功，下次有新订单会通知你", "none");
    } else if (accepted === 0) {
      toast("未开启提醒，可在右上角 ··· → 设置 中开启");
    }
  },

  goManage() {
    wx.navigateTo({ url: "/pages/manage/manage" });
  },

  goCategories() {
    wx.navigateTo({ url: "/pages/categories/categories" });
  },

  async leave() {
    const { family, stats } = this.data;
    if (family.isOwner && stats.members > 1) {
      wx.showModal({
        title: "无法直接退出",
        content: "你是家庭管理员，请先点击成员头像把管理员转让给其他人，再退出家庭。",
        showCancel: false,
        confirmColor: "#ff8a1f"
      });
      return;
    }
    const dissolve = family.isOwner;
    const ok = await confirm({
      title: dissolve ? "解散家庭" : "退出家庭",
      content: dissolve
        ? "你是家庭唯一成员，退出将解散家庭并删除所有菜品和订单，无法恢复。"
        : "退出后将看不到这个家庭的菜单和订单，确定退出吗？",
      confirmText: dissolve ? "解散" : "退出",
      danger: true
    });
    if (!ok) return;
    try {
      await api.call("leaveFamily", {}, { loading: "正在处理" });
      cart.clear();
      session.reset();
      wx.reLaunch({ url: "/pages/welcome/welcome" });
    } catch (error) {
      toast(error.message);
    }
  }
});
