'use strict';

const $ = (id) => document.getElementById(id);
const pill = $('status-pill');
const statusText = $('status-text');

function setAddr(addr) {
  $('server-addr').textContent = addr;
  $('addr-inline').textContent = addr;
}

function renderOnline(data) {
  pill.classList.remove('offline');
  pill.classList.add('online');
  statusText.textContent = '服务器在线';

  $('motd').textContent = data.motd || '欢迎来到 MyZLM 的 MC 服务器';
  $('queried-at').textContent = `更新于 ${new Date(data.queriedAt).toLocaleTimeString('zh-CN')}`;
  $('players-online').textContent = data.players.online;
  $('players-max').textContent = data.players.max;
  $('version').textContent = data.version;
  $('latency').textContent = `${data.latency} ms`;
  $('latency-hint').textContent = '网页 → 服务器 单程状态查询延迟';
  $('foot-status').textContent = '当前状态：在线';

  const list = $('player-list');
  list.innerHTML = '';
  if (data.players.sample && data.players.sample.length) {
    for (const p of data.players.sample) {
      const div = document.createElement('div');
      div.className = 'player';
      const img = document.createElement('img');
      img.src = `https://minotar.net/avatar/${encodeURIComponent(p.name)}/32`;
      img.alt = p.name;
      img.loading = 'lazy';
      const span = document.createElement('span');
      span.textContent = p.name;
      div.append(img, span);
      list.appendChild(div);
    }
  } else {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = data.players.online > 0 ? '有玩家在线（服务器未公开玩家列表）' : '现在没有人在线，快来成为第一个！';
    list.appendChild(p);
  }
}

function renderOffline(data) {
  pill.classList.remove('online');
  pill.classList.add('offline');
  statusText.textContent = '服务器离线';
  $('motd').textContent = '服务器暂时不在线';
  $('queried-at').textContent = `更新于 ${new Date(data.queriedAt).toLocaleTimeString('zh-CN')}`;
  $('players-online').textContent = '0';
  $('latency').textContent = '–';
  $('foot-status').textContent = '当前状态：离线';

  const list = $('player-list');
  list.innerHTML = '';
  const p = document.createElement('p');
  p.className = 'empty';
  p.textContent = '服务器离线时无法获取玩家数据';
  list.appendChild(p);
}

async function refresh() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (data.online) renderOnline(data); else renderOffline(data);
  } catch (e) {
    renderOffline({ queriedAt: new Date().toISOString(), error: String(e) });
  }
}

$('copy-btn').addEventListener('click', async () => {
  const addr = $('server-addr').textContent;
  try {
    await navigator.clipboard.writeText(addr);
    $('copy-btn').textContent = '已复制 ✓';
  } catch {
    // 降级方案
    const ta = document.createElement('textarea');
    ta.value = addr;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    $('copy-btn').textContent = '已复制 ✓';
  }
  setTimeout(() => { $('copy-btn').textContent = '复制'; }, 1500);
});

refresh();
setInterval(refresh, 15000);
