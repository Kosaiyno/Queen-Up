const board = document.getElementById("board");

const pieces = [
    ...Array(50).fill("♟"), // Pawn - Very common (50%)
    ...Array(30).fill("♝"), // Bishop - Common (30%)
    ...Array(15).fill("♞"), // Knight - Not common (15%)
    ...Array(5).fill("♜")   // Rook - Rare (5%)
];

const upgradeMap = {
    "♟": "♝", 
    "♝": "♞", 
    "♞": "♜", 
    "♜": "♛",
    "♛": null // Matching Queens clears them entirely!
};

const rows = 6;
const cols = 6;
let grid = [];

let currTile;
let otherTile;
let lastSwapCoords = [];
let isProcessing = false;

// UI & Metagame State
let timeLeft = 120; // 2 minutes
let queenCount = 0;
let gameInterval = null;
let gameEnded = false;
let gameStarted = false;
let isTimerFrozen = false;

let totalQueens = 0;
let kingdomLevel = 1;

let monsters = [
    { name: "Slime Soldier", hp: 3 },
    { name: "Goblin Brute", hp: 8 },
    { name: "Skeleton Guard", hp: 15 },
    { name: "Orc Warlord", hp: 30 },
    { name: "Dark Sorcerer", hp: 50 },
    { name: "Shadow Dragon", hp: 150 }
];

function switchView(viewName) {
    let views = ["play", "inventory", "battle"];
    views.forEach(v => {
        let el = document.getElementById("view-" + v);
        let btn = document.getElementById("nav-" + v);
        if (v === viewName) {
            el.classList.add("active");
            el.classList.remove("hidden");
            btn.classList.add("active");
        } else {
            el.classList.remove("active");
            el.classList.add("hidden");
            btn.classList.remove("active");
        }
    });

    updateMetagameUI();
}

function updateMetagameUI() {
    document.getElementById("inv-queens").innerText = totalQueens;
    
    let isGameOver = (kingdomLevel - 1) >= monsters.length;
    if (isGameOver) {
        document.getElementById("kingdom-num").innerText = "Cleared";
        document.getElementById("monster-name").innerText = "All Conquered!";
        document.getElementById("monster-hp").innerText = "You Win!";
        let btn = document.getElementById("btn-attack");
        btn.innerText = "Victory!";
        btn.disabled = true;
    } else {
        let m = monsters[kingdomLevel - 1];
        document.getElementById("kingdom-num").innerText = kingdomLevel;
        document.getElementById("monster-name").innerText = m.name;
        document.getElementById("monster-hp").innerText = "HP: " + m.hp + " Queens Needed";
        
        let btn = document.getElementById("btn-attack");
        if (totalQueens >= m.hp) {
            btn.innerText = "Deploy " + m.hp + " Queens!";
            btn.disabled = false;
        } else {
            btn.innerText = "Need " + (m.hp - totalQueens) + " More";
            btn.disabled = true;
        }
    }
}

function attackMonster() {
    let m = monsters[kingdomLevel - 1];
    if (totalQueens >= m.hp) {
        totalQueens -= m.hp;
        kingdomLevel++;
        alert("You defeated the " + m.name + "!");
        updateMetagameUI();
    }
}

function updateTimerDisplay() {
    let mins = Math.floor(timeLeft / 60);
    let secs = timeLeft % 60;
    document.getElementById("timer").innerText = `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

function startGame() {
    updateTimerDisplay();
    gameInterval = setInterval(() => {
        if (gameEnded) return;
        if (isTimerFrozen) return; // Skip time reduction!
        
        timeLeft--;
        if (timeLeft < 0) timeLeft = 0; // prevent negative
        updateTimerDisplay();
        
        if (timeLeft <= 0) {
            clearInterval(gameInterval);
            endGame();
        }
    }, 1000);
}

function endGame() {
    gameEnded = true;
    isProcessing = true;
    
    totalQueens += queenCount;
    updateMetagameUI();
    
    alert("Time's Up! You harvested " + queenCount + " Queens!\nThey have been added to your Arsenal.");
    
    // Automatically reset the board for next run
    resetSession();
}

function resetSession() {
    timeLeft = 120;
    queenCount = 0;
    gameEnded = false;
    gameStarted = false;
    isProcessing = false;
    isTimerFrozen = false;
    
    document.getElementById("score").innerText = "0";
    updateTimerDisplay();
    
    createBoard(); 
}

function getPieceClass(piece) {
    if (piece === "♟") return "piece-pawn";
    if (piece === "♞") return "piece-knight";
    if (piece === "♜") return "piece-rook";
    if (piece === "♝") return "piece-bishop";
    if (piece === "♛") return "piece-queen";
    return "";
}

function createBoard() {
    board.innerHTML = "";
    for (let r = 0; r < rows; r++) {
        grid[r] = [];
        for (let c = 0; c < cols; c++) {
            let piece;
            do {
                piece = randomPiece();
            } while (
                (c >= 2 && grid[r][c-1]?.piece === piece && grid[r][c-2]?.piece === piece) ||
                (r >= 2 && grid[r-1][c]?.piece === piece && grid[r-2][c]?.piece === piece)
            );
            
            let dom = createDOM(r, c, piece, false);
            grid[r][c] = { piece: piece, dom: dom };
        }
    }
}

function moveDOM(dom, newR, newC) {
    dom.dataset.r = newR;
    dom.dataset.c = newC;
    dom.style.top = `calc(${newR} * var(--tile-sz) + var(--b-gap))`;
    dom.style.left = `calc(${newC} * var(--tile-sz) + var(--b-gap))`;
}

function createDOM(r, c, piece, isFallingFromAbove) {
    const tile = document.createElement("div");
    // Class names: 'tile' and the specific piece color
    tile.className = "tile " + getPieceClass(piece);
    tile.draggable = true;
    tile.innerText = piece;
    
    tile.dataset.r = r;
    tile.dataset.c = c;
    tile.style.width = "var(--tile-sz)";
    tile.style.height = "var(--tile-sz)";
    tile.style.left = `calc(${c} * var(--tile-sz) + var(--b-gap))`;

    if (isFallingFromAbove) {
        let fallR = r - rows;
        tile.style.top = `calc(${fallR} * var(--tile-sz) + var(--b-gap))`;
        board.appendChild(tile);
        
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                tile.style.top = `calc(${r} * var(--tile-sz) + var(--b-gap))`;
            });
        });
    } else {
        tile.style.top = `calc(${r} * var(--tile-sz) + var(--b-gap))`;
        board.appendChild(tile);
    }
    
    tile.addEventListener("dragstart", dragStart);
    tile.addEventListener("dragover", dragOver);
    tile.addEventListener("dragenter", dragEnter);
    tile.addEventListener("dragleave", dragLeave);
    tile.addEventListener("drop", dragDrop);
    tile.addEventListener("dragend", dragEnd);

    // Touch events for mobile
    tile.addEventListener("touchstart", touchStart, {passive: false});
    tile.addEventListener("touchmove", touchMove, {passive: false});
    tile.addEventListener("touchend", touchEnd);

    return tile;
}

function randomPiece() {
    return pieces[Math.floor(Math.random() * pieces.length)];
}

// Drag events
function dragStart() { 
    if(!isProcessing && !gameEnded) {
        currTile = this; 
        if(!gameStarted) {
            gameStarted = true;
            startGame();
        }
    }
}
function dragOver(e) { e.preventDefault(); }
function dragEnter(e) { e.preventDefault(); }
function dragLeave() {}
function dragDrop() { otherTile = this; }

// Touch handlers for mobile
let startX, startY;
let touchSwapped = false;

function touchStart(e) {
    if (e.touches.length > 1) return;
    if(!isProcessing && !gameEnded) {
        currTile = this; 
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        touchSwapped = false;
        
        if(!gameStarted) {
            gameStarted = true;
            startGame();
        }
    }
}

function touchMove(e) {
    if (e.touches.length > 1 || !currTile || isProcessing || gameEnded || touchSwapped) return;
    e.preventDefault(); // Prevents page scrolling while swiping
    
    let currentX = e.touches[0].clientX;
    let currentY = e.touches[0].clientY;

    let diffX = currentX - startX;
    let diffY = currentY - startY;

    // Trigger instantly if finger slides > 20px in any direction!
    if (Math.abs(diffX) > 20 || Math.abs(diffY) > 20) {
        touchSwapped = true;
        let r = parseInt(currTile.dataset.r);
        let c = parseInt(currTile.dataset.c);

        if (Math.abs(diffX) > Math.abs(diffY)) {
            if (diffX > 0) c += 1; else c -= 1; // Horizontal
        } else {
            if (diffY > 0) r += 1; else r -= 1; // Vertical
        }

        if (r >= 0 && r < rows && c >= 0 && c < cols) {
            otherTile = grid[r][c].dom;
            dragEnd();
        } else {
            currTile = null;
        }
    }
}

function touchEnd(e) {
    if (!touchSwapped) {
        currTile = null;
    }
    touchSwapped = false;
}

function dragEnd() {
    if (isProcessing || gameEnded) {
        currTile = null;
        otherTile = null;
        return;
    }
    if (!currTile || !otherTile || currTile === otherTile) {
        currTile = null;
        otherTile = null;
        return;
    }

    let r1 = parseInt(currTile.dataset.r);
    let c1 = parseInt(currTile.dataset.c);
    let r2 = parseInt(otherTile.dataset.r);
    let c2 = parseInt(otherTile.dataset.c);

    let isLeft = r2 == r1 && c2 == c1 - 1;
    let isRight = r2 == r1 && c2 == c1 + 1;
    let isUp = r2 == r1 - 1 && c2 == c1;
    let isDown = r2 == r1 + 1 && c2 == c1;
    let isAdjacent = isLeft || isRight || isUp || isDown;

    if (isAdjacent) {
        let node1 = grid[r1][c1];
        let node2 = grid[r2][c2];

        // Swap memory logically
        grid[r1][c1] = node2;
        grid[r2][c2] = node1;

        // Trigger physical slide
        moveDOM(node2.dom, r1, c1);
        moveDOM(node1.dom, r2, c2);

        lastSwapCoords = [`${r1}-${c1}`, `${r2}-${c2}`];

        let matches = checkMatches();
        if (matches.length > 0) {
            isProcessing = true;
            setTimeout(processBoardTurn, 400); // Let slide finish
        } else {
            // Invalid swap -> swap logic back
            grid[r1][c1] = node1;
            grid[r2][c2] = node2;
            // Slide back visually
            setTimeout(() => {
                moveDOM(node1.dom, r1, c1);
                moveDOM(node2.dom, r2, c2);
            }, 350); 
        }
    }
    
    currTile = null;
    otherTile = null;
}

// Matching logic
function checkMatches() {
    let matchGroups = []; 

    // Horizontal check
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols - 2; c++) {
            let p1 = grid[r][c]?.piece;
            let p2 = grid[r][c+1]?.piece;
            let p3 = grid[r][c+2]?.piece;

            if (p1 && p1 === p2 && p2 === p3) {
                let matchLength = 3;
                while (c + matchLength < cols && grid[r][c + matchLength]?.piece === p1) {
                    matchLength++;
                }

                let group = { piece: p1, coords: [] };
                for (let i = 0; i < matchLength; i++) {
                    group.coords.push(`${r}-${c+i}`);
                }
                matchGroups.push(group);
                c += matchLength - 1; // skip forward
            }
        }
    }

    // Vertical check
    for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows - 2; r++) {
            let p1 = grid[r][c]?.piece;
            let p2 = grid[r+1][c]?.piece;
            let p3 = grid[r+2][c]?.piece;

            if (p1 && p1 === p2 && p2 === p3) {
                let matchLength = 3;
                while (r + matchLength < rows && grid[r + matchLength][c]?.piece === p1) {
                    matchLength++;
                }

                let group = { piece: p1, coords: [] };
                for (let i = 0; i < matchLength; i++) {
                    group.coords.push(`${r+i}-${c}`);
                }
                matchGroups.push(group);
                r += matchLength - 1; // skip downward
            }
        }
    }

    return matchGroups;
}

// SMART CONTEXT BIAS BONUS ALGORITHM
function getBonusType() {
    let freezeWeight = 20;
    let pulseWeight = 30;
    let convWeight = 50;

    if (timeLeft <= 40) freezeWeight += 60; // Desperate for time -> 80
    if (timeLeft < 60 && queenCount < 2) pulseWeight += 50; // Struggling -> 80
    if (queenCount >= 3) convWeight += 40; // Doing well -> 90

    let total = freezeWeight + pulseWeight + convWeight;
    let rand = Math.random() * total;
    
    if (rand < freezeWeight) return "freeze";
    if (rand < freezeWeight + pulseWeight) return "pulse";
    return "conversion";
}

function triggerQueenHarvest() {
    queenCount++;
    let scoreEl = document.getElementById("score");
    scoreEl.innerText = queenCount;
    
    // UI pop on score
    scoreEl.style.transform = "scale(1.8)";
    setTimeout(() => {
        scoreEl.style.transform = "scale(1)";
    }, 500);

    // Board violently shakes and flashes!
    board.classList.add("shake", "board-flash");
    setTimeout(() => board.classList.remove("shake", "board-flash"), 800);
    
    // Giant "Queen Up!" badge
    let badge = document.createElement("div");
    badge.innerHTML = "<span class='queen-fly-icon'>♛</span>Queen Up!";
    badge.className = "queen-fly";
    document.body.appendChild(badge);
    setTimeout(() => badge.remove(), 1600);
}

function showFloatingText(text, r, c, type) {
    let fl = document.createElement("div");
    fl.innerText = text;
    fl.style.position = "absolute";
    fl.style.left = `calc(${c} * var(--tile-sz) + var(--b-gap))`;
    fl.style.top = `calc(${r} * var(--tile-sz) + var(--b-gap))`;
    fl.style.width = "var(--tile-sz)";
    fl.style.height = "var(--tile-sz)";
    fl.style.display = "flex";
    fl.style.alignItems = "center";
    fl.style.justifyContent = "center";
    fl.style.color = type === "freeze" ? "#38bdf8" : type === "pulse" ? "#fb7185" : "#facc15";
    fl.style.fontWeight = "900";
    fl.style.fontSize = "2rem"; // Huge text
    fl.style.zIndex = "100";
    fl.style.textShadow = "0 5px 15px rgba(0,0,0,1), 0 0 20px " + fl.style.color;
    fl.style.transition = "all 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
    fl.style.pointerEvents = "none";
    fl.style.transform = "scale(0.5)";
    board.appendChild(fl);
    
    requestAnimationFrame(() => {
        fl.style.top = (r * 65 - 60) + "px";
        fl.style.opacity = "0";
        fl.style.transform = "scale(1.5)";
    });
    setTimeout(() => { fl.remove(); }, 800);
}

function applyBonusEffect(type, centerR, centerC, centerPiece) {
    showFloatingText(type.toUpperCase() + "!", centerR, centerC, type);

    if (type === "freeze") {
        isTimerFrozen = true;
        let timerBox = document.getElementById("timer-box");
        let timer = document.getElementById("timer");
        timerBox.classList.add("timer-frozen");
        timer.style.color = "#ffffff";
        
        setTimeout(() => { 
            isTimerFrozen = false; 
            timerBox.classList.remove("timer-frozen");
            timer.style.color = "#ffd700";
        }, 3000);
        return;
    }

    if (type === "pulse") {
        let ring = document.createElement("div");
        ring.className = "pulse-ring";
        ring.style.left = (centerC * 65 + 10) + "px";
        ring.style.top = (centerR * 65 + 10) + "px";
        board.appendChild(ring);
        setTimeout(() => ring.remove(), 600);
    }

    let adjacent = [
        [-1,-1], [-1,0], [-1,1],
        [0,-1],          [0,1],
        [1,-1],  [1,0],  [1,1]
    ];

    adjacent.forEach(offset => {
        let r = centerR + offset[0];
        let c = centerC + offset[1];
        if (r >= 0 && r < rows && c >= 0 && c < cols) {
            let node = grid[r][c];
            if (node && node.piece && node.piece !== "") {
                if (type === "pulse") {
                    let nextPiece = upgradeMap[node.piece];
                    if (nextPiece) {
                        setTimeout(() => {
                            if (nextPiece === "♛") {
                                triggerQueenHarvest();
                                updateNodeToPiece(r, c, "");
                            } else {
                                updateNodeToPiece(r, c, nextPiece);
                            }
                        }, 150); 
                    }
                } else if (type === "conversion") {
                    node.dom.classList.add("conversion-effect"); 
                    setTimeout(() => {
                        if (centerPiece === "♛" || !centerPiece) updateNodeToPiece(r, c, "♜");
                        else updateNodeToPiece(r, c, centerPiece);
                        
                        setTimeout(() => {
                            if (grid[r][c] && grid[r][c].dom) {
                                grid[r][c].dom.classList.remove("conversion-effect");
                            }
                        }, 250);
                    }, 250); 
                }
            }
        }
    });
}

function updateNodeToPiece(r, c, newPiece) {
    let node = grid[r][c];
    if (!node) return;
    
    if (newPiece === "") {
        node.dom.style.transform = "scale(0)";
        node.dom.style.opacity = "0";
        setTimeout(() => { node.dom.remove(); }, 300);
        grid[r][c] = null; 
    } else {
        node.piece = newPiece;
        node.dom.innerText = newPiece;
        node.dom.className = "tile " + getPieceClass(newPiece);
        node.dom.style.transform = "scale(1.2)";
        setTimeout(() => {
            if (grid[r][c] && grid[r][c].dom) {
                grid[r][c].dom.style.transform = "scale(1)";
            }
        }, 150);
    }
}

function processBoardTurn() {
    let matchGroups = checkMatches();
    if (matchGroups.length === 0) {
        isProcessing = false;
        return;
    }

    let tilesToEmpty = new Set();
    let upgradesMap = {};
    let bonusesToTrigger = [];

    matchGroups.forEach(group => {
        let pieceToUpgradeTo = upgradeMap[group.piece];
        let spawnCoord = group.coords[0]; 
        let matchLength = group.coords.length;

        for (let swap of lastSwapCoords) {
            if (group.coords.includes(swap)) {
                spawnCoord = swap;
                break;
            }
        }

        if (matchLength >= 4) {
            let bonusType = getBonusType();
            bonusesToTrigger.push({ type: bonusType, coord: spawnCoord, centerPiece: pieceToUpgradeTo || group.piece });
        }

        if (pieceToUpgradeTo) {
            if (pieceToUpgradeTo === "♛") {
                triggerQueenHarvest();
                upgradesMap[spawnCoord] = "";
            } else {
                upgradesMap[spawnCoord] = pieceToUpgradeTo;
            }
        }

        group.coords.forEach(c => tilesToEmpty.add(c));
    });

    // Destroy old matches visually and logically
    tilesToEmpty.forEach(coord => {
        let parts = coord.split("-");
        let r = parseInt(parts[0]);
        let c = parseInt(parts[1]);
        
        let node = grid[r][c];
        if (node && node.dom) {
            node.dom.style.transform = "scale(0)"; // nice shrink effect
            node.dom.style.opacity = "0";
            setTimeout(() => { node.dom.remove(); }, 300);
        }
        grid[r][c] = null;
    });

    // Create the Upgraded Piece immediately
    Object.keys(upgradesMap).forEach(coord => {
        let piece = upgradesMap[coord];
        if (piece === "") return; // Avoid processing harvested queens
        
        let parts = coord.split("-");
        let r = parseInt(parts[0]);
        let c = parseInt(parts[1]);
        
        let dom = createDOM(r, c, piece, false);
        dom.style.transform = "scale(0)";
        grid[r][c] = { piece: piece, dom: dom };
        
        requestAnimationFrame(() => {
            dom.style.transform = "scale(1)";
        });
    });

    // Process bonuses (they apply to the grid instantly and trigger animations)
    bonusesToTrigger.forEach(b => {
        let parts = b.coord.split("-");
        let r = parseInt(parts[0]);
        let c = parseInt(parts[1]);
        applyBonusEffect(b.type, r, c, b.centerPiece);
    });

    // Wait for disappear/pop-up animations, then do gravity
    setTimeout(() => {
        applyGravity();
        lastSwapCoords = []; 
        // Recursive loop checking for cascades
        setTimeout(processBoardTurn, 500); 
    }, 400); 
}

function applyGravity() {
    for (let c = 0; c < cols; c++) {
        let writeR = rows - 1;
        // Slide existing pieces down
        for (let r = rows - 1; r >= 0; r--) {
            if (grid[r][c] !== null) {
                if (writeR !== r) {
                    let node = grid[r][c];
                    grid[writeR][c] = node;
                    grid[r][c] = null;
                    moveDOM(node.dom, writeR, c);
                }
                writeR--;
            }
        }
        // Spawn brand new pieces from the top off-screen
        for (let r = writeR; r >= 0; r--) {
            let newPiece = randomPiece();
            let newDom = createDOM(r, c, newPiece, true);
            grid[r][c] = { piece: newPiece, dom: newDom };
        }
    }
}

createBoard();
