const crypto = require("crypto");
const { redirect } = require("./_lib");
module.exports = (req, res) => {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const state = crypto.randomBytes(16).toString("hex");
  res.setHeader("Set-Cookie", `bl_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`);
  const u = new URL("https://github.com/login/oauth/authorize");
  u.searchParams.set("client_id", process.env.GITHUB_CLIENT_ID || "");
  u.searchParams.set("redirect_uri", "https://" + host + "/api/callback");
  u.searchParams.set("scope", "repo");
  u.searchParams.set("state", state);
  redirect(res, u.toString());
};
