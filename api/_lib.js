exports.cookies = (req) => {
  const o = {};
  (req.headers.cookie || "").split(";").forEach((c) => {
    const i = c.indexOf("=");
    if (i > 0) o[c.slice(0, i).trim()] = decodeURIComponent(c.slice(i + 1).trim());
  });
  return o;
};
exports.token = (req) => exports.cookies(req).bl_token || null;
exports.gh = async (token, path, opt = {}) => {
  const r = await fetch("https://api.github.com" + path, {
    method: opt.method || "GET",
    body: opt.body,
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "buildlog",
    },
  });
  let data = null;
  try { data = await r.json(); } catch (e) {}
  return { ok: r.ok, status: r.status, data };
};
exports.send = (res, code, obj) => {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(obj));
};
exports.redirect = (res, url) => {
  res.statusCode = 302;
  res.setHeader("Location", url);
  res.end();
};
