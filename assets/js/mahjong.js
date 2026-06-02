// 麻将三缺一 - 完整游戏逻辑
(function(){
    // 麻将牌型定义
    const TILES = {
        // 万牌
        wan: ['1万','2万','3万','4万','5万','6万','7万','8万','9万'],
        // 条牌
        tiao: ['1条','2条','3条','4条','5条','6条','7条','8条','9条'],
        // 筒牌
        tong: ['1筒','2筒','3筒','4筒','5筒','6筒','7筒','8筒','9筒'],
        // 字牌
        zi: ['东','南','西','北','中','发','白']
    };

    // 牌值映射（用于排序）
    const TILE_VALUE = {};
    let valCounter = 1;
    for(let type of ['wan','tiao','tong']) {
        for(let i=1;i<=9;i++) {
            TILE_VALUE[`${type}_${i}`] = valCounter++;
        }
    }
    for(let zi of TILES.zi) {
        TILE_VALUE[`zi_${zi}`] = valCounter++;
    }

    class MahjongTile {
        constructor(type, name, id) {
            this.type = type;      // 'wan', 'tiao', 'tong', 'zi'
            this.name = name;      // 显示名称
            this.id = id;          // 唯一标识
            this.value = TILE_VALUE[`${type}_${name}`] || 0;
        }

        getDisplay() {
            let symbol = '';
            if(this.type === 'wan') symbol = '🀇';
            else if(this.type === 'tiao') symbol = '🀐';
            else if(this.type === 'tong') symbol = '🀙';
            else symbol = '🀆';
            return `${symbol} ${this.name}`;
        }

        getShort() {
            return this.name;
        }
    }

    // 创建一副麻将牌（每张4张，共136张）
    function createDeck() {
        let deck = [];
        let id = 1;
        for(let type of ['wan','tiao','tong']) {
            for(let name of TILES[type]) {
                for(let i=0;i<4;i++) {
                    deck.push(new MahjongTile(type, name, id++));
                }
            }
        }
        for(let name of TILES.zi) {
            for(let i=0;i<4;i++) {
                deck.push(new MahjongTile('zi', name, id++));
            }
        }
        return shuffle(deck);
    }

    function shuffle(deck) {
        for(let i=deck.length-1;i>0;i--) {
            let j = Math.floor(Math.random()*(i+1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    }

    // 游戏状态
    let game = {
        deck: [],
        players: [[], [], []],  // 0:玩家, 1:AI左, 2:AI上
        currentTurn: 0,          // 当前出牌玩家
        lastDiscard: null,       // 最后打出的牌
        lastDiscardBy: -1,       // 最后打出的玩家
        gameStarted: false,
        gameOver: false,
        winner: -1,
        selectedTileIndex: -1,    // 玩家选中的手牌索引
        canPeng: false,           // 是否可以碰
        canGang: false,           // 是否可以杠
        canHu: false,             // 是否可以胡
        pengFrom: -1,             // 碰的来源玩家
        gangFrom: -1,             // 杠的来源玩家
        huFrom: -1,               // 胡的来源玩家
        waitForAction: false,     // 等待玩家选择碰/杠/胡
        pendingTile: null,        // 待操作的牌
        pendingFrom: -1,          // 操作来源
        gameLog: []
    };

    let canvas = document.getElementById('gameCanvas');
    let ctx = canvas.getContext('2d');

    // 辅助函数
    function addLog(msg) {
        game.gameLog.unshift(msg);
        if(game.gameLog.length > 5) game.gameLog.pop();
    }

    // 检查是否可以碰（需要两张相同的牌）
    function checkPeng(hand, tile) {
        let count = hand.filter(t => t.name === tile.name && t.type === tile.type).length;
        return count >= 2;
    }

    // 检查是否可以杠（需要三张相同的牌）
    function checkGang(hand, tile) {
        let count = hand.filter(t => t.name === tile.name && t.type === tile.type).length;
        return count >= 3;
    }

    // 简化胡牌检查（这里实现一个基础的胡牌判断，用于演示）
    function checkHu(hand, newTile) {
        let allTiles = [...hand, newTile];
        // 按类型和点数排序
        let sorted = [...allTiles].sort((a,b) => a.value - b.value);
        
        // 检查七对
        let isSevenPairs = true;
        for(let i=0;i<sorted.length;i+=2) {
            if(i+1 >= sorted.length || sorted[i].name !== sorted[i+1].name || sorted[i].type !== sorted[i+1].type) {
                isSevenPairs = false;
                break;
            }
        }
        if(isSevenPairs && sorted.length === 14) return true;

        // 标准胡牌：4组面子+1对将（简化版，用于演示）
        // 实际麻将胡牌逻辑较复杂，这里做一个简化但可玩的版本
        return checkStandardHu(sorted);
    }

    function checkStandardHu(tiles) {
        if(tiles.length !== 14) return false;
        
        // 统计每张牌的数量
        let tileMap = new Map();
        for(let t of tiles) {
            let key = `${t.type}_${t.name}`;
            tileMap.set(key, (tileMap.get(key) || 0) + 1);
        }
        
        // 尝试找将牌
        for(let [key, count] of tileMap) {
            if(count >= 2) {
                let newMap = new Map(tileMap);
                newMap.set(key, count - 2);
                if(newMap.get(key) === 0) newMap.delete(key);
                if(tryFormMelds(newMap)) return true;
            }
        }
        return false;
    }

    function tryFormMelds(tileMap) {
        if(tileMap.size === 0) return true;
        
        // 获取第一张牌
        let firstKey = tileMap.keys().next().value;
        let [type, name] = firstKey.split('_');
        let count = tileMap.get(firstKey);
        
        // 尝试刻子
        if(count >= 3) {
            let newMap = new Map(tileMap);
            newMap.set(firstKey, count - 3);
            if(newMap.get(firstKey) === 0) newMap.delete(firstKey);
            if(tryFormMelds(newMap)) return true;
        }
        
        // 尝试顺子（只有万条筒可以形成顺子）
        if(type !== 'zi') {
            let num = parseInt(name);
            if(num <= 7) {
                let nextKey1 = `${type}_${num+1}`;
                let nextKey2 = `${type}_${num+2}`;
                if(tileMap.has(nextKey1) && tileMap.has(nextKey2)) {
                    let newMap = new Map(tileMap);
                    newMap.set(firstKey, count - 1);
                    if(newMap.get(firstKey) === 0) newMap.delete(firstKey);
                    newMap.set(nextKey1, tileMap.get(nextKey1) - 1);
                    if(newMap.get(nextKey1) === 0) newMap.delete(nextKey1);
                    newMap.set(nextKey2, tileMap.get(nextKey2) - 1);
                    if(newMap.get(nextKey2) === 0) newMap.delete(nextKey2);
                    if(tryFormMelds(newMap)) return true;
                }
            }
        }
        return false;
    }

    // 发牌
    function deal() {
        let fullDeck = createDeck();
        game.deck = fullDeck;
        
        // 每人发13张牌
        for(let i=0;i<3;i++) {
            game.players[i] = [];
            for(let j=0;j<13;j++) {
                game.players[i].push(game.deck.pop());
            }
            sortHand(game.players[i]);
        }
        
        // 庄家（玩家）多拿一张
        let firstTile = game.deck.pop();
        game.players[0].push(firstTile);
        sortHand(game.players[0]);
        
        game.currentTurn = 0;
        game.gameStarted = true;
        game.gameOver = false;
        game.winner = -1;
        game.lastDiscard = null;
        game.lastDiscardBy = -1;
        game.selectedTileIndex = -1;
        game.waitForAction = false;
        game.canPeng = false;
        game.canGang = false;
        game.canHu = false;
        
        addLog("游戏开始！庄家先出牌");
        drawGame();
        updateStatusMessage();
    }

    function sortHand(hand) {
        hand.sort((a,b) => a.value - b.value);
    }

    // 玩家出牌
    function playerDiscard() {
        if(!game.gameStarted || game.gameOver) return;
        if(game.currentTurn !== 0) {
            addLog("请等待你的回合");
            return;
        }
        if(game.selectedTileIndex === -1) {
            addLog("请先选中一张牌");
            return;
        }
        
        let tile = game.players[0][game.selectedTileIndex];
        if(!tile) return;
        
        // 打出牌
        game.players[0].splice(game.selectedTileIndex, 1);
        game.lastDiscard = tile;
        game.lastDiscardBy = 0;
        game.selectedTileIndex = -1;
        addLog(`玩家打出 ${tile.getShort()}`);
        
        // 检查胡牌
        if(game.players[0].length === 0) {
            game.gameOver = true;
            game.winner = 0;
            addLog("🎉 玩家自摸胡牌！胜利！ 🎉");
            drawGame();
            updateStatusMessage();
            return;
        }
        
        // 检查其他玩家是否可以碰/杠/胡
        checkOtherPlayersAction(tile, 0);
        
        if(!game.waitForAction) {
            // 没有玩家操作，轮到下一个玩家
            game.currentTurn = (game.currentTurn + 1) % 3;
            drawGame();
            updateStatusMessage();
            if(game.currentTurn !== 0 && !game.gameOver) {
                setTimeout(() => aiTurn(), 300);
            }
        } else {
            drawGame();
            updateStatusMessage();
        }
    }

    // 检查其他玩家是否可以操作
    function checkOtherPlayersAction(tile, fromPlayer) {
        game.canPeng = false;
        game.canGang = false;
        game.canHu = false;
        game.waitForAction = false;
        game.pendingTile = tile;
        game.pendingFrom = fromPlayer;
        
        // 按顺序检查（下家优先）
        for(let i=1;i<=2;i++) {
            let playerIdx = (fromPlayer + i) % 3;
            if(playerIdx === 0) continue; // 跳过玩家自己
            
            let hand = game.players[playerIdx];
            
            // 检查胡牌
            if(checkHu(hand, tile)) {
                game.canHu = true;
                game.huFrom = playerIdx;
                game.waitForAction = true;
                if(playerIdx === 0) {
                    addLog("可以胡牌！");
                }
                return;
            }
            
            // 检查碰
            if(checkPeng(hand, tile)) {
                game.canPeng = true;
                game.pengFrom = playerIdx;
                game.waitForAction = true;
                if(playerIdx === 0) {
                    addLog("可以碰！");
                }
                return;
            }
            
            // 检查杠
            if(checkGang(hand, tile)) {
                game.canGang = true;
                game.gangFrom = playerIdx;
                game.waitForAction = true;
                if(playerIdx === 0) {
                    addLog("可以杠！");
                }
                return;
            }
        }
    }

    // 玩家碰
    function playerPeng() {
        if(!game.waitForAction || !game.canPeng) return;
        if(game.pengFrom !== 0) return;
        
        let tile = game.pendingTile;
        if(!tile) return;
        
        // 从手牌中找到两张相同的牌
        let indices = [];
        for(let i=0;i<game.players[0].length;i++) {
            if(game.players[0][i].name === tile.name && game.players[0][i].type === tile.type) {
                indices.push(i);
                if(indices.length === 2) break;
            }
        }
        
        if(indices.length === 2) {
            // 移除这两张牌
            for(let i=indices.length-1;i>=0;i--) {
                game.players[0].splice(indices[i], 1);
            }
            addLog(`玩家碰 ${tile.getShort()}`);
            
            // 碰后轮到玩家出牌
            game.currentTurn = 0;
            game.waitForAction = false;
            game.canPeng = false;
            game.canGang = false;
            game.canHu = false;
            game.lastDiscard = null;
            
            drawGame();
            updateStatusMessage();
        }
    }

    // 玩家杠
    function playerGang() {
        if(!game.waitForAction || !game.canGang) return;
        if(game.gangFrom !== 0) return;
        
        let tile = game.pendingTile;
        if(!tile) return;
        
        // 从手牌中找到三张相同的牌
        let indices = [];
        for(let i=0;i<game.players[0].length;i++) {
            if(game.players[0][i].name === tile.name && game.players[0][i].type === tile.type) {
                indices.push(i);
                if(indices.length === 3) break;
            }
        }
        
        if(indices.length === 3) {
            for(let i=indices.length-1;i>=0;i--) {
                game.players[0].splice(indices[i], 1);
            }
            addLog(`玩家杠 ${tile.getShort()}`);
            
            // 杠后补摸一张牌
            if(game.deck.length > 0) {
                let newTile = game.deck.pop();
                game.players[0].push(newTile);
                sortHand(game.players[0]);
                addLog(`补摸一张牌`);
            }
            
            game.currentTurn = 0;
            game.waitForAction = false;
            game.canPeng = false;
            game.canGang = false;
            game.canHu = false;
            game.lastDiscard = null;
            
            drawGame();
            updateStatusMessage();
        }
    }

    // 玩家胡
    function playerHu() {
        if(!game.waitForAction || !game.canHu) return;
        if(game.huFrom !== 0) return;
        
        let tile = game.pendingTile;
        if(!tile) return;
        
        // 将胡的牌加入手牌
        game.players[0].push(tile);
        sortHand(game.players[0]);
        
        game.gameOver = true;
        game.winner = 0;
        addLog(`🎉 玩家胡牌！胜利！ 🎉`);
        
        drawGame();
        updateStatusMessage();
    }

    // 玩家过牌（不碰/不杠/不胡）
    function playerPass() {
        if(!game.waitForAction) return;
        
        game.waitForAction = false;
        game.canPeng = false;
        game.canGang = false;
        game.canHu = false;
        
        addLog("玩家放弃操作");
        
        // 轮到下一个玩家
        game.currentTurn = (game.pendingFrom + 1) % 3;
        game.lastDiscard = null;
        
        drawGame();
        updateStatusMessage();
        
        if(game.currentTurn !== 0 && !game.gameOver) {
            setTimeout(() => aiTurn(), 300);
        }
    }

    // AI回合
    function aiTurn() {
        if(!game.gameStarted || game.gameOver) return;
        if(game.currentTurn === 0) return;
        if(game.waitForAction) return;
        
        let aiIdx = game.currentTurn;
        let hand = game.players[aiIdx];
        
        // AI简单的出牌逻辑：打出最小的牌
        if(hand.length > 0) {
            let tile = hand[0];
            game.players[aiIdx].splice(0, 1);
            game.lastDiscard = tile;
            game.lastDiscardBy = aiIdx;
            addLog(`AI${aiIdx === 1 ? '右' : '上'} 打出 ${tile.getShort()}`);
            
            // 检查是否可以胡
            if(hand.length === 0) {
                game.gameOver = true;
                game.winner = aiIdx;
                addLog(`AI${aiIdx === 1 ? '右' : '上'} 自摸胡牌！`);
                drawGame();
                updateStatusMessage();
                return;
            }
            
            // 检查其他玩家操作
            checkOtherPlayersAction(tile, aiIdx);
            
            if(!game.waitForAction) {
                game.currentTurn = (aiIdx + 1) % 3;
                drawGame();
                updateStatusMessage();
                if(game.currentTurn === 0 && !game.gameOver) {
                    addLog("轮到你了");
                } else if(!game.gameOver) {
                    setTimeout(() => aiTurn(), 400);
                }
            } else {
                drawGame();
                updateStatusMessage();
            }
        }
    }

    function updateStatusMessage() {
        if(game.gameOver) {
            let winnerName = game.winner === 0 ? "玩家" : (game.winner === 1 ? "右AI" : "上AI");
            document.getElementById('gameStatusDisplay').innerHTML = `🏆 ${winnerName} 获胜！ 🏆`;
            document.getElementById('statusMessage').innerHTML = `游戏结束，${winnerName}胡牌！点击【发牌】继续`;
            return;
        }
        
        if(!game.gameStarted) {
            document.getElementById('gameStatusDisplay').innerHTML = "🀄 麻将三缺一";
            document.getElementById('statusMessage').innerHTML = "✨ 点击【发牌】开始游戏 ✨";
            return;
        }
        
        if(game.waitForAction) {
            let actions = [];
            if(game.canHu) actions.push("胡");
            if(game.canPeng) actions.push("碰");
            if(game.canGang) actions.push("杠");
            document.getElementById('statusMessage').innerHTML = `🎯 可以${actions.join('/')}！选择操作`;
            document.getElementById('gameStatusDisplay').innerHTML = `🀆 等待操作 - ${actions.join('/')}`;
            return;
        }
        
        let turnName = game.currentTurn === 0 ? "👤 你的回合" : (game.currentTurn === 1 ? "🤖 右AI思考" : "🤖 上AI回合");
        document.getElementById('gameStatusDisplay').innerHTML = `📢 ${turnName}`;
        document.getElementById('statusMessage').innerHTML = game.currentTurn === 0 ? "🎯 单击手牌选中，点【出牌】" : "🤖 AI 思考中...";
        
        if(game.currentTurn !== 0 && !game.gameOver && !game.waitForAction) {
            setTimeout(() => aiTurn(), 300);
        }
    }

    function drawGame() {
        if(!ctx) return;
        ctx.clearRect(0,0,1000,600);
        ctx.fillStyle="#1e3a1e";
        ctx.fillRect(0,0,1000,600);
        
        // 绘制桌布图案
        ctx.fillStyle = "#2d6a4f";
        for(let i=0;i<10;i++) {
            ctx.beginPath();
            ctx.arc(500 + (i%5)*80 - 200, 280 + Math.floor(i/5)*100, 25, 0, Math.PI*2);
            ctx.fillStyle = "#40916c";
            ctx.fill();
        }
        
        // 绘制玩家手牌
        let hand = game.players[0];
        let cardW = 68, cardH = 88;
        let startX = (1000 - (hand.length * (cardW + 4))) / 2;
        for(let i=0;i<hand.length;i++) {
            let x = startX + i * (cardW + 6);
            let y = 480;
            let isSelected = (game.selectedTileIndex === i);
            ctx.fillStyle = isSelected ? "#ffe6b3" : "#fef5e0";
            ctx.fillRect(x, y, cardW, cardH);
            ctx.strokeStyle = "#a55d35";
            ctx.strokeRect(x, y, cardW, cardH);
            ctx.fillStyle = "#2c1e12";
            ctx.font = "bold 18px 'Segoe UI'";
            ctx.fillText(hand[i].getShort(), x+8, y+45);
        }
        
        // 绘制AI手牌（背面）
        let aiRight = game.players[1];
        for(let i=0;i<Math.min(aiRight.length, 12);i++) {
            ctx.fillStyle = "#2c5e6b";
            ctx.fillRect(740 + i*20, 100, 58, 78);
            ctx.fillStyle = "#a0aec0";
            ctx.font = "14px monospace";
            ctx.fillText("🀆", 755 + i*20, 148);
        }
        
        let aiTop = game.players[2];
        for(let i=0;i<Math.min(aiTop.length, 12);i++) {
            ctx.fillStyle = "#2c5e6b";
            ctx.fillRect(80 + i*20, 30, 58, 78);
            ctx.fillStyle = "#a0aec0";
            ctx.fillText("🀆", 95 + i*20, 78);
        }
        
        // 显示最后打出的牌
        if(game.lastDiscard) {
            ctx.fillStyle = "#fef5e0";
            ctx.fillRect(460, 240, 80, 100);
            ctx.strokeStyle = "#a55d35";
            ctx.strokeRect(460, 240, 80, 100);
            ctx.fillStyle = "#2c1e12";
            ctx.font = "bold 16px 'Segoe UI'";
            ctx.fillText(game.lastDiscard.getShort(), 478, 295);
            ctx.fillStyle = "#ffd700";
            ctx.font = "12px monospace";
            ctx.fillText("上家", 478, 235);
        }
        
        // 显示日志
        ctx.font = "12px monospace";
        ctx.fillStyle = "#c9d1d9";
        for(let i=0;i<Math.min(game.gameLog.length, 4);i++) {
            ctx.fillText(game.gameLog[i], 20, 570 - i*15);
        }
        
        // 显示手牌数
        ctx.font = "14px system-ui";
        ctx.fillStyle = "#f9e7b3";
        ctx.fillText(`你:${game.players[0].length} 右:${game.players[1].length} 上:${game.players[2].length}`, 40, 570);
        ctx.fillText(`剩余牌: ${game.deck.length}`, 40, 590);
    }

    // 点击选牌
    canvas.addEventListener('click', (e) => {
        if(!game.gameStarted || game.gameOver) return;
        if(game.currentTurn !== 0) return;
        if(game.waitForAction) return;
        
        let rect = canvas.getBoundingClientRect();
        let scaleX = canvas.width / rect.width;
        let scaleY = canvas.height / rect.height;
        let clickX = (e.clientX - rect.left) * scaleX;
        let clickY = (e.clientY - rect.top) * scaleY;
        
        let hand = game.players[0];
        let cardW = 68, cardH = 88;
        let startX = (1000 - (hand.length * (cardW + 4))) / 2;
        
        for(let i=0;i<hand.length;i++) {
            let x = startX + i * (cardW + 6);
            let y = 480;
            if(clickX >= x && clickX <= x + cardW && clickY >= y && clickY <= y + cardH) {
                if(game.selectedTileIndex === i) {
                    game.selectedTileIndex = -1;
                } else {
                    game.selectedTileIndex = i;
                }
                drawGame();
                break;
            }
        }
    });

    // 按钮事件绑定
    document.getElementById('btnStart').addEventListener('click', () => {
        deal();
        drawGame();
        updateStatusMessage();
    });
    
    document.getElementById('btnDiscard').addEventListener('click', () => {
        playerDiscard();
        drawGame();
        updateStatusMessage();
    });
    
    document.getElementById('btnPeng').addEventListener('click', () => {
        playerPeng();
        drawGame();
        updateStatusMessage();
    });
    
    document.getElementById('btnGang').addEventListener('click', () => {
        playerGang();
        drawGame();
        updateStatusMessage();
    });
    
    document.getElementById('btnHu').addEventListener('click', () => {
        playerHu();
        drawGame();
        updateStatusMessage();
    });
    
    document.getElementById('btnPass').addEventListener('click', () => {
        playerPass();
        drawGame();
        updateStatusMessage();
    });
    
    // 初始化显示
    drawGame();
    updateStatusMessage();
})();
