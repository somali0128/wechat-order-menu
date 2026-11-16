/**
 * 订阅消息配置（可选）
 *
 * 1. 在「微信公众平台 → 功能 → 订阅消息」中选用两个一次性订阅模板：
 *    - newOrder：家人下了新订单时，通知其他家庭成员
 *    - statusChange：订单状态变化（开始采购 / 开始做饭 / 做好了 / 已取消）时，通知下单人
 * 2. 把模板 ID 填到下面的 id 字段。
 * 3. 根据模板详情里的字段名（如 thing1、time2、phrase3），修改 build 返回的 key。
 *    字段取值长度限制：thing ≤ 20 字、phrase ≤ 5 字、name ≤ 10 字，超出会被自动截断。
 *
 * id 留空表示不启用该提醒，小程序其他功能不受影响。
 *
 * build(info) 可用的字段：
 *   info.dishSummary  菜品摘要，如「番茄炒蛋等3道菜」
 *   info.mealText     用餐时间，如「11-18 晚餐」
 *   info.creatorName  下单人昵称
 *   info.actorName    本次操作人昵称
 *   info.statusText   订单状态，如「制作中」
 *   info.remark       备注
 *   info.orderNo      订单号
 *   info.createdTime  下单时间（YYYY-MM-DD HH:mm）
 *   info.updatedTime  更新时间（YYYY-MM-DD HH:mm）
 */
module.exports = {
  subscribe: {
    newOrder: {
      id: "",
      build: (info) => ({
        thing1: { value: info.dishSummary },
        time2: { value: info.createdTime },
        thing3: { value: info.remark || info.mealText },
        name4: { value: info.creatorName }
      })
    },
    statusChange: {
      id: "",
      build: (info) => ({
        thing1: { value: info.dishSummary },
        phrase2: { value: info.statusText },
        time3: { value: info.updatedTime },
        name4: { value: info.actorName }
      })
    }
  }
};
