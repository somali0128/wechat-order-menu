const { cloud } = require("./cloud");
const settings = require("../settings");
const { formatCnTime, truncate } = require("./utils");

const STATE_MAP = {
  develop: "developer",
  trial: "trial",
  release: "formal"
};

const LIMITS = { thing: 20, phrase: 5, name: 10, character_string: 32 };

function clampData(data) {
  const result = {};
  Object.keys(data || {}).forEach((key) => {
    const type = key.replace(/\d+$/, "");
    const raw = String((data[key] && data[key].value) || "").trim() || "-";
    result[key] = { value: LIMITS[type] ? truncate(raw, LIMITS[type]) : raw };
  });
  return result;
}

function buildInfo(order, extra = {}) {
  const dishes = order.dishes || [];
  const first = dishes[0] ? dishes[0].name : "菜品";
  const dishSummary = dishes.length > 1 ? `${first}等${dishes.length}道菜` : first;
  const [, month, day] = String(order.mealDate || "").split("-");
  return {
    dishSummary,
    mealText: month ? `${month}-${day} ${order.mealType || ""}`.trim() : order.mealType || "",
    creatorName: order.creatorName || "家人",
    actorName: extra.actorName || order.creatorName || "家人",
    statusText: extra.statusText || "",
    remark: order.remark || "",
    orderNo: order.orderNo || "",
    createdTime: formatCnTime(order.createdAt),
    updatedTime: formatCnTime(Date.now())
  };
}

// 发送订阅消息，未配置模板或用户未订阅时静默跳过
async function sendSubscribe(key, toUsers, order, extra = {}) {
  const template = settings.subscribe && settings.subscribe[key];
  if (!template || !template.id || !toUsers.length) {
    return;
  }
  const info = buildInfo(order, extra);
  const data = clampData(template.build(info));
  const state = STATE_MAP[extra.envVersion] || "formal";

  await Promise.all(
    toUsers.map((touser) =>
      cloud.openapi.subscribeMessage
        .send({
          touser,
          templateId: template.id,
          page: `pages/order/order?id=${order._id}`,
          miniprogramState: state,
          lang: "zh_CN",
          data
        })
        .catch((error) => {
          // 43101：用户未订阅或次数已用完，属正常情况
          if (error.errCode !== 43101) {
            console.warn("subscribe send failed", key, error.errCode || error.message);
          }
        })
    )
  );
}

module.exports = { sendSubscribe };
