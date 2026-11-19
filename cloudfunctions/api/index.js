const { cloud } = require("./lib/cloud");
const user = require("./handlers/user");
const family = require("./handlers/family");
const dish = require("./handlers/dish");
const order = require("./handlers/order");
const visit = require("./handlers/visit");

const handlers = {
  login: user.login,
  updateProfile: user.updateProfile,

  createFamily: family.createFamily,
  joinFamily: family.joinFamily,
  getFamily: family.getFamily,
  updateFamily: family.updateFamily,
  resetInviteCode: family.resetInviteCode,
  resetVisitCode: family.resetVisitCode,
  setOpenBrowse: family.setOpenBrowse,
  removeMember: family.removeMember,
  transferOwner: family.transferOwner,
  leaveFamily: family.leaveFamily,

  listDishes: dish.listDishes,
  getDish: dish.getDish,
  saveDish: dish.saveDish,
  removeDish: dish.removeDish,
  saveCategories: dish.saveCategories,
  renameCategory: dish.renameCategory,

  createOrder: order.createOrder,
  listOrders: order.listOrders,
  getOrder: order.getOrder,
  updateOrderStatus: order.updateOrderStatus,
  toggleIngredient: order.toggleIngredient,
  deleteOrder: order.deleteOrder,

  visitFamily: visit.visitFamily,
  toggleLike: visit.toggleLike,
  copyDish: visit.copyDish,
  recommendFamilies: visit.recommendFamilies,
  listVisitors: visit.listVisitors
};

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const action = event && event.action;
  const handler = handlers[action];

  if (!OPENID) {
    return { ok: false, code: "NO_OPENID", message: "请在小程序内使用" };
  }
  if (!handler) {
    return { ok: false, code: "UNKNOWN_ACTION", message: "未知操作" };
  }

  try {
    const data = await handler({ openid: OPENID, data: (event && event.data) || {} });
    return { ok: true, data };
  } catch (error) {
    if (error && error.isBiz) {
      return { ok: false, code: error.code, message: error.message };
    }
    console.error(`[${action}]`, error);
    return { ok: false, code: "SERVER", message: "服务开小差了，请稍后再试" };
  }
};
