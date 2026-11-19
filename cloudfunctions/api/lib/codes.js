const { db } = require("./cloud");
const { fail } = require("./errors");

const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const FAMILIES = "families";

/** 生成在邀请码和访问码中都不重复的 6 位码 */
async function generateCode() {
  for (let i = 0; i < 10; i += 1) {
    let code = "";
    for (let j = 0; j < 6; j += 1) {
      code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }
    const [invite, visit] = await Promise.all([
      db.collection(FAMILIES).where({ inviteCode: code }).count(),
      db.collection(FAMILIES).where({ visitCode: code }).count()
    ]);
    if (!invite.total && !visit.total) {
      return code;
    }
  }
  fail("生成失败，请重试");
  return "";
}

/** 老家庭没有访问码时补上 */
async function ensureVisitCode(family) {
  if (family.visitCode) {
    return family.visitCode;
  }
  const visitCode = await generateCode();
  await db.collection(FAMILIES).doc(family._id).update({ data: { visitCode } });
  family.visitCode = visitCode;
  return visitCode;
}

module.exports = { generateCode, ensureVisitCode };
