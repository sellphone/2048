// 处理 HTML 页面和 API 请求
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 处理 API：获取最高分
    if (path === '/api/highscore' && request.method === 'GET') {
      try {
        const result = await env.DB.prepare('SELECT score FROM scores WHERE id = 1').first();
        const highScore = result ? result.score : 0;
        return new Response(JSON.stringify({ highScore }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'DB error' }), { status: 500 });
      }
    }

    // 处理 API：更新最高分（只有当新分数更高时才更新）
    if (path === '/api/highscore' && request.method === 'POST') {
      try {
        const { score } = await request.json();
        // 先查询当前最高分
        const current = await env.DB.prepare('SELECT score FROM scores WHERE id = 1').first();
        const currentScore = current ? current.score : 0;
        let updated = false;
        if (score > currentScore) {
          await env.DB.prepare('UPDATE scores SET score = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1').bind(score).run();
          updated = true;
        }
        return new Response(JSON.stringify({ updated, highScore: Math.max(score, currentScore) }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Update failed' }), { status: 500 });
      }
    }

    // 其他所有路径：返回 2048 游戏页面
    const html = `<!DOCTYPE html>
<html lang="zh">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>2048 - Cloudflare 版</title>
    <style>
        * {
            box-sizing: border-box;
            user-select: none;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #faf8ef;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
        }
        .container {
            width: 100%;
            max-width: 500px;
            background: #bbada0;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 8px 20px rgba(0,0,0,0.1);
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        h1 {
            font-size: 60px;
            margin: 0;
            color: #eee4da;
            font-weight: bold;
            line-height: 1;
        }
        .scores {
            display: flex;
            gap: 15px;
        }
        .score-box {
            background: #bbada0;
            background: rgba(238, 228, 218, 0.35);
            padding: 8px 16px;
            border-radius: 8px;
            text-align: center;
            color: #fff;
            font-weight: bold;
        }
        .score-label {
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .score-value {
            font-size: 28px;
            font-weight: bold;
            line-height: 1;
        }
        .new-game {
            background: #8f7a66;
            border: none;
            color: #f9f6f2;
            font-size: 18px;
            font-weight: bold;
            padding: 8px 20px;
            border-radius: 6px;
            cursor: pointer;
            transition: background 0.2s;
        }
        .new-game:hover {
            background: #9f8b76;
        }
        .grid-container {
            background: #cdc1b4;
            border-radius: 12px;
            padding: 10px;
            margin-top: 10px;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            aspect-ratio: 1 / 1;
        }
        .cell {
            background: rgba(238, 228, 218, 0.35);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            font-weight: bold;
            color: #776e65;
            transition: all 0.1s ease;
        }
        .cell[data-value="2"] { background: #eee4da; color: #776e65; }
        .cell[data-value="4"] { background: #ede0c8; color: #776e65; }
        .cell[data-value="8"] { background: #f2b179; color: #f9f6f2; }
        .cell[data-value="16"] { background: #f59563; color: #f9f6f2; }
        .cell[data-value="32"] { background: #f67c5f; color: #f9f6f2; }
        .cell[data-value="64"] { background: #f65e3b; color: #f9f6f2; }
        .cell[data-value="128"] { background: #edcf72; color: #f9f6f2; font-size: 28px; }
        .cell[data-value="256"] { background: #edcc61; color: #f9f6f2; font-size: 28px; }
        .cell[data-value="512"] { background: #edc850; color: #f9f6f2; font-size: 28px; }
        .cell[data-value="1024"] { background: #edc53f; color: #f9f6f2; font-size: 24px; }
        .cell[data-value="2048"] { background: #edc22e; color: #f9f6f2; font-size: 24px; }
        .game-message {
            margin-top: 20px;
            text-align: center;
            font-size: 20px;
            font-weight: bold;
            color: #776e65;
            min-height: 50px;
        }
        @media (max-width: 480px) {
            .cell { font-size: 24px; }
            .cell[data-value="128"], .cell[data-value="256"], .cell[data-value="512"] { font-size: 20px; }
            .cell[data-value="1024"], .cell[data-value="2048"] { font-size: 18px; }
            h1 { font-size: 44px; }
        }
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <h1>2048</h1>
        <div class="scores">
            <div class="score-box">
                <div class="score-label">SCORE</div>
                <div class="score-value" id="current-score">0</div>
            </div>
            <div class="score-box">
                <div class="score-label">BEST</div>
                <div class="score-value" id="best-score">0</div>
            </div>
        </div>
        <button class="new-game" id="new-game-btn">NEW GAME</button>
    </div>
    <div class="grid-container">
        <div class="grid" id="grid"></div>
    </div>
    <div class="game-message" id="message"></div>
</div>

<script>
    // ---------- 游戏核心逻辑 ----------
    let board = [
        [0,0,0,0],
        [0,0,0,0],
        [0,0,0,0],
        [0,0,0,0]
    ];
    let score = 0;
    let bestScore = 0;
    let gameOver = false;

    // 获取 DOM 元素
    const gridContainer = document.getElementById('grid');
    const currentScoreSpan = document.getElementById('current-score');
    const bestScoreSpan = document.getElementById('best-score');
    const messageDiv = document.getElementById('message');

    // 初始化新游戏
    function initGame() {
        board = [
            [0,0,0,0],
            [0,0,0,0],
            [0,0,0,0],
            [0,0,0,0]
        ];
        score = 0;
        gameOver = false;
        messageDiv.innerText = '';
        addRandomTile();
        addRandomTile();
        updateUI();
        updateBestFromServer(); // 从服务器拉取最高分
    }

    // 添加随机数字 2 或 4
    function addRandomTile() {
        let emptyCells = [];
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (board[i][j] === 0) emptyCells.push({x:i, y:j});
            }
        }
        if (emptyCells.length === 0) return;
        let {x, y} = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        board[x][y] = Math.random() < 0.9 ? 2 : 4;
    }

    // 更新界面
    function updateUI() {
        // 更新网格
        const cells = document.querySelectorAll('.cell');
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                const val = board[i][j];
                const idx = i * 4 + j;
                const cell = cells[idx];
                if (val === 0) {
                    cell.innerText = '';
                    cell.setAttribute('data-value', '0');
                } else {
                    cell.innerText = val;
                    cell.setAttribute('data-value', val);
                }
            }
        }
        currentScoreSpan.innerText = score;
        bestScoreSpan.innerText = bestScore;
    }

    // 核心移动逻辑（左移）
    function moveLeft() {
        let moved = false;
        let newBoard = board.map(row => [...row]);
        let gainedScore = 0;
        for (let i = 0; i < 4; i++) {
            let row = board[i].filter(v => v !== 0);
            let newRow = [];
            for (let j = 0; j < row.length; j++) {
                if (j+1 < row.length && row[j] === row[j+1]) {
                    let merged = row[j] * 2;
                    newRow.push(merged);
                    gainedScore += merged;
                    j++;
                } else {
                    newRow.push(row[j]);
                }
            }
            while (newRow.length < 4) newRow.push(0);
            if (JSON.stringify(newRow) !== JSON.stringify(board[i])) moved = true;
            newBoard[i] = newRow;
        }
        if (moved) {
            score += gainedScore;
            board = newBoard;
            addRandomTile();
            checkGameOver();
        }
        return moved;
    }

    function moveRight() {
        // 通过反转行实现右移
        board = board.map(row => [...row].reverse());
        let moved = moveLeft();
        board = board.map(row => [...row].reverse());
        if (moved) {
            updateUI();
            syncBestScore();
        }
        return moved;
    }

    function moveUp() {
        // 转置后左移
        board = transpose(board);
        let moved = moveLeft();
        board = transpose(board);
        if (moved) {
            updateUI();
            syncBestScore();
        }
        return moved;
    }

    function moveDown() {
        board = transpose(board);
        board = board.map(row => [...row].reverse());
        let moved = moveLeft();
        board = board.map(row => [...row].reverse());
        board = transpose(board);
        if (moved) {
            updateUI();
            syncBestScore();
        }
        return moved;
    }

    function transpose(matrix) {
        return matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]));
    }

    function checkGameOver() {
        // 检查是否还能移动
        let canMove = false;
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (board[i][j] === 0) canMove = true;
                if (j<3 && board[i][j] === board[i][j+1]) canMove = true;
                if (i<3 && board[i][j] === board[i+1][j]) canMove = true;
            }
        }
        if (!canMove) {
            gameOver = true;
            messageDiv.innerText = 'GAME OVER! 点击 NEW GAME';
        } else {
            // 检查是否达到2048胜利消息
            let maxVal = Math.max(...board.flat());
            if (maxVal >= 2048 && !messageDiv.innerText.includes('WIN')) {
                messageDiv.innerText = '✨ 你赢了！继续玩吧 ✨';
            }
        }
        updateUI();
    }

    // 每次得分后，检查是否超过当前 bestScore，如果超过则更新本地并提交到服务器
    async function syncBestScore() {
        if (score > bestScore) {
            bestScore = score;
            bestScoreSpan.innerText = bestScore;
            // 提交到服务器（如果大于当前存储的全局最高分）
            try {
                const res = await fetch('/api/highscore', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ score: bestScore })
                });
                const data = await res.json();
                if (data.updated) {
                    console.log('新纪录已同步');
                } else if (data.highScore > bestScore) {
                    // 服务器有更高的分数（可能同时游玩?）
                    bestScore = data.highScore;
                    bestScoreSpan.innerText = bestScore;
                }
            } catch(e) { console.error('同步失败', e); }
        }
    }

    // 从服务器获取最高分
    async function updateBestFromServer() {
        try {
            const res = await fetch('/api/highscore');
            const data = await res.json();
            if (data.highScore > bestScore) {
                bestScore = data.highScore;
                bestScoreSpan.innerText = bestScore;
            }
        } catch(e) { console.error('获取最高分失败', e); }
    }

    // 键盘控制
    function handleKey(e) {
        if (gameOver) return;
        let moved = false;
        switch(e.key) {
            case 'ArrowLeft': moved = moveLeft(); break;
            case 'ArrowRight': moved = moveRight(); break;
            case 'ArrowUp': moved = moveUp(); break;
            case 'ArrowDown': moved = moveDown(); break;
            default: return;
        }
        e.preventDefault();
        if (moved) {
            updateUI();
            syncBestScore();
        }
    }

    // 触摸滑动支持（简单）
    let touchStart = null;
    function handleTouchStart(e) {
        touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    function handleTouchEnd(e) {
        if (!touchStart || gameOver) return;
        let dx = e.changedTouches[0].clientX - touchStart.x;
        let dy = e.changedTouches[0].clientY - touchStart.y;
        if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
        let moved = false;
        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0) moved = moveRight();
            else moved = moveLeft();
        } else {
            if (dy > 0) moved = moveDown();
            else moved = moveUp();
        }
        if (moved) {
            updateUI();
            syncBestScore();
        }
        touchStart = null;
    }

    // 渲染网格（首次创建）
    function renderGrid() {
        gridContainer.innerHTML = '';
        for (let i = 0; i < 16; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.setAttribute('data-value', '0');
            gridContainer.appendChild(cell);
        }
    }

    // 启动
    window.addEventListener('load', async () => {
        renderGrid();
        await updateBestFromServer();
        initGame();
        window.addEventListener('keydown', handleKey);
        gridContainer.addEventListener('touchstart', handleTouchStart);
        gridContainer.addEventListener('touchend', handleTouchEnd);
        document.getElementById('new-game-btn').addEventListener('click', () => {
            initGame();
            gameOver = false;
            messageDiv.innerText = '';
        });
    });
</script>
</body>
</html>`;
    
    return new Response(html, {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' },
    });
  }
};