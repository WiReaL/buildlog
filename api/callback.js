const { cookies, redirect } = require("./_lib");
module.exports = async (req, res) => {
  try {
    const { code, state } = req.query || {};
    const c = cookies(req);
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    if (!code || !state || state !== c.bl_state) return redirect(res, "/?hata=oturum");
    const r = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: "https://" + host + "/api/callback",
      }),
    });
    const d = await r.json();
    if (!d.access_token) return redirect(res, "/?hata=token");
    res.setHeader("Set-Cookie", [
      `bl_token=${d.access_token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`,
      "bl_state=; Max-Age=0; Path=/",
    ]);
    redirect(res, "/");
  } catch (e) {
    redirect(res, "/?hata=sunucu");
  }
};
