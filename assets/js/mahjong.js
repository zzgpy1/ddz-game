function aiTurn() {
    if(!game.gameStarted || game.gameOver) return;
    if(game.currentTurn === 0) return;
    if(game.waitForAction) return;
    
    let aiIdx = game.currentTurn;
    let hand = game.players[aiIdx];
    if(hand.length === 0) return;
    
    // AI决策：优先打出孤张（没有关联的牌）
    let tile = selectAIDiscard(hand);
    let tileIndex = hand.findIndex(t => t === tile);
    if(tileIndex !== -1) {
        hand.splice(tileIndex, 1);
        game.lastDiscard = tile;
        game.lastDiscardBy = aiIdx;
        addLog(`AI${aiIdx === 1 ? '右' : '上'} 打出 ${tile.getShort()}`);
        
        // 检查其他玩家是否可以碰/杠/胡
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

// AI选择要出的牌（简单策略：优先打出边张或字牌）
function selectAIDiscard(hand) {
    // 优先打出手牌中数量最多的牌（减少手牌种类）
    let counts = new Map();
    for(let tile of hand) {
        let key = `${tile.type}_${tile.name}`;
        counts.set(key, (counts.get(key)||0)+1);
    }
    // 找到数量最多的牌型中的一张
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
