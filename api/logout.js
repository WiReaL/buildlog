const { redirect } = require("./_lib");
module.exports = (req, res) => {
  res.setHeader("Set-Cookie", "bl_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0");
  redirect(res, "/");
};
