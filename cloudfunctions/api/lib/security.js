const { cloud } = require("./cloud");
const { fail } = require("./errors");

// 文本内容安全检测（发布上线时微信审核要求 UGC 内容做安全校验）
async function checkText(openid, ...parts) {
  const content = parts
    .flat()
    .filter(Boolean)
    .join("\n")
    .trim();
  if (!content) {
    return;
  }
  try {
    const res = await cloud.openapi.security.msgSecCheck({
      openid,
      scene: 2,
      version: 2,
      content: content.slice(0, 2500)
    });
    const suggest = res && res.result && res.result.suggest;
    if (suggest && suggest !== "pass") {
      fail("内容可能包含敏感信息，请修改后再试", "RISKY");
    }
  } catch (error) {
    if (error.isBiz) {
      throw error;
    }
    if (error.errCode === 87014) {
      fail("内容可能包含敏感信息，请修改后再试", "RISKY");
    }
    // 接口异常时不阻塞正常使用
    console.warn("msgSecCheck skipped", error.errCode || error.message);
  }
}

module.exports = { checkText };
