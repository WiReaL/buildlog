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

  if (req.method === "POST") {
    if (b.mode === "issue") {
      const title = String(b.title || "").trim().slice(0, 200);
      if (!title) return send(res, 400, { error: "Başlık boş" });
      const r = await gh(t, `/repos/${full}/issues`, { method: "POST", body: JSON.stringify({ title }) });
      return send(res, r.ok ? 200 : 502, r.ok ? { ok: true } : { error: (r.data && r.data.message) || "Açılamadı" });
    }
    if (b.mode === "close") {
      const n = parseInt(b.n, 10);
      if (!n) return send(res, 400, { error: "Geçersiz issue" });
      const r = await gh(t, `/repos/${full}/issues/${n}`, { method: "PATCH", body: JSON.stringify({ state: "closed" }) });
      return send(res, r.ok ? 200 : 502, r.ok ? { ok: true } : { error: (r.data && r.data.message) || "Kapatılamadı" });
    }
    return send(res, 400, { error: "Bilinmeyen işlem" });
  }

  const [rp, cm, is, dp] = await Promise.all([
    gh(t, `/repos/${full}`),
    gh(t, `/repos/${full}/commits?per_page=8`),
    gh(t, `/repos/${full}/issues?state=open&per_page=15`),
    gh(t, `/repos/${full}/deployments?per_page=1`),
  ]);
  if (!rp.ok) return send(res, 502, { error: "Repo okunamadı" });
  let deploy = null;
  if (dp.ok && dp.data && dp.data[0]) {
    const st = await gh(t, `/repos/${full}/deployments/${dp.data[0].id}/statuses?per_page=1`);
    const s0 = st.ok && st.data && st.data[0];
    const u = s0 && (s0.environment_url || s0.target_url);
    deploy = { env: dp.data[0].environment, state: s0 ? s0.state : "bilinmiyor", url: u && /^https:\/\//.test(u) ? u : "" };
  }
  send(res, 200, {
    info: { stars: rp.data.stargazers_count, branch: rp.data.default_branch, url: rp.data.html_url },
    commits: cm.ok && Array.isArray(cm.data) ? cm.data.map((c) => ({ msg: String(c.commit.message).split("\n")[0], who: (c.commit.author && c.commit.author.name) || "", date: c.commit.author && c.commit.author.date })) : [],
    issues: is.ok && Array.isArray(is.data) ? is.data.filter((i) => !i.pull_request).map((i) => ({ n: i.number, title: i.title })) : [],
    deploy,
  });
};
