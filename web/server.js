/**
 * MyZLM MC 配套网站
 * 纯 Node.js 实现（零依赖）：
 *  - /api/status  通过 Server List Ping 协议实时查询 MC 服务器状态
 *  - /            展示服务器状态、在线玩家、服务器信息的仪表盘
 */
'use strict';

const http = require('http');
const net = require('net');
const fs = require('fs');
const path = require('path');

// ---------- 配置 ----------
const CONFIG = {
  webPort: Number(process.env.WEB_PORT || 3000),
  mcHost: process.env.MC_HOST || '127.0.0.1',
  mcPort: Number(process.env.MC_PORT || 25565),
  publicIp: process.env.PUBLIC_IP || '', // 对外展示的 IP/域名（留空则显示 mcHost）
};

// ---------- Server List Ping（MC 服务器列表协议）----------
function writeVarInt(value) {
  const bytes = [];
  let v = value >>> 0;
  do {
    let b = v & 0x7f;
    v >>>= 7;
    if (v !== 0) b |= 0x80;
    bytes.push(b);
  } while (v !== 0);
  return Buffer.from(bytes);
}

function frame(body) {
  return Buffer.concat([writeVarInt(body.length), body]);
}

function flattenMotd(component) {
  if (component == null) return '';
  if (typeof component === 'string') return component;
  let text = component.text || '';
  if (Array.isArray(component.extra)) {
    text += component.extra.map(flattenMotd).join('');
  }
  return text;
}

function mcPing(host, port, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    const started = Date.now();
    let buf = Buffer.alloc(0);
    let packetLength = -1;
    let latency = 0;

    const fail = (err) => {
      socket.destroy();
      reject(err);
    };

    socket.setTimeout(timeout);
    socket.on('timeout', () => fail(new Error('连接超时')));
    socket.on('error', fail);

    // Handshake (0x00) -> Status (0x01)
    const addrBuf = Buffer.from(host, 'utf8');
    const handshake = Buffer.concat([
      writeVarInt(0x00),                       // Packet ID: Handshake
      writeVarInt(0x2EE),                      // Protocol version（仅探测用，随便给个现代版本）
      writeVarInt(addrBuf.length), addrBuf,    // server address
      (() => { const p = Buffer.alloc(2); p.writeUInt16BE(port); return p; })(), // port
      writeVarInt(0x01),                       // Next state: Status
    ]);
    socket.write(frame(handshake));
    socket.write(frame(writeVarInt(0x00)));    // Status Request

    socket.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      if (latency === 0) latency = Date.now() - started;

      // 读包长 VarInt
      if (packetLength === -1) {
        let numRead = 0, result = 0, read;
        do {
          if (numRead >= buf.length) return;   // 数据不够，等下一块
          read = buf[numRead++];
          result |= (read & 0x7f) << (7 * (numRead - 1));
        } while (read & 0x80);
        packetLength = result;
        buf = buf.subarray(numRead);
      }

      if (buf.length < packetLength) return;   // 包没到齐

      let body = buf.subarray(0, packetLength);
      socket.destroy();

      // Packet ID
      let numRead = 0, read;
      do { read = body[numRead++]; } while (read & 0x80);
      body = body.subarray(numRead);

      // JSON 字符串长度 VarInt
      let strLen = 0; numRead = 0;
      do { read = body[numRead++]; strLen |= (read & 0x7f) << (7 * (numRead - 1)); } while (read & 0x80);
      body = body.subarray(numRead);

      try {
        const json = JSON.parse(body.subarray(0, strLen).toString('utf8'));
        resolve({
          online: true,
          latency,
          version: (json.version && json.version.name) || '未知',
          protocol: (json.version && json.version.protocol) || 0,
          motd: flattenMotd(json.description),
          players: {
            online: (json.players && json.players.online) || 0,
            max: (json.players && json.players.max) || 0,
            sample: (json.players && json.players.sample
              ? json.players.sample.map((p) => ({ name: p.name, uuid: p.id || p.uuid }))
              : []),
          },
          favicon: json.favicon || null,
          queriedAt: new Date().toISOString(),
        });
      } catch (e) {
        fail(new Error('状态数据解析失败'));
      }
    });
  });
}

// ---------- HTTP ----------
const PUBLIC_DIR = path.join(__dirname, 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
};

let statusCache = { data: null, at: 0 };

function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/api/status') {
    // 3 秒缓存，避免频繁探测
    if (statusCache.data && Date.now() - statusCache.at < 3000) {
      return send(res, 200, JSON.stringify(statusCache.data));
    }
    try {
      const data = await mcPing(CONFIG.mcHost, CONFIG.mcPort);
      data.address = CONFIG.publicIp || `${CONFIG.mcHost}:${CONFIG.mcPort}`;
      statusCache = { data, at: Date.now() };
      send(res, 200, JSON.stringify(data));
    } catch (e) {
      const data = {
        online: false,
        address: CONFIG.publicIp || `${CONFIG.mcHost}:${CONFIG.mcPort}`,
        error: e.message,
        queriedAt: new Date().toISOString(),
      };
      statusCache = { data, at: Date.now() };
      send(res, 200, JSON.stringify(data));
    }
    return;
  }

  // 静态文件
  let file = url.pathname === '/' ? '/index.html' : url.pathname;
  file = path.normalize(file).replace(/^([.][.][\\/])+/, '');
  const full = path.join(PUBLIC_DIR, file);
  if (!full.startsWith(PUBLIC_DIR)) return send(res, 403, 'Forbidden', 'text/plain');
  fs.readFile(full, (err, data) => {
    if (err) return send(res, 404, 'Not Found', 'text/plain; charset=utf-8');
    send(res, 200, data, MIME[path.extname(full).toLowerCase()] || 'application/octet-stream');
  });
});

server.listen(CONFIG.webPort, () => {
  console.log(`[web] 网站已启动: http://localhost:${CONFIG.webPort}`);
  console.log(`[web] 正在探测 MC 服务器: ${CONFIG.mcHost}:${CONFIG.mcPort}`);
});
