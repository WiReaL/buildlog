const { token, gh, send } = require("./_lib");
module.exports = async (req, res) => {
  const t = token(req);
  if (!t) return send(res, 401, { error: "giris" });
  const me = await gh(t, "/user");
  if (!me.ok) return send(res, 401, { error: "giris" });
  const b = req.method === "POST" ? req.body || {} : req.query || {};
  const full = String(b.r || "");
  if (!/^[\w.-]+\/[\w.-]+$/.test(full) || full.split("/")[0].toLowerCase() !== me.data.login.toLowerCase())
    return send(res, 400, { error: "Geçersiz repo" });
  const path = String(b.path || "").replace(/^\/+|\/+$/g, "");
  if (path.includes("..")) return send(res, 400, { error: "Geçersiz yol" });
  const enc = path.split("/").filter(Boolean).map(encodeURIComponent).join("/");
  const url = `/repos/${full}/contents${enc ? "/" + enc : ""}`;

  if (req.method === "GET") {
    const r = await gh(t, url);
    if (!r.ok) return send(res, r.status === 404 ? 404 : 502, { error: r.status === 404 ? "Bulunamadı" : "Okunamadı" });
    if (Array.isArray(r.data)) {
      const items = r.data.map((x) => ({ name: x.name, path: x.path, type: x.type, size: x.size }))
        .sort((a, c) => (a.type === c.type ? a.name.localeCompare(c.name) : a.type === "dir" ? -1 : 1));
      return send(res, 200, { type: "dir", items });
    }
    const f = r.data;
    if (f.type !== "file") return send(res, 200, { type: "other" });
    if (f.size > 200000 || !f.content) return send(res, 200, { type: "big" });
    const buf = Buffer.from(f.content, "base64");
    if (buf.includes(0)) return send(res, 200, { type: "binary" });
    return send(res, 200, { type: "file", text: buf.toString("utf8") });
  }

  if (req.method === "POST") {
    if (!path) return send(res, 400, { error: "Dosya yolu boş" });
    if (typeof b.text !== "string" || b.text.length > 400000) return send(res, 400, { error: "İçerik geçersiz ya da çok büyük" });
    const ex = await gh(t, url);
    const body = { message: String(b.message || "BuildLog ile düzenlendi: " + path).slice(0, 200), content: Buffer.from(b.text, "utf8").toString("base64") };
    if (ex.ok && ex.data && ex.data.sha) body.sha = ex.data.sha;
    const w = await gh(t, url, { method: "PUT", body: JSON.stringify(body) });
    return w.ok ? send(res, 200, { ok: true }) : send(res, 502, { error: (w.data && w.data.message) || "Kaydedilemedi" });
  }
  send(res, 405, { error: "Yöntem geçersiz" });
};
