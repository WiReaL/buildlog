const { token, gh, send } = require("./_lib");
module.exports = async (req, res) => {
  const t = token(req);
  if (!t) return send(res, 401, { error: "giris" });
  const u = await gh(t, "/user");
  if (!u.ok) return send(res, 401, { error: "giris" });
  const r = await gh(t, "/user/repos?per_page=100&sort=pushed&affiliation=owner");
  if (!r.ok) return send(res, 502, { error: "github" });
  send(res, 200, {
    user: { login: u.data.login, name: u.data.name, avatar: u.data.avatar_url },
    repos: r.data.map((x) => ({
      name: x.name, full: x.full_name, desc: x.description, lang: x.language,
      topics: x.topics || [], pushed: x.pushed_at, url: x.html_url, home: x.homepage,
      priv: x.private, archived: x.archived, fork: x.fork, issues: x.open_issues_count,
    })),
  });
};
