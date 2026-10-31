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

  if (b.mode === "blob") {
    if (typeof b.content !== "string") return send(res, 400, { error: "Geçersiz dosya" });
    const r = await gh(t, `/repos/${owner}/${repo}/git/blobs`, { method: "POST", body: JSON.stringify({ content: b.content, encoding: "base64" }) });
    if (!r.ok) return send(res, 502, { error: (r.data && r.data.message) || "Yüklenemedi" });
    return send(res, 200, { ok: true, sha: r.data.sha });
  }

  if (b.mode === "commit") {
    const files = Array.isArray(b.files) ? b.files : [];
    if (!files.length || files.length > 500) return send(res, 400, { error: "Dosya listesi geçersiz" });
    for (const f of files) {
      if (!f || typeof f.path !== "string" || !f.path || f.path.includes("..") || f.path.startsWith("/") || !/^[0-9a-f]{40}$/.test(f.sha || ""))
        return send(res, 400, { error: "Geçersiz dosya yolu" });
    }
    const g = await gh(t, `/repos/${owner}/${repo}`);
    if (!g.ok) return send(res, 502, { error: "Repo okunamadı" });
    const br = g.data.default_branch;
    const ref = await gh(t, `/repos/${owner}/${repo}/git/ref/heads/${br}`);
    if (!ref.ok) return send(res, 502, { error: "Dal okunamadı" });
    const parent = ref.data.object.sha;
    const pc = await gh(t, `/repos/${owner}/${repo}/git/commits/${parent}`);
    if (!pc.ok) return send(res, 502, { error: "Commit okunamadı" });
    const tree = await gh(t, `/repos/${owner}/${repo}/git/trees`, {
      method: "POST",
      body: JSON.stringify({ base_tree: pc.data.tree.sha, tree: files.map((f) => ({ path: f.path, mode: "100644", type: "blob", sha: f.sha })) }),
    });
    if (!tree.ok) return send(res, 502, { error: (tree.data && tree.data.message) || "Dosya ağacı oluşturulamadı" });
    const cm = await gh(t, `/repos/${owner}/${repo}/git/commits`, {
      method: "POST",
      body: JSON.stringify({ message: String(b.message || "BuildLog ile yüklendi").slice(0, 200), tree: tree.data.sha, parents: [parent] }),
    });
    if (!cm.ok) return send(res, 502, { error: (cm.data && cm.data.message) || "Commit oluşturulamadı" });
    const up = await gh(t, `/repos/${owner}/${repo}/git/refs/heads/${br}`, { method: "PATCH", body: JSON.stringify({ sha: cm.data.sha }) });
    if (!up.ok) return send(res, 502, { error: (up.data && up.data.message) || "Dal güncellenemedi" });
    return send(res, 200, { ok: true });
  }

  if (b.mode === "publish") {
    const dp = await gh(t, `/repos/${owner}/${repo}/deployments?per_page=1`);
    if (dp.ok && Array.isArray(dp.data) && dp.data[0]) return send(res, 200, { ok: true, url: "", vercel: true });
    const g = await gh(t, `/repos/${owner}/${repo}`);
    const br = g.ok ? g.data.default_branch : "main";
    await gh(t, `/repos/${owner}/${repo}/pages`, { method: "POST", body: JSON.stringify({ source: { branch: br, path: "/" } }) });
    const p = await gh(t, `/repos/${owner}/${repo}/pages`);
    const url = p.ok && p.data && p.data.html_url ? p.data.html_url : `https://${owner}.github.io/${repo}/`;
    return send(res, 200, { ok: true, url });
  }
  send(res, 400, { error: "Bilinmeyen işlem" });
};
