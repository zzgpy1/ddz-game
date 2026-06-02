// 替换 aiTurn 函数为以下完整实现
function aiTurn() {
    if(game.gameOver || game.biddingPhase) return;
    if(game.currentTurn === 0) return;
    
    let aiIdx = game.currentTurn;
    let hand = game.players[aiIdx];
    if(hand.length === 0) return;
    
    let played = false;
    
    // 如果没有上家出牌，AI出最小的单张
    if(game.lastPlayedCards.length === 0) {
        let sorted = [...hand].sort((a,b)=>a.value-b.value);
        let card = sorted[0];
        let idx = hand.findIndex(c=>c===card);
        if(idx !== -1) {
            hand.splice(idx,1);
            game.lastPlayedCards = [card];
            game.lastPlayedBy = aiIdx;
            played = true;
        }
    } else {
        // 有上家牌，尝试找能压的组合
        let lastType = getType(game.lastPlayedCards);
        if(lastType) {
            // 获取所有可能的合法组合（单张、对子、三张等）
            let candidates = getAllLegalCombos(hand, lastType, game.lastPlayedCards.length);
            // 按牌值排序，找最小的能压的组合
            candidates.sort((a,b) => getMaxValue(a) - getMaxValue(b));
            for(let combo of candidates) {
                if(canBeat(game.lastPlayedCards, combo, getType(combo))) {
                    // 出牌
                    for(let card of combo) {
                        let idx = hand.findIndex(c=>c===card);
                        if(idx !== -1) hand.splice(idx,1);
                    }
                    game.lastPlayedCards = combo;
                    game.lastPlayedBy = aiIdx;
                    played = true;
                    break;
                }
            }
            // 如果没有找到能压的，尝试出炸弹
            if(!played) {
                let bombs = getAllBombs(hand);
                for(let bomb of bombs) {
                    if(canBeat(game.lastPlayedCards, bomb, 'bomb')) {
                        for(let card of bomb) {
                            let idx = hand.findIndex(c=>c===card);
                            if(idx !== -1) hand.splice(idx,1);
                        }
                        game.lastPlayedCards = bomb;
                        game.lastPlayedBy = aiIdx;
                        played = true;
                        break;
                    }
                }
            }
        }
    }
    
    // 如果AI没有出牌（过）
    if(!played && game.lastPlayedCards.length > 0) {
        // AI过牌，什么都不做
    }
    
    // 检查AI是否胜利
    if(hand.length === 0) {
        game.gameOver = true;
        game.winnerTeam = (game.landlord === aiIdx) ? 0 : 1;
        drawGame();
        updateStatusMessage();
        return;
    }
    
    // 轮到下一个玩家
    game.currentTurn = (game.currentTurn + 1) % 3;
    // 如果一圈结束，清空上家牌
    if(game.currentTurn === game.lastPlayedBy) {
        game.lastPlayedCards = [];
        game.lastPlayedBy = -1;
    }
    drawGame();
    updateStatusMessage();
}

// 辅助函数：获取组合中最大牌值
function getMaxValue(cards) {
    return Math.max(...cards.map(c=>c.value));
}

// 获取所有合法组合（同类型且长度相同）
function getAllLegalCombos(hand, type, length) {
    if(type === 'single') {
        return hand.map(c=>[c]);
    }
    if(type === 'pair') {
        let map = new Map();
        hand.forEach(c=>map.set(c.value, (map.get(c.value)||[]).concat(c)));
        let pairs = [];
        for(let arr of map.values()) {
            if(arr.length >= 2) pairs.push([arr[0], arr[1]]);
        }
        return pairs;
    }
    if(type === 'triplet') {
        let map = new Map();
        hand.forEach(c=>map.set(c.value, (map.get(c.value)||[]).concat(c)));
        let trips = [];
        for(let arr of map.values()) {
            if(arr.length >= 3) trips.push([arr[0], arr[1], arr[2]]);
        }
        return trips;
    }
    // 其他类型可类似扩展，这里为简化，返回空
    return [];
}

// 获取所有炸弹
function getAllBombs(hand) {
    let map = new Map();
    hand.forEach(c=>map.set(c.value, (map.get(c.value)||[]).concat(c)));
    let bombs = [];
    for(let arr of map.values()) {
        if(arr.length === 4) bombs.push([...arr]);
    }
    // 王炸
    let kings = hand.filter(c=>c.value === 16 || c.value === 17);
    if(kings.length === 2) bombs.push(kings);
    return bombs;
}
