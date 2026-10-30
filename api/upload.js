const { token, gh, send } = require("./_lib");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
module.exports = async (req, res) => {
  const t = token(req);
  if (!t) return send(res, 401, { error: "Önce GitHub’a bağlan" });
  if (req.method !== "POST") return send(res, 405, { error: "Yöntem geçersiz" });
  const b = req.body || {};
  const repo = String(b.repo || "");
  if (!/^[A-Za-z0-9._-]{1,100}$/.test(repo)) return send(res, 400, { error: "Repo adı geçersiz" });
  const me = await gh(t, "/user");
  if (!me.ok) return send(res, 401, { error: "Oturum bitmiş, tekrar bağlan" });
  const owner = me.data.login;

  if (b.mode === "prepare") {
    const g = await gh(t, `/repos/${owner}/${repo}`);
    if (g.status === 404) {
      const c = await gh(t, "/user/repos", {
        method: "POST",
        body: JSON.stringify({ name: repo, auto_init: true, private: false, description: b.desc || "" }),
      });
      if (!c.ok) return send(res, 400, { error: "Repo oluşturulamadı" });
      await wait(1500);
    } else if (!g.ok) return send(res, 502, { error: "Repo okunamadı" });
    return send(res, 200, { ok: true });
  }

  if (b.mode === "file") {
    const path = String(b.path || "").replace(/^\/+/, "");
    if (!path || path.includes("..") || typeof b.content !== "string") return send(res, 400, { error: "Geçersiz dosya" });
    const enc = path.split("/").map(encodeURIComponent).join("/");
    const ex = await gh(t, `/repos/${owner}/${repo}/contents/${enc}`);
    const body = { message: "BuildLog ile yüklendi: " + path, content: b.content };
    if (ex.ok && ex.data && ex.data.sha) body.sha = ex.data.sha;
    const w = await gh(t, `/repos/${owner}/${repo}/contents/${enc}`, { method: "PUT", body: JSON.stringify(body) });
    if (!w.ok) return send(res, 502, { error: (w.data && w.data.message) || "Yazılamadı" });
    return send(res, 200, { ok: true });
  }

  if (b.mode === "publish") {
    const g = await gh(t, `/repos/${owner}/${repo}`);
    const br = g.ok ? g.data.default_branch : "main";
    await gh(t, `/repos/${owner}/${repo}/pages`, { method: "POST", body: JSON.stringify({ source: { branch: br, path: "/" } }) });
    const p = await gh(t, `/repos/${owner}/${repo}/pages`);
    const url = p.ok && p.data && p.data.html_url ? p.data.html_url : `https://${owner}.github.io/${repo}/`;
    return send(res, 200, { ok: true, url });
  }
  send(res, 400, { error: "Bilinmeyen işlem" });
};
