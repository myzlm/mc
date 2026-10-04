# MyZLM MC Server (D:\MC_Server)

Paper 26.3 (build 147) · 8人以内 · JVM 内存 4GB（总占用 < 6GB）

## 文件说明

| 文件 | 说明 |
|---|---|
| `启动服务器.bat` | 双击启动服务器（Aikar 优化参数） |
| `paper-26.3-147.jar` | Paper 服务端 |
| `jdk-25.0.4.1+1-jre\` | 便携版 Java 25（MC 26.3 要求） |
| `server.properties` | 服务器配置 |
| `web\` | 配套网站（Node.js，见 web/README.md） |

## 关键配置

- 端口：25565（Java 版默认）
- 人数上限：8
- 视距 8 / 模拟距离 6（8人流畅）
- 白名单：**开启**（`whitelist.json`，控制台 `whitelist add 玩家名`）
- 正版验证：开启（`online-mode=true`，如需离线改 false）
- 挂机踢出：30 分钟
- 无人暂停：60 秒后自动暂停存档省资源

## 首次启动

1. 双击 `启动服务器.bat`，等待出现 `Done (xxx s)! For help, type "help"`
2. 控制台输入 `op 你的游戏名` 给自己管理员
3. 把朋友的 ID 加白名单：`whitelist add ID`

网站启动：见 `web/README.md`（`启动网站.bat`，默认 http://localhost:3000）
