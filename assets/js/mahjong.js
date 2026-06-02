// 麻将三缺一 - 完整修复版（AI自动操作+碰杠胡响应）
(function(){
    const TILES = {
        wan: ['1万','2万','3万','4万','5万','6万','7万','8万','9万'],
        tiao: ['1条','2条','3条','4条','5条','6条','7条','8条','9条'],
        tong: ['1筒','2筒','3筒','4筒','5筒','6筒','7筒','8筒','9筒'],
        zi: ['东','南','西','北','中','发','白']
    };

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
            this.type = type;
            this.name = name;
            this.id = id;
            this.value = TILE_VALUE[`${type}_${name}`] || 0;
        }
        getShort() { return this.name; }
    }

    function createDeck() {
        let deck = [];
        let id = 1;
        for(let type of ['wan','tiao','tong']) {
            for(let name of TILES[type]) {
                for(let i=0;i<4;i++) deck.push(new MahjongTile(type, name, id++));
            }
        }
        for(let name of TILES.zi) {
            for(let i=0;i<4;i++) deck.push(new MahjongTile('zi', name, id++));
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

    let game = {
        deck: [],
        players: [[], [], []],
        currentTurn: 0,
        lastDiscard: null,
        lastDiscardBy: -1,
        gameStarted: false,
        gameOver: false,
        winner: -1,
        selectedTileIndex: -1,
        canPeng: false,
        canGang: false,
        canHu: false,
        pengFrom: -1,
        gangFrom: -1,
        huFrom: -1,
        waitForAction: false,
        pendingTile: null,
        pendingFrom: -1,
        gameLog: []
    };

    let canvas = document.getElementById('gameCanvas');
    let ctx = canvas.getContext('2d');

    function addLog(msg) {
        game.gameLog.unshift(msg);
        if(game.gameLog.length > 5) game.gameLog.pop();
    }

    function sortHand(hand) {
        hand.sort((a,b)=>a.value - b.value);
    }

    function checkPeng(hand, tile) {
        let count = hand.filter(t => t.name === tile.name && t.type === tile.type).length;
        return count >= 2;
    }

    function checkGang(hand, tile) {
        let count = hand.filter(t => t.name === tile.name && t.type === tile.type).length;
        return count >= 3;
    }

    function checkHu(hand, newTile) {
        let allTiles = [...hand, newTile];
        let sorted = [...allTiles].sort((a,b)=>a.value - b.value);
        let isSevenPairs = true;
        for(let i=0;i<sorted.length;i+=2) {
            if(i+1 >= sorted.length || sorted[i].name !== sorted[i+1].name || sorted[i].type !== sorted[i+1].type) {
                isSevenPairs = false;
                break;
            }
        }
        if(isSevenPairs && sorted.length === 14) return true;
        return checkStandardHu(sorted);
    }

    function checkStandardHu(tiles) {
        if(tiles.length !== 14) return false;
        let tileMap = new Map();
        for(let t of tiles) {
            let key = `${t.type}_${t.name}`;
            tileMap.set(key, (tileMap.get(key) || 0) + 1);
        }
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
        let firstKey = tileMap.keys().next().value;
        let [type, name] = firstKey.split('_');
        let count = tileMap.get(firstKey);
        if(count >= 3) {
            let newMap = new Map(tileMap);
            newMap.set(firstKey, count - 3);
            if(newMap.get(firstKey) === 0) newMap.delete(firstKey);
            if(tryFormMelds(newMap)) return true;
        }
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

    function deal() {
        let fullDeck = createDeck();
        game.deck = fullDeck;
        for(let i=0;i<3;i++) {
            game.players[i] = [];
            for(let j=0;j<13;j++) game.players[i].push(game.deck.pop());
            sortHand(game.players[i]);
        }
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
        addLog("游戏开始！庄家先出牌");
        drawGame();
        updateStatusMessage();
    }

    function playerDiscard() {
        if(!game.gameStarted || game.gameOver) return;
        if(game.currentTurn !== 0) { addLog("请等待你的回合"); return; }
        if(game.selectedTileIndex === -1) { addLog("请先选中一张牌"); return; }
        let tile = game.players[0][game.selectedTileIndex];
        if(!tile) return;
        game.players[0].splice(game.selectedTileIndex, 1);
        game.lastDiscard = tile;
        game.lastDiscardBy = 0;
        game.selectedTileIndex = -1;
        addLog(`玩家打出 ${tile.getShort()}`);
        if(game.players[0].length === 0) {
            game.gameOver = true;
            game.winner = 0;
            addLog("🎉 玩家自摸胡牌！胜利！ 🎉");
            drawGame();
            updateStatusMessage();
            return;
        }
        checkOtherPlayersAction(tile, 0);
        if(!game.waitForAction) {
            game.currentTurn = (game.currentTurn + 1) % 3;
            drawGame();
            updateStatusMessage();
            if(game.currentTurn !== 0 && !game.gameOver) setTimeout(() => aiTurn(), 400);
        } else {
            drawGame();
            updateStatusMessage();
        }
    }

    function checkOtherPlayersAction(tile, fromPlayer) {
        game.canPeng = false;
        game.canGang = false;
        game.canHu = false;
        game.waitForAction = false;
        game.pendingTile = tile;
        game.pendingFrom = fromPlayer;
        for(let i=1;i<=2;i++) {
            let playerIdx = (fromPlayer + i) % 3;
            let hand = game.players[playerIdx];
            if(checkHu(hand, tile)) {
                game.canHu = true;
                game.huFrom = playerIdx;
                game.waitForAction = true;
                if(playerIdx === 0) addLog("你可以胡牌！");
                else addLog(`AI${playerIdx === 1 ? '右' : '上'} 可以胡牌`);
                return;
            }
            if(checkPeng(hand, tile)) {
                game.canPeng = true;
                game.pengFrom = playerIdx;
                game.waitForAction = true;
                if(playerIdx === 0) addLog("你可以碰！");
                else addLog(`AI${playerIdx === 1 ? '右' : '上'} 可以碰`);
                return;
            }
            if(checkGang(hand, tile)) {
                game.canGang = true;
                game.gangFrom = playerIdx;
                game.waitForAction = true;
                if(playerIdx === 0) addLog("你可以杠！");
                else addLog(`AI${playerIdx === 1 ? '右' : '上'} 可以杠`);
                return;
            }
        }
    }

    function playerPeng() {
        if(!game.waitForAction || !game.canPeng || game.pengFrom !== 0) return;
        let tile = game.pendingTile;
        let indices = [];
        for(let i=0;i<game.players[0].length;i++) {
            if(game.players[0][i].name === tile.name && game.players[0][i].type === tile.type) {
                indices.push(i);
                if(indices.length === 2) break;
            }
        }
        if(indices.length === 2) {
            for(let i=indices.length-1;i>=0;i--) game.players[0].splice(indices[i], 1);
            addLog(`玩家碰 ${tile.getShort()}`);
            game.currentTurn = 0;
            game.waitForAction = false;
            game.lastDiscard = null;
            drawGame();
            updateStatusMessage();
        }
    }

    function playerGang() {
        if(!game.waitForAction || !game.canGang || game.gangFrom !== 0) return;
        let tile = game.pendingTile;
        let indices = [];
        for(let i=0;i<game.players[0].length;i++) {
            if(game.players[0][i].name === tile.name && game.players[0][i].type === tile.type) {
                indices.push(i);
                if(indices.length === 3) break;
            }
        }
        if(indices.length === 3) {
            for(let i=indices.length-1;i>=0;i--) game.players[0].splice(indices[i], 1);
            addLog(`玩家杠 ${tile.getShort()}`);
            if(game.deck.length > 0) {
                let newTile = game.deck.pop();
                game.players[0].push(newTile);
                sortHand(game.players[0]);
                addLog("补摸一张牌");
            }
            game.currentTurn = 0;
            game.waitForAction = false;
            game.lastDiscard = null;
            drawGame();
            updateStatusMessage();
        }
    }

    function playerHu() {
        if(!game.waitForAction || !game.canHu || game.huFrom !== 0) return;
        let tile = game.pendingTile;
        game.players[0].push(tile);
        sortHand(game.players[0]);
        game.gameOver = true;
        game.winner = 0;
        addLog(`🎉 玩家胡牌！胜利！ 🎉`);
        drawGame();
        updateStatusMessage();
    }

    function playerPass() {
        if(!game.waitForAction) return;
        game.waitForAction = false;
        addLog("玩家放弃操作");
        game.currentTurn = (game.pendingFrom + 1) % 3;
        game.lastDiscard = null;
        drawGame();
        updateStatusMessage();
        if(game.currentTurn !== 0 && !game.gameOver) setTimeout(() => aiTurn(), 400);
    }

    function selectAIDiscard(hand) {
        let counts = new Map();
        for(let tile of hand) {
            let key = `${tile.type}_${tile.name}`;
            counts.set(key, (counts.get(key)||0)+1);
        }
        let maxCount = 0;
        let maxTile = hand[0];
        for(let tile of hand) {
            let key = `${tile.type}_${tile.name}`;
            let cnt = counts.get(key);
            if(cnt > maxCount) {
                maxCount = cnt;
                maxTile = tile;
            }
        }
        return maxTile;
    }

    function aiTurn() {
        if(!game.gameStarted || game.gameOver) return;
        if(game.currentTurn === 0) return;
        if(game.waitForAction) {
            aiHandleAction();
            return;
        }
        let aiIdx = game.currentTurn;
        let hand = game.players[aiIdx];
        if(hand.length === 0) return;
        let tile = selectAIDiscard(hand);
        let tileIndex = hand.findIndex(t => t === tile);
        if(tileIndex !== -1) {
            hand.splice(tileIndex, 1);
            game.lastDiscard = tile;
            game.lastDiscardBy = aiIdx;
            addLog(`AI${aiIdx === 1 ? '右' : '上'} 打出 ${tile.getShort()}`);
            checkOtherPlayersAction(tile, aiIdx);
            if(!game.waitForAction) {
                game.currentTurn = (aiIdx + 1) % 3;
                drawGame();
                updateStatusMessage();
                if(game.currentTurn === 0 && !game.gameOver) addLog("轮到你了");
                else if(!game.gameOver) setTimeout(() => aiTurn(), 400);
            } else {
                drawGame();
                updateStatusMessage();
                setTimeout(() => aiHandleAction(), 300);
            }
        }
    }

    function aiHandleAction() {
        if(!game.waitForAction) return;
        if(game.canHu && game.huFrom !== 0) {
            let aiIdx = game.huFrom;
            let tile = game.pendingTile;
            game.players[aiIdx].push(tile);
            sortHand(game.players[aiIdx]);
            game.gameOver = true;
            game.winner = aiIdx;
            addLog(`AI${aiIdx === 1 ? '右' : '上'} 胡牌！胜利！`);
            drawGame();
            updateStatusMessage();
            return;
        }
        if(game.canGang && game.gangFrom !== 0) {
            let aiIdx = game.gangFrom;
            let tile = game.pendingTile;
            let indices = [];
            for(let i=0;i<game.players[aiIdx].length;i++) {
                if(game.players[aiIdx][i].name === tile.name && game.players[aiIdx][i].type === tile.type) {
                    indices.push(i);
                    if(indices.length === 3) break;
                }
            }
            for(let i=indices.length-1;i>=0;i--) game.players[aiIdx].splice(indices[i], 1);
            addLog(`AI${aiIdx === 1 ? '右' : '上'} 杠 ${tile.getShort()}`);
            if(game.deck.length > 0) {
                let newTile = game.deck.pop();
                game.players[aiIdx].push(newTile);
                sortHand(game.players[aiIdx]);
            }
            game.waitForAction = false;
            game.currentTurn = aiIdx;
            drawGame();
            updateStatusMessage();
            setTimeout(() => aiTurn(), 300);
            return;
        }
        if(game.canPeng && game.pengFrom !== 0) {
            let aiIdx = game.pengFrom;
            let tile = game.pendingTile;
            let indices = [];
            for(let i=0;i<game.players[aiIdx].length;i++) {
                if(game.players[aiIdx][i].name === tile.name && game.players[aiIdx][i].type === tile.type) {
                    indices.push(i);
                    if(indices.length === 2) break;
                }
            }
            for(let i=indices.length-1;i>=0;i--) game.players[aiIdx].splice(indices[i], 1);
            addLog(`AI${aiIdx === 1 ? '右' : '上'} 碰 ${tile.getShort()}`);
            game.waitForAction = false;
            game.currentTurn = aiIdx;
            drawGame();
            updateStatusMessage();
            setTimeout(() => aiTurn(), 300);
            return;
        }
        if(game.waitForAction && game.pendingFrom !== 0) {
            game.waitForAction = false;
            game.currentTurn = (game.pendingFrom + 1) % 3;
            drawGame();
            updateStatusMessage();
            if(game.currentTurn !== 0) setTimeout(() => aiTurn(), 300);
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
        if(game.currentTurn !== 0 && !game.gameOver && !game.waitForAction) setTimeout(() => aiTurn(), 400);
    }

    function drawGame() {
        ctx.clearRect(0,0,1000,600);
        let grad = ctx.createLinearGradient(0,0,1000,600);
        grad.addColorStop(0,'#1e5a2e');
        grad.addColorStop(1,'#0f3a1a');
        ctx.fillStyle = grad;
        ctx.fillRect(0,0,1000,600);
        ctx.fillStyle = "#2d6a4f";
        for(let i=0;i<12;i++) {
            ctx.beginPath();
            ctx.arc(500 + (i%6)*100 - 250, 280 + Math.floor(i/6)*100, 30, 0, Math.PI*2);
            ctx.fillStyle = "#40916c";
            ctx.fill();
        }
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
        let aiRight = game.players[1];
        for(let i=0;i<Math.min(aiRight.length, 12);i++) {
            ctx.fillStyle = "#2c5e6b";
            ctx.fillRect(740 + i*20, 100, 58, 78);
            ctx.fillStyle = "#a0aec0";
            ctx.font = "18px monospace";
            ctx.fillText("🀆", 755 + i*20, 148);
        }
        let aiTop = game.players[2];
        for(let i=0;i<Math.min(aiTop.length, 12);i++) {
            ctx.fillStyle = "#2c5e6b";
            ctx.fillRect(80 + i*20, 30, 58, 78);
            ctx.fillStyle = "#a0aec0";
            ctx.fillText("🀆", 95 + i*20, 78);
        }
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
        ctx.font = "12px monospace";
        ctx.fillStyle = "#c9d1d9";
        for(let i=0;i<Math.min(game.gameLog.length, 4);i++) {
            ctx.fillText(game.gameLog[i], 20, 570 - i*15);
        }
        ctx.font = "14px system-ui";
        ctx.fillStyle = "#f9e7b3";
        ctx.fillText(`你:${game.players[0].length} 右:${game.players[1].length} 上:${game.players[2].length}`, 40, 570);
        ctx.fillText(`剩余牌: ${game.deck.length}`, 40, 590);
    }

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
                if(game.selectedTileIndex === i) game.selectedTileIndex = -1;
                else game.selectedTileIndex = i;
                drawGame();
                break;
            }
        }
    });

    document.getElementById('btnStart').addEventListener('click', () => { deal(); drawGame(); updateStatusMessage(); });
    document.getElementById('btnDiscard').addEventListener('click', () => { playerDiscard(); drawGame(); updateStatusMessage(); });
    document.getElementById('btnPeng').addEventListener('click', () => { playerPeng(); drawGame(); updateStatusMessage(); });
    document.getElementById('btnGang').addEventListener('click', () => { playerGang(); drawGame(); updateStatusMessage(); });
    document.getElementById('btnHu').addEventListener('click', () => { playerHu(); drawGame(); updateStatusMessage(); });
    document.getElementById('btnPass').addEventListener('click', () => { playerPass(); drawGame(); updateStatusMessage(); });

    drawGame();
    updateStatusMessage();
})();
