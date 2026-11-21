// ==UserScript==
// @name         Lichess Titled Opponents & Stats
// @namespace    https://github.com/YOUR_USERNAME/lichess-titled-opponents
// @version      2.0.0
// @description  Find all your Lichess games against titled players (GM, IM, FM, CM, NM, etc.) with detailed winrates, average opponent ratings, and filters.
// @author       YourName
// @match        https://lichess.org/@/*
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    const pathParts = window.location.pathname.split('/');
    if (pathParts[1] !== '@' || !pathParts[2]) return;
    const targetUser = pathParts[2].split('?')[0];

    // Title hierarchy & badge colors
    const TITLE_ORDER = ['GM', 'WGM', 'IM', 'WIM', 'FM', 'WFM', 'CM', 'WCM', 'NM', 'WNM', 'LM', 'BOT'];
    const TITLE_COLORS = {
        GM: '#d9822b', WGM: '#d9822b',
        IM: '#c98a3b', WIM: '#c98a3b',
        FM: '#b58863', WFM: '#b58863',
        CM: '#9e7b56', WCM: '#9e7b56',
        NM: '#8c735b', WNM: '#8c735b',
        LM: '#759900', BOT: '#5c8bb0'
    };

    // Inject Floating Action Button
    const fab = document.createElement('button');
    fab.innerHTML = `<span style="font-size:15px;">🏆</span> <span>Titled Opponents</span>`;
    Object.assign(fab.style, {
        position: 'fixed',
        bottom: '22px',
        right: '22px',
        zIndex: '9998',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 16px',
        background: 'linear-gradient(135deg, #3692e7 0%, #2472ba 100%)',
        color: '#fff',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '13.5px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.45)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease'
    });
    fab.onmouseenter = () => { fab.style.transform = 'translateY(-2px)'; fab.style.boxShadow = '0 8px 25px rgba(54, 146, 231, 0.45)'; };
    fab.onmouseleave = () => { fab.style.transform = 'translateY(0)'; fab.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.45)'; };
    document.body.appendChild(fab);

    fab.addEventListener('click', openDashboard);

    function openDashboard() {
        const existing = document.getElementById('ltg-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'ltg-overlay';
        Object.assign(overlay.style, {
            position: 'fixed',
            inset: '0',
            backgroundColor: 'rgba(10, 10, 10, 0.78)',
            backdropFilter: 'blur(4px)',
            zIndex: '10000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        });

        overlay.innerHTML = `
            <style>
                #ltg-modal * { box-sizing: border-box; }
                #ltg-modal ::-webkit-scrollbar { width: 8px; height: 8px; }
                #ltg-modal ::-webkit-scrollbar-track { background: #161512; }
                #ltg-modal ::-webkit-scrollbar-thumb { background: #3c3934; border-radius: 4px; }
                #ltg-modal ::-webkit-scrollbar-thumb:hover { background: #524e47; }
                .ltg-card { background: #1e1c19; border: 1px solid #33302b; border-radius: 8px; padding: 12px 14px; }
                .ltg-stat-val { font-size: 20px; font-weight: 700; color: #fff; margin-top: 2px; }
                .ltg-stat-lbl { font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; color: #8c8881; }
                .ltg-table { width: 100%; border-collapse: collapse; font-size: 13px; }
                .ltg-table th { text-align: left; padding: 8px 10px; color: #8c8881; font-weight: 600; border-bottom: 1px solid #33302b; font-size: 11.5px; text-transform: uppercase; }
                .ltg-table td { padding: 8px 10px; border-bottom: 1px solid #292622; color: #d6d3cd; }
                .ltg-table tr:hover td { background: #26231f; }
                .ltg-badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px; color: #fff; min-width: 34px; text-align: center; }
                .ltg-input { background: #161512; border: 1px solid #383530; color: #e6e3dd; padding: 7px 10px; border-radius: 6px; font-size: 13px; outline: none; }
                .ltg-input:focus { border-color: #3692e7; }
                .ltg-btn { padding: 7px 14px; border: none; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer; transition: opacity 0.15s; }
                .ltg-btn:hover { opacity: 0.9; }
                .ltg-pill { padding: 4px 10px; border-radius: 99px; font-size: 12px; background: #26231f; border: 1px solid #383530; color: #bab6ae; cursor: pointer; }
                .ltg-pill.active { background: #3692e7; border-color: #3692e7; color: #fff; font-weight: 600; }
            </style>

            <div id="ltg-modal" style="width: 960px; max-width: 100%; height: 86vh; background: #262421; border: 1px solid #3d3a34; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 24px 60px rgba(0,0,0,0.75);">
                <!-- Header -->
                <div style="padding: 16px 20px; background: #1e1c19; border-bottom: 1px solid #33302b; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 20px;">🏆</span>
                        <div>
                            <h2 style="margin: 0; font-size: 16px; color: #fff; font-weight: 700;">Titled Opponents Analytics — <span style="color: #3692e7;">${targetUser}</span></h2>
                            <div style="font-size: 12px; color: #8c8881;">Streams official Lichess game history & calculates title performance</div>
                        </div>
                    </div>
                    <button id="ltg-close" style="background: #2b2824; border: 1px solid #3d3a34; color: #ccc; width: 30px; height: 30px; border-radius: 6px; font-size: 18px; cursor: pointer; line-height: 1;">×</button>
                </div>

                <!-- Controls -->
                <div style="padding: 12px 20px; background: #211f1c; border-bottom: 1px solid #33302b; display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                    <input id="ltg-token" type="password" class="ltg-input" placeholder="Optional: Lichess API Token (3x faster scan)" style="flex: 1; min-width: 210px;" value="${localStorage.getItem('ltg_api_token') || ''}">
                    <select id="ltg-perf-filter" class="ltg-input">
                        <option value="all">All Time Controls</option>
                        <option value="bullet">Bullet</option>
                        <option value="blitz">Blitz</option>
                        <option value="rapid">Rapid</option>
                        <option value="classical">Classical</option>
                        <option value="correspondence">Correspondence</option>
                    </select>
                    <label style="font-size: 12.5px; color: #bab6ae; display: flex; align-items: center; gap: 5px; cursor: pointer; user-select: none;">
                        <input id="ltg-hide-bots" type="checkbox" checked> Exclude BOTs
                    </label>
                    <button id="ltg-start" class="ltg-btn" style="background: #629924; color: #fff;">▶ Scan Games</button>
                    <button id="ltg-export" class="ltg-btn" style="background: #33302b; color: #d6d3cd; display: none;">⬇ CSV</button>
                </div>

                <!-- Status Bar -->
                <div id="ltg-status" style="padding: 8px 20px; background: #181714; border-bottom: 1px solid #2e2b27; font-size: 12.5px; color: #9e9a93; display: flex; justify-content: space-between;">
                    <span>Click <b>Scan Games</b> to analyze ${targetUser}'s match history.</span>
                    <span id="ltg-speed"></span>
                </div>

                <!-- Main Content -->
                <div style="padding: 18px 20px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 18px;">
                    
                    <!-- KPI Summary Cards -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(155px, 1fr)); gap: 12px;">
                        <div class="ltg-card">
                            <div class="ltg-stat-lbl">Titled Games</div>
                            <div class="ltg-stat-val" id="kpi-total">0</div>
                            <div style="font-size: 11.5px; color: #78746d;" id="kpi-pct">0% of scanned</div>
                        </div>
                        <div class="ltg-card">
                            <div class="ltg-stat-lbl">Overall Score</div>
                            <div class="ltg-stat-val" id="kpi-score" style="color: #629924;">0.0%</div>
                            <div style="font-size: 11.5px; color: #78746d;" id="kpi-wdl">0W · 0D · 0L</div>
                        </div>
                        <div class="ltg-card">
                            <div class="ltg-stat-lbl">Avg Opponent Rating</div>
                            <div class="ltg-stat-val" id="kpi-avgrating">—</div>
                            <div style="font-size: 11.5px; color: #78746d;" id="kpi-perf">Perf Rating: —</div>
                        </div>
                        <div class="ltg-card">
                            <div class="ltg-stat-lbl">Best Scalp (Win)</div>
                            <div class="ltg-stat-val" id="kpi-best" style="color: #d9822b; font-size: 16px; margin-top: 5px;">—</div>
                            <div style="font-size: 11.5px; color: #78746d;" id="kpi-best-sub">Highest rated victory</div>
                        </div>
                        <div class="ltg-card">
                            <div class="ltg-stat-lbl">White vs Black</div>
                            <div class="ltg-stat-val" id="kpi-colors" style="font-size: 16px; margin-top: 5px;">— / —</div>
                            <div style="font-size: 11.5px; color: #78746d;">Winrate by color</div>
                        </div>
                    </div>

                    <!-- Breakdown by Title Table -->
                    <div class="ltg-card" style="padding: 0; overflow: hidden;">
                        <div style="padding: 12px 16px; border-bottom: 1px solid #33302b; display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-weight: 700; font-size: 13.5px; color: #fff;">Breakdown by Title</span>
                            <span style="font-size: 11.5px; color: #8c8881;">Click any title row to filter match list</span>
                        </div>
                        <div style="overflow-x: auto;">
                            <table class="ltg-table">
                                <thead>
                                    <tr>
                                        <th>Title</th>
                                        <th>Games</th>
                                        <th>W / D / L</th>
                                        <th>Score %</th>
                                        <th>Win %</th>
                                        <th>Avg Opp Rating</th>
                                        <th>Your Avg Rating</th>
                                        <th>Highest Rated Opp</th>
                                    </tr>
                                </thead>
                                <tbody id="ltg-title-tbody">
                                    <tr><td colspan="8" style="text-align:center; color:#6e6a63; padding: 18px;">No data yet</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Match List Section -->
                    <div class="ltg-card" style="padding: 0; overflow: hidden; display: flex; flex-direction: column;">
                        <div style="padding: 12px 16px; border-bottom: 1px solid #33302b; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-weight: 700; font-size: 13.5px; color: #fff;">Match History</span>
                                <span id="ltg-list-count" style="font-size: 12px; color: #8c8881;">(0)</span>
                            </div>
                            <div style="display: flex; gap: 6px; flex-wrap: wrap;" id="ltg-filter-pills">
                                <button class="ltg-pill active" data-res="all">All</button>
                                <button class="ltg-pill" data-res="win">Wins</button>
                                <button class="ltg-pill" data-res="draw">Draws</button>
                                <button class="ltg-pill" data-res="loss">Losses</button>
                                <span id="ltg-active-title-tag" style="display:none; background:#d9822b; color:#fff; padding: 4px 10px; border-radius:99px; font-size:12px; font-weight:600; cursor:pointer;"></span>
                            </div>
                        </div>
                        <div style="overflow-x: auto; max-height: 360px;">
                            <table class="ltg-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Opponent</th>
                                        <th>Your Rating</th>
                                        <th>Color</th>
                                        <th>Mode</th>
                                        <th>Result</th>
                                        <th>Link</th>
                                    </tr>
                                </thead>
                                <tbody id="ltg-games-tbody">
                                    <tr><td colspan="7" style="text-align:center; color:#6e6a63; padding: 20px;">Scan games to populate match history</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // State
        let abortController = null;
        let allMatches = [];
        let scannedCount = 0;
        let selectedTitleFilter = 'ALL';
        let selectedResultFilter = 'all';

        const closeOverlay = () => {
            if (abortController) abortController.abort();
            overlay.remove();
        };
        document.getElementById('ltg-close').onclick = closeOverlay;
        overlay.addEventListener('click', (e) => { if (e.target === overlay) closeOverlay(); });

        // Result filter pills
        document.querySelectorAll('#ltg-filter-pills .ltg-pill').forEach(pill => {
            pill.onclick = () => {
                document.querySelectorAll('#ltg-filter-pills .ltg-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                selectedResultFilter = pill.dataset.res;
                renderMatchesTable();
            };
        });

        // Clear title filter badge
        const titleTag = document.getElementById('ltg-active-title-tag');
        titleTag.onclick = () => {
            selectedTitleFilter = 'ALL';
            titleTag.style.display = 'none';
            renderMatchesTable();
        };

        // CSV Export
        document.getElementById('ltg-export').onclick = () => {
            if (!allMatches.length) return;
            const header = ['Date', 'Title', 'Opponent', 'OpponentRating', 'UserRating', 'Color', 'Speed', 'Result', 'GameURL'];
            const rows = allMatches.map(m => [
                m.dateISO, m.oppTitle, m.oppName, m.oppRating || '', m.userRating || '',
                m.userColor, m.speed, m.result, `https://lichess.org/${m.id}`
            ]);
            const csv = [header, ...rows].map(r => r.join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${targetUser}_titled_games.csv`;
            a.click();
        };

        // Start / Stop Scan
        document.getElementById('ltg-start').onclick = async () => {
            const startBtn = document.getElementById('ltg-start');
            if (abortController) {
                abortController.abort();
                abortController = null;
                startBtn.innerText = '▶ Scan Games';
                startBtn.style.background = '#629924';
                return;
            }

            const token = document.getElementById('ltg-token').value.trim();
            if (token) localStorage.setItem('ltg_api_token', token);
            const perfFilter = document.getElementById('ltg-perf-filter').value;
            const hideBots = document.getElementById('ltg-hide-bots').checked;

            allMatches = [];
            scannedCount = 0;
            selectedTitleFilter = 'ALL';
            titleTag.style.display = 'none';
            document.getElementById('ltg-export').style.display = 'none';

            abortController = new AbortController();
            startBtn.innerText = '■ Stop';
            startBtn.style.background = '#cc3333';

            const statusEl = document.getElementById('ltg-status').firstElementChild;
            const speedEl = document.getElementById('ltg-speed');
            const startTime = performance.now();
            let lastRender = 0;

            try {
                const headers = { 'Accept': 'application/x-ndjson' };
                if (token) headers['Authorization'] = `Bearer ${token}`;

                let url = `https://lichess.org/api/games/user/${targetUser}?moves=false&clocks=false&evals=false&opening=false`;
                if (perfFilter !== 'all') url += `&perfType=${perfFilter}`;

                const response = await fetch(url, { headers, signal: abortController.signal });
                if (!response.ok) throw new Error(`HTTP ${response.status} (${response.statusText})`);

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop();

                    for (const line of lines) {
                        if (!line.trim()) continue;
                        scannedCount++;
                        processGame(JSON.parse(line), hideBots);
                    }

                    const now = performance.now();
                    if (now - lastRender > 250) {
                        const rate = Math.round(scannedCount / ((now - startTime) / 1000));
                        statusEl.innerHTML = `Scanning... <b>${scannedCount.toLocaleString()}</b> games checked · <b>${allMatches.length}</b> titled matches found`;
                        speedEl.innerText = `${rate} games/sec`;
                        updateUI();
                        lastRender = now;
                    }
                }

                if (buffer.trim()) {
                    scannedCount++;
                    processGame(JSON.parse(buffer), hideBots);
                }

                updateUI();
                statusEl.innerHTML = `✅ Done! Scanned <b>${scannedCount.toLocaleString()}</b> games and found <b>${allMatches.length}</b> matches against titled players.`;
                if (allMatches.length > 0) document.getElementById('ltg-export').style.display = 'inline-block';

            } catch (err) {
                if (err.name === 'AbortError') {
                    statusEl.innerHTML = `⏹ Stopped after <b>${scannedCount.toLocaleString()}</b> games (${allMatches.length} titled matches found).`;
                    if (allMatches.length > 0) document.getElementById('ltg-export').style.display = 'inline-block';
                } else {
                    statusEl.innerHTML = `❌ Error: ${err.message}`;
                }
            } finally {
                abortController = null;
                startBtn.innerText = '▶ Scan Games';
                startBtn.style.background = '#629924';
            }
        };

        function processGame(game, hideBots) {
            const white = game.players?.white;
            const black = game.players?.black;
            if (!white || !black) return;

            const isWhite = white.user && white.user.id.toLowerCase() === targetUser.toLowerCase();
            const userSide = isWhite ? white : black;
            const oppSide = isWhite ? black : white;

            const title = oppSide.user?.title;
            if (!title) return;
            if (hideBots && title === 'BOT') return;

            let result = 'draw';
            if (game.winner) {
                const won = (game.winner === 'white' && isWhite) || (game.winner === 'black' && !isWhite);
                result = won ? 'win' : 'loss';
            }

            const dt = new Date(game.createdAt);
            allMatches.push({
                id: game.id,
                createdAt: game.createdAt,
                dateStr: dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
                dateISO: dt.toISOString().split('T')[0],
                oppTitle: title,
                oppName: oppSide.user.name,
                oppRating: oppSide.rating || null,
                userRating: userSide.rating || null,
                userColor: isWhite ? 'White' : 'Black',
                speed: game.speed,
                result
            });
        }

        function updateUI() {
            const total = allMatches.length;
            const wins = allMatches.filter(m => m.result === 'win').length;
            const draws = allMatches.filter(m => m.result === 'draw').length;
            const losses = allMatches.filter(m => m.result === 'loss').length;
            const scorePct = total ? (((wins + draws * 0.5) / total) * 100).toFixed(1) : '0.0';

            document.getElementById('kpi-total').innerText = total.toLocaleString();
            document.getElementById('kpi-pct').innerText = scannedCount ? `${((total / scannedCount) * 100).toFixed(2)}% of scanned` : '0% of scanned';
            document.getElementById('kpi-score').innerText = `${scorePct}%`;
            document.getElementById('kpi-wdl').innerText = `${wins}W · ${draws}D · ${losses}L`;

            // Average Opponent Rating & FIDE/Lichess Performance Rating Approximation
            const ratedGames = allMatches.filter(m => m.oppRating);
            if (ratedGames.length) {
                const avgOpp = Math.round(ratedGames.reduce((s, m) => s + m.oppRating, 0) / ratedGames.length);
                const pScore = (wins + draws * 0.5) / total;
                const dp = pScore >= 1 ? 800 : pScore <= 0 ? -800 : Math.round(-400 * Math.log10(1 / pScore - 1));
                document.getElementById('kpi-avgrating').innerText = avgOpp;
                document.getElementById('kpi-perf').innerText = `Est. Perf: ${avgOpp + dp}`;
            }

            // Best Scalp (Highest rated opponent defeated)
            const wonRated = allMatches.filter(m => m.result === 'win' && m.oppRating).sort((a, b) => b.oppRating - a.oppRating);
            if (wonRated.length) {
                const best = wonRated[0];
                document.getElementById('kpi-best').innerText = `${best.oppTitle} ${best.oppName}`;
                document.getElementById('kpi-best-sub').innerText = `Rated ${best.oppRating} (${best.speed})`;
            }

            // White vs Black Score %
            const wGames = allMatches.filter(m => m.userColor === 'White');
            const bGames = allMatches.filter(m => m.userColor === 'Black');
            const wPct = wGames.length ? Math.round(((wGames.filter(m => m.result === 'win').length + wGames.filter(m => m.result === 'draw').length * 0.5) / wGames.length) * 100) + '%' : '—';
            const bPct = bGames.length ? Math.round(((bGames.filter(m => m.result === 'win').length + bGames.filter(m => m.result === 'draw').length * 0.5) / bGames.length) * 100) + '%' : '—';
            document.getElementById('kpi-colors').innerText = `♔ ${wPct}  /  ♚ ${bPct}`;

            renderTitleBreakdown();
            renderMatchesTable();
        }

        function renderTitleBreakdown() {
            const tbody = document.getElementById('ltg-title-tbody');
            const groups = {};

            for (const m of allMatches) {
                if (!groups[m.oppTitle]) {
                    groups[m.oppTitle] = { title: m.oppTitle, games: 0, w: 0, d: 0, l: 0, oppRatings: [], userRatings: [], maxOpp: 0 };
                }
                const g = groups[m.oppTitle];
                g.games++;
                if (m.result === 'win') g.w++;
                else if (m.result === 'draw') g.d++;
                else g.l++;
                if (m.oppRating) {
                    g.oppRatings.push(m.oppRating);
                    if (m.oppRating > g.maxOpp) g.maxOpp = m.oppRating;
                }
                if (m.userRating) g.userRatings.push(m.userRating);
            }

            const sorted = Object.values(groups).sort((a, b) => {
                const ia = TITLE_ORDER.indexOf(a.title);
                const ib = TITLE_ORDER.indexOf(b.title);
                return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
            });

            if (!sorted.length) return;

            tbody.innerHTML = sorted.map(g => {
                const score = (((g.w + g.d * 0.5) / g.games) * 100).toFixed(1);
                const winPct = ((g.w / g.games) * 100).toFixed(1);
                const avgOpp = g.oppRatings.length ? Math.round(g.oppRatings.reduce((a, b) => a + b, 0) / g.oppRatings.length) : '—';
                const avgUser = g.userRatings.length ? Math.round(g.userRatings.reduce((a, b) => a + b, 0) / g.userRatings.length) : '—';
                const badgeBg = TITLE_COLORS[g.title] || '#8c735b';

                return `
                    <tr data-title="${g.title}" style="cursor: pointer;" title="Click to filter matches against ${g.title}">
                        <td><span class="ltg-badge" style="background:${badgeBg};">${g.title}</span></td>
                        <td><b>${g.games}</b></td>
                        <td><span style="color:#629924">${g.w}</span> / <span style="color:#bababa">${g.d}</span> / <span style="color:#cc3333">${g.l}</span></td>
                        <td><b>${score}%</b></td>
                        <td>${winPct}%</td>
                        <td><b>${avgOpp}</b></td>
                        <td style="color:#9e9a93;">${avgUser}</td>
                        <td>${g.maxOpp || '—'}</td>
                    </tr>
                `;
            }).join('');

            tbody.querySelectorAll('tr[data-title]').forEach(row => {
                row.onclick = () => {
                    selectedTitleFilter = row.dataset.title;
                    titleTag.innerText = `Title: ${selectedTitleFilter} ✕`;
                    titleTag.style.display = 'inline-block';
                    renderMatchesTable();
                };
            });
        }

        function renderMatchesTable() {
            const tbody = document.getElementById('ltg-games-tbody');
            const filtered = allMatches.filter(m => {
                if (selectedTitleFilter !== 'ALL' && m.oppTitle !== selectedTitleFilter) return false;
                if (selectedResultFilter !== 'all' && m.result !== selectedResultFilter) return false;
                return true;
            });

            document.getElementById('ltg-list-count').innerText = `(${filtered.length})`;

            if (!filtered.length) {
                tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#6e6a63; padding: 20px;">No matching games found</td></tr>`;
                return;
            }

            // Limit DOM rows to 300 for smooth scrolling (CSV export includes all)
            const displaySlice = filtered.slice(0, 300);
            tbody.innerHTML = displaySlice.map(m => {
                const badgeBg = TITLE_COLORS[m.oppTitle] || '#8c735b';
                const resBadge = m.result === 'win'
                    ? `<span style="color:#629924; font-weight:700;">Win (1-0)</span>`
                    : m.result === 'draw'
                        ? `<span style="color:#bababa; font-weight:700;">Draw (½-½)</span>`
                        : `<span style="color:#cc3333; font-weight:700;">Loss (0-1)</span>`;

                return `
                    <tr>
                        <td style="color:#8c8881; white-space:nowrap;">${m.dateStr}</td>
                        <td>
                            <span class="ltg-badge" style="background:${badgeBg}; margin-right:6px;">${m.oppTitle}</span>
                            <a href="https://lichess.org/@/${m.oppName}" target="_blank" style="color:#fff; text-decoration:none; font-weight:600;">${m.oppName}</a>
                            <span style="color:#8c8881; font-size:12px;">(${m.oppRating || '?'})</span>
                        </td>
                        <td style="color:#9e9a93;">${m.userRating || '—'}</td>
                        <td>${m.userColor === 'White' ? '♔ White' : '♚ Black'}</td>
                        <td style="text-transform:capitalize; color:#9e9a93;">${m.speed}</td>
                        <td>${resBadge}</td>
                        <td><a href="https://lichess.org/${m.id}" target="_blank" style="color:#3692e7; text-decoration:none; font-weight:600;">View ↗</a></td>
                    </tr>
                `;
            }).join('');
        }
    }
})();
