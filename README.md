# 无服务器部署2048小游戏
首先去 cloudflare.com 注册，随便绑一张卡（免费套餐足够，不会扣费）


第 1 步：安装 Node.js 和 Wrangler
去 nodejs.org 下载 LTS 版本，安装。
打开 命令提示符(Windows) 或 终端(Mac/Linux)，输入：

bash
npm install -g wrangler

登录 Cloudflare：

bash
wrangler login

第 2 步：创建 D1 数据库
bash
wrangler d1 create game2048-db

它会输出类似：

text
[[d1_databases]]
binding = "DB"
database_name = "game2048-db"
database_id = "abc123-def456-..."

复制 database_id = "..." 里面的一串字符，待会要用。

第 3 步：修改 wrangler.toml
用记事本打开 wrangler.toml，把 database_id = "你的真实 database_id" 替换成刚才复制的 ID。

第 4 步：初始化数据库表
bash
wrangler d1 execute game2048-db --file=schema.sql

第 5 步：部署
在项目文件夹里执行：

bash
wrangler deploy

等待几秒，你会看到类似：

text
https://2048-game.你的用户名.workers.dev
点击这个链接，就能玩 2048 了！🎉


