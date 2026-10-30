# BuildLog kurulum (yaklaşık 15 dakika)

1. GitHub'da yeni bir repo aç (ör. `buildlog`). Bu klasördeki tüm dosyaları, `api` klasörüyle birlikte içine yükle.
2. vercel.com'a GitHub ile giriş yap, Add New > Project'ten bu repoyu seç. Framework: "Other". Deploy'a bas. Çıkan adresi not al (ör. `buildlog-abc.vercel.app`).
3. GitHub > Settings > Developer settings > OAuth Apps > New OAuth App:
   - Homepage URL: `https://ADRESIN`
   - Authorization callback URL: `https://ADRESIN/api/callback`
   Oluşunca Client ID'yi kopyala, "Generate a new client secret" ile secret üret ve kopyala.
4. Vercel > Projen > Settings > Environment Variables: `GITHUB_CLIENT_ID` ve `GITHUB_CLIENT_SECRET` ekle. Sonra Deployments > Redeploy.
5. Adresini aç, GitHub sekmesinden "GitHub'a bağlan"a bas.

Notlar: Dosya başına en fazla ~3 MB yüklenir. Canlı bağlantı için GitHub Pages kullanılır, yani statik (HTML/CSS/JS) projeler doğrudan yayına girer.
