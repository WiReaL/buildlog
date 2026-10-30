const { token, gh, send } = require("./_lib");
const REPO = "buildlog-data";
const FILE = "data.json";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = async (req, res) => {
  const t = token(req);
  if (!t) return send(res, 401, { error: "giris" });
  const me = await gh(t, "/user");
  if (!me.ok) return send(res, 401, { error: "giris" });
  const owner = me.data.login;
  const path = `/repos/${owner}/${REPO}/contents/${FILE}`;

  if (req.method === "GET") {
    const r = await gh(t, path);
    if (r.status === 404) return send(res, 200, { empty: true });
    if (!r.ok) return send(res, 502, { error: "Veri okunamadı" });
    let data = null;
    try { data = JSON.parse(Buffer.from(r.data.content, "base64").toString("utf8")); } catch (e) {}
    return send(res, 200, { data });
  }

  if (req.method === "POST") {
    const body = req.body || {};
    if (!body.data || typeof body.data !== "object") return send(res, 400, { error: "Geçersiz veri" });
    const g = await gh(t, `/repos/${owner}/${REPO}`);
    if (g.status === 404) {
      const c = await gh(t, "/user/repos", {
        method: "POST",
        body: JSON.stringify({ name: REPO, private: true, auto_init: true, description: "BuildLog verileri" }),
      });
      if (!c.ok) return send(res, 400, { error: "Veri reposu oluşturulamadı" });
      await wait(1500);
    } else if (!g.ok) return send(res, 502, { error: "Veri reposu okunamadı" });
    const ex = await gh(t, path);
    const put = {
      message: "BuildLog verisi güncellendi",
      content: Buffer.from(JSON.stringify(body.data)).toString("base64"),
    };
    if (ex.ok && ex.data && ex.data.sha) put.sha = ex.data.sha;
    const w = await gh(t, path, { method: "PUT", body: JSON.stringify(put) });
    if (!w.ok) return send(res, 502, { error: (w.data && w.data.message) || "Kaydedilemedi" });
    return send(res, 200, { ok: true });
  }
  send(res, 405, { error: "Yöntem geçersiz" });
};
