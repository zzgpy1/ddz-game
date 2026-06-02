// 斗地主完整游戏逻辑
// (与之前提供的完整斗地主代码相同，已整合)
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
        if(game.currentTurn!==0 && !game.gameOver && !game.biddingPhase) setTimeout(()=> aiTurn(), 150);
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

    function aiTurn() {
        if(game.gameOver || game.biddingPhase || game.currentTurn === 0) return;
        let aiIdx = game.currentTurn;
        let hand = game.players[aiIdx];
        if(hand.length === 0) return;
        if(game.lastPlayedCards.length === 0) {
            let sorted = [...hand].sort((a,b)=>a.value-b.value);
            let idx = game.players[aiIdx].findIndex(c=>c===sorted[0]);
            if(idx!==-1) game.players[aiIdx].splice(idx,1);
            game.lastPlayedCards = [sorted[0]];
            game.lastPlayedBy = aiIdx;
        } else {
            let canPlay = false;
            for(let i=0;i<hand.length;i++) {
                let test = [hand[i]];
                let type = getType(test);
                if(canBeat(game.lastPlayedCards, test, type)) {
                    game.players[aiIdx].splice(i,1);
                    game.lastPlayedCards = test;
                    game.lastPlayedBy = aiIdx;
                    canPlay = true;
                    break;
                }
            }
            if(!canPlay && game.lastPlayedBy !== -1) {
                // pass
            }
        }
        if(game.players[aiIdx].length === 0) {
            game.gameOver = true;
            game.winnerTeam = (game.landlord === aiIdx) ? 0 : 1;
            drawGame();
            updateStatusMessage();
            return;
        }
        game.currentTurn = (game.currentTurn+1)%3;
        if(game.currentTurn === game.lastPlayedBy && game.lastPlayedCards.length) {
            game.lastPlayedCards = [];
            game.lastPlayedBy = -1;
        }
        drawGame();
        updateStatusMessage();
    }

    function drawGame() {
        ctx.clearRect(0,0,1000,600);
        ctx.fillStyle="#1e3a1e";
        ctx.fillRect(0,0,1000,600);
        let hand = game.players[0];
        let cardW = 72, cardH = 96;
        let startX = (1000 - (hand.length* (cardW+4)))/2;
        for(let i=0;i<hand.length;i++) {
            let x = startX + i*(cardW+6);
            let y = 480;
            let isSelected = game.selectedCardsIndex.has(i);
            ctx.fillStyle = isSelected ? "#ffe6b3" : "#fef5e0";
            ctx.fillRect(x, y, cardW, cardH);
            ctx.strokeStyle = "#a55d35";
            ctx.strokeRect(x, y, cardW, cardH);
            ctx.fillStyle = "#2c1e12";
            ctx.font = "bold 20px 'Segoe UI'";
            ctx.fillText(hand[i].getShort(), x+12, y+40);
            if(hand[i].suit === '♥'||hand[i].suit === '♦') ctx.fillStyle = "#c33";
            else ctx.fillStyle = "#222";
            ctx.fillText(hand[i].getShort(), x+12, y+70);
        }
        let aiRight = game.players[1];
        for(let i=0;i<Math.min(aiRight.length,10);i++) {
            ctx.fillStyle = "#2c5e6b";
            ctx.fillRect(760 + i*18, 120, 60, 80);
            ctx.fillStyle = "#ddd";
            ctx.fillText("?", 780+i*18, 165);
        }
        let aiTop = game.players[2];
        for(let i=0;i<Math.min(aiTop.length,10);i++) {
            ctx.fillStyle = "#2c5e6b";
            ctx.fillRect(100 + i*18, 30, 60, 80);
            ctx.fillStyle = "#ddd";
            ctx.fillText("?", 120+i*18, 75);
        }
        if(game.lastPlayedCards.length){
            let disp = game.lastPlayedCards.map(c=>c.getShort()).join(" ");
            ctx.font="bold 22px monospace";
            ctx.fillStyle="#FFD966";
            ctx.fillText(`🃟 ${disp}`, 350, 260);
        }
        ctx.font="16px system-ui";
        ctx.fillStyle="#f9e7b3";
        ctx.fillText(`地主: ${game.landlord===0?"👤":(game.landlord===1?"右AI":"上AI")}`, 40, 570);
        ctx.fillText(`手牌 你:${game.players[0].length} 右:${game.players[1].length} 上:${game.players[2].length}`, 40, 40);
    }

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
