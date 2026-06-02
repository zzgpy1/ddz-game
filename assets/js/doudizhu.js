// 斗地主完整游戏逻辑 - AI修复 + 画布增强
(function(){
    const SUITS = ['♠', '♥', '♣', '♦'];
    const RANK_MAP = ['3','4','5','6','7','8','9','10','J','Q','K','A','2','JOKER'];
    const RANK_VAL = {
        '3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14,'2':15,
        'JOKER_B':16, 'JOKER_R':17
    };

    class Card {
        constructor(suit, rank) {
            this.suit = suit;
            this.rank = rank;
            this.value = RANK_VAL[rank];
        }
        getShort() {
            if(this.suit === 'JOKER') return this.rank === 'JOKER_R' ? "大王" : "小王";
            return this.suit+this.rank;
        }
    }

    function createDeck() {
        let deck = [];
        for(let s of SUITS) {
            for(let r of RANK_MAP) {
                if(r !== 'JOKER') deck.push(new Card(s, r));
            }
        }
        deck.push(new Card('JOKER', 'JOKER_B'));
        deck.push(new Card('JOKER', 'JOKER_R'));
        return shuffle(deck);
    }
    
    function shuffle(deck) {
        for(let i=deck.length-1;i>0;i--) {
            let j = Math.floor(Math.random()*(i+1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    }

    function getType(cards) {
        if(cards.length === 0) return null;
        if(cards.length === 1) return 'single';
        let values = cards.map(c=>c.value).sort((a,b)=>a-b);
        let sameValCount = new Map();
        values.forEach(v=>sameValCount.set(v, (sameValCount.get(v)||0)+1));
        let counts = [...sameValCount.values()].sort((a,b)=>b-a);
        if(cards.length===2 && counts[0]===2) return 'pair';
        if(cards.length===3 && counts[0]===3) return 'triplet';
        if(cards.length===4 && counts[0]===3 && counts[1]===1) return 'triplet_with_single';
        if(cards.length===5 && counts[0]===3 && counts[1]===2) return 'triplet_with_pair';
        if(cards.length===4 && counts[0]===4) return 'bomb';
        if(cards.length===2 && values[0]===16 && values[1]===17) return 'rocket';
        if(cards.length>=5 && counts[0]===1 && values[values.length-1]<=14) {
            let isStraight = true;
            for(let i=0;i<values.length-1;i++) {
                if(values[i+1] !== values[i]+1) { isStraight=false; break; }
            }
            if(isStraight) return 'straight';
        }
        return null;
    }

    function canBeat(lastCards, myCards, myType) {
        if(!lastCards || lastCards.length===0) return true;
        let lastType = getType(lastCards);
        let curType = myType;
        if(!curType) return false;
        if(curType === 'rocket') return true;
        if(lastType === 'rocket') return false;
        if(curType === 'bomb') return true;
        if(lastType !== curType) return false;
        if(curType === 'single' || curType === 'pair' || curType === 'triplet') {
            let myMax = Math.max(...myCards.map(c=>c.value));
            let lastMax = Math.max(...lastCards.map(c=>c.value));
            return myMax > lastMax;
        }
        if(curType === 'triplet_with_single') {
            let myTripletVal = getTripletValue(myCards);
            let lastTripletVal = getTripletValue(lastCards);
            return myTripletVal > lastTripletVal;
        }
        if(curType === 'triplet_with_pair') {
            let myTripletVal = getTripletValue(myCards);
            let lastTripletVal = getTripletValue(lastCards);
            return myTripletVal > lastTripletVal;
        }
        if(curType === 'straight') {
            let myMax = Math.max(...myCards.map(c=>c.value));
            let lastMax = Math.max(...lastCards.map(c=>c.value));
            return myMax > lastMax && myCards.length === lastCards.length;
        }
        if(curType === 'bomb') {
            let myMax = Math.max(...myCards.map(c=>c.value));
            let lastMax = Math.max(...lastCards.map(c=>c.value));
            return myMax > lastMax;
        }
        return false;
    }

    function getTripletValue(cards) {
        let valMap = new Map();
        cards.forEach(c=>valMap.set(c.value, (valMap.get(c.value)||0)+1));
        for(let [val, cnt] of valMap.entries()) if(cnt===3) return val;
        return 0;
    }

    // ========== AI辅助函数 ==========
    function getMaxValue(cards) {
        return Math.max(...cards.map(c=>c.value));
    }

    function getAllLegalCombos(hand, type, length) {
        if(type === 'single') return hand.map(c=>[c]);
        if(type === 'pair') {
            let map = new Map();
            hand.forEach(c=>map.set(c.value, (map.get(c.value)||[]).concat(c)));
            let pairs = [];
            for(let arr of map.values()) if(arr.length >= 2) pairs.push([arr[0], arr[1]]);
            return pairs;
        }
        if(type === 'triplet') {
            let map = new Map();
            hand.forEach(c=>map.set(c.value, (map.get(c.value)||[]).concat(c)));
            let trips = [];
            for(let arr of map.values()) if(arr.length >= 3) trips.push([arr[0], arr[1], arr[2]]);
            return trips;
        }
        if(type === 'triplet_with_single') {
            let trips = getAllLegalCombos(hand, 'triplet', 3);
            let singles = getAllLegalCombos(hand, 'single', 1);
            let res = [];
            for(let t of trips) {
                let singleCandidates = singles.filter(s=>s[0].value !== t[0].value);
                if(singleCandidates.length) res.push([...t, ...singleCandidates[0]]);
            }
            return res;
        }
        if(type === 'triplet_with_pair') {
            let trips = getAllLegalCombos(hand, 'triplet', 3);
            let pairs = getAllLegalCombos(hand, 'pair', 2);
            let res = [];
            for(let t of trips) {
                let pairCandidates = pairs.filter(p=>p[0].value !== t[0].value);
                if(pairCandidates.length) res.push([...t, ...pairCandidates[0]]);
            }
            return res;
        }
        if(type === 'straight') {
            let sorted = [...hand].sort((a,b)=>a.value-b.value);
            let uniq = [];
            for(let c of sorted) if(!uniq.find(u=>u.value===c.value)) uniq.push(c);
            let res = [];
            for(let i=0;i+length<=uniq.length;i++){
                let straight = uniq.slice(i,i+length);
                if(straight.every((c,idx)=> idx===0 || c.value===straight[idx-1].value+1) && straight[0].value<=14 && straight[straight.length-1].value<=14)
                    res.push(straight);
            }
            return res;
        }
        return [];
    }

    function getAllBombs(hand){
        let map = new Map();
        hand.forEach(c=>map.set(c.value, (map.get(c.value)||[]).concat(c)));
        let bombs = [];
        for(let arr of map.values()) if(arr.length===4) bombs.push([...arr]);
        let kingBomb = hand.filter(c=>c.value===16||c.value===17);
        if(kingBomb.length===2) bombs.push(kingBomb);
        return bombs;
    }

    // ========== 游戏状态 ==========
    let game = {
        deck: [],
        players: [[], [], []],
        landlord: -1,
        currentTurn: -1,
        lastPlayedCards: [],
        lastPlayedBy: -1,
        biddingPhase: true,
        currentBidder: 0,
        currentBid: 0,
        bidHistory: [0,0,0],
        gameOver: false,
        winnerTeam: -1,
        selectedCardsIndex: new Set(),
        multiplier: 1
    };

    let canvas = document.getElementById('gameCanvas');
    let ctx = canvas.getContext('2d');

    function updateStatusMessage() {
        if(game.gameOver) {
            if(game.winnerTeam === game.landlord) document.getElementById('gameStatusDisplay').innerHTML = "🎉 地主胜利！ 🎉";
            else document.getElementById('gameStatusDisplay').innerHTML = "🌾 农民胜利！ 🌾";
            document.getElementById('statusMessage').innerHTML = "游戏结束，点击【发牌】开始新对局";
            return;
        }
        if(game.biddingPhase) {
            let bidderName = game.currentBidder===0?"👤 您":(game.currentBidder===1?"🤖 右AI":"🤖 上AI");
            document.getElementById('gameStatusDisplay').innerHTML = `🎙️ 叫分 · ${bidderName} (最高${game.currentBid}分)`;
            document.getElementById('statusMessage').innerHTML = `叫分轮次，当前叫分${game.currentBid}分`;
            if(game.currentBidder===0 && !game.gameOver) enableBidButtons(true);
            else enableBidButtons(false);
            return;
        }
        enableBidButtons(false);
        let turnName = game.currentTurn===0?"👤 你的回合":(game.currentTurn===1?"🤖 右AI":"🤖 上AI");
        document.getElementById('gameStatusDisplay').innerHTML = `📢 ${turnName}`;
        document.getElementById('statusMessage').innerHTML = game.currentTurn===0? "🎯 单击手牌选中，点【出牌】或【过】":"🤖 AI 思考中...";
        if(game.currentTurn!==0 && !game.gameOver && !game.biddingPhase) setTimeout(()=> aiTurn(), 300);
    }

    function enableBidButtons(enable) {
        let btns = [document.getElementById('btnBid1'), document.getElementById('btnBid2'), document.getElementById('btnBid3'), document.getElementById('btnPass')];
        btns.forEach(btn=>btn.disabled = !enable);
    }

    function placeBid(score) {
        if(!game.biddingPhase || game.gameOver || game.currentBidder !== 0) return;
        if(score <= game.currentBid) return;
        game.currentBid = score;
        game.bidHistory[0] = score;
        if(score === 3) endBiddingAndSetLandlord(0);
        else nextBidder();
        drawGame();
        updateStatusMessage();
    }

    function passBid() {
        if(!game.biddingPhase || game.gameOver || game.currentBidder !== 0) return;
        game.bidHistory[0] = -1;
        nextBidder();
        drawGame();
        updateStatusMessage();
    }

    function nextBidder() {
        let next = (game.currentBidder+1)%3;
        let allPass = game.bidHistory.every(v=> v === -1 || v === 0);
        if(next === 0 && (allPass || game.bidHistory[0]===-1)) {
            if(game.currentBid === 0) resetAndDeal();
            else {
                let landlordIdx = -1;
                for(let i=0;i<3;i++) if(game.bidHistory[i] === game.currentBid) landlordIdx = i;
                if(landlordIdx !== -1) endBiddingAndSetLandlord(landlordIdx);
                else resetAndDeal();
            }
            return;
        }
        game.currentBidder = next;
        if(game.currentBidder !== 0) setTimeout(()=> aiBid(), 100);
        else { drawGame(); updateStatusMessage(); }
    }

    function aiBid() {
        if(!game.biddingPhase) return;
        if(game.currentBidder === 0) return;
        let hand = game.players[game.currentBidder];
        let strong = hand.filter(c=>c.value>=14).length >= 2;
        let decision = Math.random();
        let aiScore = 0;
        if(game.currentBid < 2 && (strong || decision>0.6)) aiScore = game.currentBid+1;
        else if(game.currentBid < 1 && decision>0.4) aiScore = 1;
        if(aiScore > game.currentBid && aiScore<=3) {
            game.currentBid = aiScore;
            game.bidHistory[game.currentBidder] = aiScore;
            if(aiScore === 3) endBiddingAndSetLandlord(game.currentBidder);
            else nextBidder();
        } else {
            game.bidHistory[game.currentBidder] = -1;
            nextBidder();
        }
        drawGame();
        updateStatusMessage();
    }

    function endBiddingAndSetLandlord(landlordIdx) {
        game.biddingPhase = false;
        game.landlord = landlordIdx;
        game.multiplier = game.currentBid === 0 ? 1 : game.currentBid;
        if(game.deck && game.deck.length === 3) {
            let extra = [...game.deck];
            game.players[landlordIdx] = game.players[landlordIdx].concat(extra);
            game.players[landlordIdx].sort((a,b)=>a.value-b.value);
            game.deck = [];
        }
        game.currentTurn = landlordIdx;
        game.lastPlayedCards = [];
        game.lastPlayedBy = -1;
        game.gameOver = false;
        drawGame();
        updateStatusMessage();
    }

    function resetAndDeal() {
        let fullDeck = createDeck();
        game.deck = fullDeck.slice(0,3);
        let rest = fullDeck.slice(3);
        for(let i=0;i<3;i++) {
            game.players[i] = [];
            for(let j=0;j<17;j++) game.players[i].push(rest.pop());
            game.players[i].sort((a,b)=>a.value-b.value);
        }
        game.biddingPhase = true;
        game.currentBidder = 0;
        game.currentBid = 0;
        game.bidHistory = [0,0,0];
        game.landlord = -1;
        game.lastPlayedCards = [];
        game.lastPlayedBy = -1;
        game.gameOver = false;
        game.winnerTeam = -1;
        game.selectedCardsIndex.clear();
        drawGame();
        updateStatusMessage();
        enableBidButtons(true);
    }

    function playerPass() {
        if(game.biddingPhase || game.gameOver || game.currentTurn !== 0) return;
        if(game.lastPlayedBy === -1 || game.lastPlayedCards.length===0) return;
        game.currentTurn = (game.currentTurn+1)%3;
        if(game.currentTurn === game.lastPlayedBy) {
            game.lastPlayedCards = [];
            game.lastPlayedBy = -1;
        }
        drawGame();
        updateStatusMessage();
    }

    function playerPlayCards() {
        if(game.biddingPhase || game.gameOver || game.currentTurn !== 0) return;
        let selected = Array.from(game.selectedCardsIndex).sort((a,b)=>a-b).map(idx=>game.players[0][idx]);
        if(selected.length === 0) { alert("请先选中手牌！"); return; }
        let type = getType(selected);
        if(!type) { alert("无效牌型！"); return; }
        if(!canBeat(game.lastPlayedCards, selected, type)) { alert("不能压制上家！"); return; }
        for(let card of selected) {
            let idx = game.players[0].findIndex(c=>c===card);
            if(idx!==-1) game.players[0].splice(idx,1);
        }
        game.lastPlayedCards = selected;
        game.lastPlayedBy = 0;
        game.selectedCardsIndex.clear();
        if(game.players[0].length === 0) {
            game.gameOver = true;
            game.winnerTeam = (game.landlord === 0) ? 0 : 1;
            drawGame();
            updateStatusMessage();
            return;
        }
        game.currentTurn = (game.currentTurn+1)%3;
        drawGame();
        updateStatusMessage();
    }

    // ========== 修复后的AI出牌 ==========
    function aiTurn() {
        if(game.gameOver || game.biddingPhase) return;
        if(game.currentTurn === 0) return;
        let aiIdx = game.currentTurn;
        let hand = game.players[aiIdx];
        if(hand.length === 0) return;
        let played = false;
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
            let lastType = getType(game.lastPlayedCards);
            if(lastType) {
                let candidates = getAllLegalCombos(hand, lastType, game.lastPlayedCards.length);
                candidates.sort((a,b)=>getMaxValue(a)-getMaxValue(b));
                for(let combo of candidates) {
                    if(canBeat(game.lastPlayedCards, combo, getType(combo))) {
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
        if(hand.length === 0) {
            game.gameOver = true;
            game.winnerTeam = (game.landlord === aiIdx) ? 0 : 1;
            drawGame();
            updateStatusMessage();
            return;
        }
        game.currentTurn = (game.currentTurn+1)%3;
        if(game.currentTurn === game.lastPlayedBy) {
            game.lastPlayedCards = [];
            game.lastPlayedBy = -1;
        }
        drawGame();
        updateStatusMessage();
    }

    // ========== 画布绘制（美化版） ==========
    function drawGame() {
        ctx.clearRect(0,0,1000,600);
        // 桌布渐变
        let grad = ctx.createLinearGradient(0,0,1000,600);
        grad.addColorStop(0,'#1e5a2e');
        grad.addColorStop(1,'#0f3a1a');
        ctx.fillStyle = grad;
        ctx.fillRect(0,0,1000,600);
        // 网格纹理
        ctx.beginPath();
        ctx.strokeStyle = '#3a7a4a';
        ctx.lineWidth = 0.5;
        for(let i=0;i<20;i++) {
            ctx.moveTo(0,i*30);
            ctx.lineTo(1000,i*30);
            ctx.stroke();
            ctx.moveTo(i*50,0);
            ctx.lineTo(i*50,600);
            ctx.stroke();
        }
        // 绘制玩家手牌
        let hand = game.players[0];
        let cardW = 72, cardH = 96;
        let startX = (1000 - (hand.length* (cardW+4)))/2;
        for(let i=0;i<hand.length;i++) {
            let x = startX + i*(cardW+6);
            let y = 480;
            let isSelected = game.selectedCardsIndex.has(i);
            ctx.shadowBlur = isSelected ? 8 : 2;
            ctx.shadowColor = "rgba(0,0,0,0.3)";
            ctx.fillStyle = isSelected ? "#ffe6b3" : "#fef5e0";
            ctx.fillRect(x, y, cardW, cardH);
            ctx.strokeStyle = "#a55d35";
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, cardW, cardH);
            ctx.fillStyle = "#2c1e12";
            ctx.font = "bold 20px 'Segoe UI'";
            ctx.fillText(hand[i].getShort(), x+12, y+40);
            if(hand[i].suit === '♥'||hand[i].suit === '♦') ctx.fillStyle = "#c33";
            else ctx.fillStyle = "#222";
            ctx.fillText(hand[i].getShort(), x+12, y+70);
        }
        ctx.shadowBlur = 0;
        // AI手牌背面（带花纹）
        let aiRight = game.players[1];
        for(let i=0;i<Math.min(aiRight.length,12);i++) {
            ctx.fillStyle = "#2c5e6b";
            ctx.fillRect(740 + i*20, 100, 60, 80);
            ctx.fillStyle = "#a0aec0";
            ctx.font = "20px monospace";
            ctx.fillText("🃟", 755 + i*20, 150);
        }
        let aiTop = game.players[2];
        for(let i=0;i<Math.min(aiTop.length,12);i++) {
            ctx.fillStyle = "#2c5e6b";
            ctx.fillRect(80 + i*20, 30, 60, 80);
            ctx.fillStyle = "#a0aec0";
            ctx.fillText("🃟", 95 + i*20, 80);
        }
        // 桌面中央显示最近出牌
        if(game.lastPlayedCards.length){
            let disp = game.lastPlayedCards.map(c=>c.getShort()).join(" ");
            ctx.font="bold 24px monospace";
            ctx.fillStyle="#FFD966";
            ctx.shadowBlur = 6;
            ctx.fillText(`🃟 ${disp}`, 350, 260);
            ctx.shadowBlur = 0;
        }
        ctx.font="16px system-ui";
        ctx.fillStyle="#f9e7b3";
        ctx.fillText(`地主: ${game.landlord===0?"👤":(game.landlord===1?"右AI":"上AI")} 倍数:${game.multiplier}`, 40, 570);
        ctx.fillText(`手牌数 你:${game.players[0].length} 右:${game.players[1].length} 上:${game.players[2].length}`, 40, 40);
    }

    // 事件绑定
    canvas.addEventListener('click', (e) => {
        if(game.gameOver || game.biddingPhase || game.currentTurn !== 0) return;
        let rect = canvas.getBoundingClientRect();
        let scaleX = canvas.width/rect.width;
        let scaleY = canvas.height/rect.height;
        let clickX = (e.clientX - rect.left)*scaleX;
        let clickY = (e.clientY - rect.top)*scaleY;
        let hand = game.players[0];
        let cardW=72, cardH=96;
        let startX = (1000 - (hand.length* (cardW+4)))/2;
        for(let i=0;i<hand.length;i++){
            let x = startX + i*(cardW+6);
            let y = 480;
            if(clickX>=x && clickX<=x+cardW && clickY>=y && clickY<=y+cardH){
                if(game.selectedCardsIndex.has(i)) game.selectedCardsIndex.delete(i);
                else game.selectedCardsIndex.add(i);
                drawGame();
                break;
            }
        }
    });

    document.getElementById('btnStart').addEventListener('click',()=>{ resetAndDeal(); drawGame(); });
    document.getElementById('btnPass').addEventListener('click',()=>{ if(game.biddingPhase && game.currentBidder===0) passBid(); else if(!game.biddingPhase && game.currentTurn===0) playerPass(); drawGame(); updateStatusMessage(); });
    document.getElementById('btnBid1').addEventListener('click',()=> placeBid(1));
    document.getElementById('btnBid2').addEventListener('click',()=> placeBid(2));
    document.getElementById('btnBid3').addEventListener('click',()=> placeBid(3));
    document.getElementById('btnPlayCards').addEventListener('click',()=>{ playerPlayCards(); drawGame(); updateStatusMessage(); });
    
    resetAndDeal();
    drawGame();
    updateStatusMessage();
})();
