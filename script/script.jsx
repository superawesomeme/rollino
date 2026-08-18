const { useState, useEffect, useRef } = React;

/* ==========================================================================
   CONSTANTS & GAME LOGIC HELPERS
========================================================================== */
const DICE_ROTATIONS = {
    1: { x: 0, y: 0 },
    2: { x: -90, y: 0 },
    3: { x: 0, y: -90 },
    4: { x: 0, y: 90 },
    5: { x: 90, y: 0 },
    6: { x: 180, y: 0 }
};

const generateGame = () => {
    let all = [];
    for (let i = 0; i <= 6; i++) {
        for (let j = i + 1; j <= 6; j++) {
            all.push([i, j]);
        }
    }
    for (let i = all.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [all[i], all[j]] = [all[j], all[i]];
    }
    
    let selected = all.slice(0, 18);
    let newBoard = [];
    
    for (let r = 0; r < 6; r++) {
        for (let d = 0; d < 3; d++) {
            let domIndex = r * 3 + d;
            let domino = selected[domIndex];
            if (Math.random() > 0.5) domino = [domino[1], domino[0]];
            
            newBoard.push({ id: r * 6 + d * 2, value: domino[0], owner: null });
            newBoard.push({ id: r * 6 + d * 2 + 1, value: domino[1], owner: null });
        }
    }
    return newBoard;
};

const checkWin = (b, pId) => {
    const owner = (r, c) => (r >= 0 && r < 6 && c >= 0 && c < 6) ? b[r * 6 + c].owner : null;
    
    for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
            if (owner(r, c) !== pId) continue;
            if (owner(r, c + 1) === pId && owner(r, c + 2) === pId && owner(r, c + 3) === pId) return true;
            if (owner(r + 1, c) === pId && owner(r + 2, c) === pId && owner(r + 3, c) === pId) return true;
            if (owner(r + 1, c + 1) === pId && owner(r + 2, c + 2) === pId && owner(r + 3, c + 3) === pId) return true;
            if (owner(r + 1, c - 1) === pId && owner(r + 2, c - 2) === pId && owner(r + 3, c - 3) === pId) return true;
        }
    }
    return false;
};

const claimWilds = (currentBoard, pId) => {
    let boardCopy = [...currentBoard];
    let changed = false;
    
    const checkPairs = (i) => {
        const r = Math.floor(i / 6);
        const c = i % 6;
        const owner = (row, col) => (row >= 0 && row < 6 && col >= 0 && col < 6) ? boardCopy[row * 6 + col].owner : null;
        
        if (owner(r, c - 1) === pId && owner(r, c + 1) === pId) return true;
        if (owner(r - 1, c) === pId && owner(r + 1, c) === pId) return true;
        if (owner(r - 1, c - 1) === pId && owner(r + 1, c + 1) === pId) return true;
        if (owner(r - 1, c + 1) === pId && owner(r + 1, c - 1) === pId) return true;
        return false;
    };

    let passChanged;
    do {
        passChanged = false;
        for (let i = 0; i < 36; i++) {
            if (boardCopy[i].value === 0 && boardCopy[i].owner === null) {
                if (checkPairs(i)) {
                    boardCopy[i] = { ...boardCopy[i], owner: pId };
                    changed = true;
                    passChanged = true;
                }
            }
        }
    } while (passChanged);
    
    return { newBoard: boardCopy, changed };
};

/* ==========================================================================
   UI SUB-COMPONENTS
========================================================================== */
const Fireworks = ({ winnerColour }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let particles = [];
        let animationFrameId;

        const resize = () => {
            canvas.width = canvas.parentElement.offsetWidth;
            canvas.height = canvas.parentElement.offsetHeight;
        };
        window.addEventListener('resize', resize);
        resize();

        const getColour = () => {
            if (winnerColour === 'red') return `hsl(${Math.random() * 20 + 345}, 100%, 60%)`;
            if (winnerColour === 'blue') return `hsl(${Math.random() * 30 + 195}, 100%, 60%)`;
            return `hsl(${Math.random() * 360}, 100%, 60%)`; 
        };

        const createExplosion = (x, y) => {
            const particleCount = 40 + Math.random() * 30;
            for (let i = 0; i < particleCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 6 + 2;
                particles.push({
                    x, y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 1,
                    decay: Math.random() * 0.015 + 0.015,
                    color: getColour()
                });
            }
        };

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            if (Math.random() < 0.04) {
                createExplosion(Math.random() * canvas.width, Math.random() * canvas.height * 0.6);
            }

            particles.forEach((p, i) => {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.1; 
                p.life -= p.decay;
                
                if (p.life <= 0) {
                    particles.splice(i, 1);
                } else {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                    ctx.fillStyle = p.color;
                    ctx.globalAlpha = p.life;
                    ctx.fill();
                }
            });
            ctx.globalAlpha = 1; 
            animationFrameId = requestAnimationFrame(render);
        };

        render();
        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [winnerColour]);

    return <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none w-full h-full" />;
};

const PipLayout = ({ val, recessed = false }) => {
    const gridMap = {
        0: [], 1: [4], 2: [2, 6], 3: [2, 4, 6],
        4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 3, 6, 2, 5, 8]
    };
    const active = gridMap[val] || [];
    
    return (
        <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-[2px] p-[20%] place-items-center">
            {[...Array(9)].map((_, i) => (
                <div key={i} className="flex items-center justify-center w-full h-full">
                    {active.includes(i) && (
                        <div style={{ width: '85%', aspectRatio: '1/1' }} className={`rounded-full bg-[#535860] ${recessed ? 'domino-pip' : ''}`}></div>
                    )}
                </div>
            ))}
        </div>
    );
};

const Token = ({ color }) => (
    <div className="board-counter-position absolute z-20">
        <img
            src={`images/counter-${color}.png`}
            alt=""
            aria-hidden="true"
            className="counter-art board-counter-art w-full h-full"
        />
    </div>
);

const Cell = ({ cell, onClick, isValid, isLeft }) => (
    <div onClick={onClick} className={`relative w-full h-full flex-1 cursor-pointer flex items-center justify-center bg-transparent ${isLeft ? 'domino-cell-left' : ''}`}>
        <PipLayout val={cell.value} recessed={true} />
        {cell.owner && <Token color={cell.owner === 'p1' ? 'red' : 'blue'} />}
        {isValid && (
            <div className="valid-move-hint absolute inset-0 rounded-[8px] pointer-events-none z-10"></div>
        )}
    </div>
);

const Dice = ({ rolling, value }) => {
    const [spins, setSpins] = useState(0);
    const [rot, setRot] = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (rolling) {
            const newSpins = spins + 1;
            setSpins(newSpins);
            const target = DICE_ROTATIONS[value || 1];
            const extraSpinX = 720 + (Math.floor(Math.random() * 2) * 360);
            const extraSpinY = 720 + (Math.floor(Math.random() * 2) * 360);
            setRot({
                x: target.x + (newSpins * extraSpinX),
                y: target.y + (newSpins * extraSpinY)
            });
        }
    }, [rolling, value]);

    return (
        <div className={`dice-scene ml-4 ${rolling ? 'dice-jumping' : ''}`}>
            <div className="dice-cube" style={{ transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg)` }}>
                <div className="dice-face dice-face-front"><PipLayout val={1} /></div>
                <div className="dice-face dice-face-back"><PipLayout val={6} /></div>
                <div className="dice-face dice-face-right"><PipLayout val={3} /></div>
                <div className="dice-face dice-face-left"><PipLayout val={4} /></div>
                <div className="dice-face dice-face-top"><PipLayout val={2} /></div>
                <div className="dice-face dice-face-bottom"><PipLayout val={5} /></div>
            </div>
        </div>
    );
};

/* ==========================================================================
   MAIN APPLICATION COMPONENT
========================================================================== */
function App() {
    // --- STATE MANAGEMENT ---
    const [players, setPlayers] = useState({
        p1: { name: 'Player 1', color: 'red' },
        p2: { name: 'Player 2', color: 'blue', isBot: false }
    });
    const [scores, setScores] = useState({ p1: 0, p2: 0 });
    const [roundNumber, setRoundNumber] = useState(1);
    const [gamePhase, setGamePhase] = useState('setup');
    const [board, setBoard] = useState([]);
    const [currentPlayer, setCurrentPlayer] = useState('p1');
    const [diceTarget, setDiceTarget] = useState(1);
    const [currentRoll, setCurrentRoll] = useState(null);
    const [diceRolling, setDiceRolling] = useState(false);
    const [winner, setWinner] = useState(null);
    const [notification, setNotification] = useState('');

    // --- GAME ACTIONS ---
    const startGame = (nextMatch = false) => {
        setBoard(generateGame());
        setGamePhase('playing');
        setCurrentRoll(null);
        setWinner(null);
        setNotification('');
        
        if (!nextMatch) {
            setScores({ p1: 0, p2: 0 });
            setRoundNumber(1);
            setCurrentPlayer('p1');
        } else {
            const nextRound = roundNumber + 1;
            setRoundNumber(nextRound);
            setCurrentPlayer(nextRound % 2 === 0 ? 'p2' : 'p1');
        }
    };

    const handleRoll = () => {
        if (gamePhase !== 'playing' || diceRolling || currentRoll !== null) return;
        setDiceRolling(true);
        
        const result = Math.floor(Math.random() * 6) + 1;
        setDiceTarget(result); 
        
        setTimeout(() => {
            setDiceRolling(false);
            setCurrentRoll(result);
            
            setBoard(currentBoardState => {
                const hasValidMoves = currentBoardState.some(c => c.value === result && c.owner === null);
                if (!hasValidMoves) {
                    setNotification(`No ${result}s left! Turn skipped.`);
                    setTimeout(() => {
                        setNotification('');
                        setCurrentPlayer(prev => prev === 'p1' ? 'p2' : 'p1');
                        setCurrentRoll(null);
                    }, 2000);
                }
                return currentBoardState;
            });
        }, 1200);
    };

    const handleCellClick = (index) => {
        if (gamePhase !== 'playing' || diceRolling || currentRoll === null) return;
        
        setBoard(currentBoardState => {
            const cell = currentBoardState[index];
            if (cell.owner !== null || cell.value !== currentRoll) return currentBoardState;
            
            let newBoard = [...currentBoardState];
            newBoard[index] = { ...newBoard[index], owner: currentPlayer };
            
            const wildResult = claimWilds(newBoard, currentPlayer);
            newBoard = wildResult.newBoard;
            
            setCurrentRoll(null);
            
            if (wildResult.changed) {
                setNotification('Bonus Tile Claimed!');
                setTimeout(() => setNotification(''), 1500);
            }
            
            if (checkWin(newBoard, currentPlayer)) {
                setTimeout(() => {
                    setWinner(currentPlayer);
                    setGamePhase('gameOver');
                    setScores(prev => ({ ...prev, [currentPlayer]: prev[currentPlayer] + 1 }));
                }, 600);
                return newBoard;
            }
            
            if (!newBoard.some(c => c.value > 0 && c.owner === null)) {
                setTimeout(() => {
                    setWinner('draw');
                    setGamePhase('gameOver');
                }, 600);
                return newBoard;
            }
            
            setCurrentPlayer(prev => prev === 'p1' ? 'p2' : 'p1');
            return newBoard;
        });
    };

    // --- AI BOT LOGIC ---
    useEffect(() => {
        if (gamePhase !== 'playing' || currentPlayer !== 'p2' || !players.p2.isBot) return;

        let timeoutId;
        if (currentRoll === null && !diceRolling) {
            timeoutId = setTimeout(() => handleRoll(), 1500); 
        } else if (currentRoll !== null && !diceRolling) {
            const validMoves = board.filter(c => c.value === currentRoll && c.owner === null);
            
            if (validMoves.length > 0) {
                timeoutId = setTimeout(() => {
                    let bestScore = -Infinity;
                    let bestMoves = [];
                    const oppId = 'p1';
                    const myId = 'p2';

                    const evaluateBoard = (b) => {
                        let score = 0;
                        const lines = [];
                        
                        // Rows, Cols, Diagonals logic
                        for(let r = 0; r < 6; r++) for(let c = 0; c < 3; c++) lines.push([r*6+c, r*6+c+1, r*6+c+2, r*6+c+3]);
                        for(let c = 0; c < 6; c++) for(let r = 0; r < 3; r++) lines.push([(r)*6+c, (r+1)*6+c, (r+2)*6+c, (r+3)*6+c]);
                        for(let r = 0; r < 3; r++) for(let c = 0; c < 3; c++) lines.push([(r)*6+c, (r+1)*6+c+1, (r+2)*6+c+2, (r+3)*6+c+3]);
                        for(let r = 0; r < 3; r++) for(let c = 3; c < 6; c++) lines.push([(r)*6+c, (r+1)*6+c-1, (r+2)*6+c-2, (r+3)*6+c-3]);

                        for(let line of lines) {
                            let myCount = 0, oppCount = 0;
                            for(let idx of line) {
                                if (b[idx].owner === myId) myCount++;
                                else if (b[idx].owner === oppId) oppCount++;
                            }
                            
                            if (myCount === 4) return 100000; 
                            
                            if (myCount > 0 && oppCount === 0) {
                                if (myCount === 3) score += 100;
                                else if (myCount === 2) score += 10;
                                else if (myCount === 1) score += 1;
                            } else if (oppCount > 0 && myCount === 0) {
                                if (oppCount === 3) score -= 1000; 
                                else if (oppCount === 2) score -= 10;
                                else if (oppCount === 1) score -= 1;
                            }
                        }
                        return score;
                    };

                    for (const move of validMoves) {
                        let simBoard = [...board];
                        simBoard[move.id] = { ...simBoard[move.id], owner: myId };
                        simBoard = claimWilds(simBoard, myId).newBoard;
                        
                        let score = evaluateBoard(simBoard);
                        if (score > bestScore) {
                            bestScore = score;
                            bestMoves = [move];
                        } else if (score === bestScore) {
                            bestMoves.push(move);
                        }
                    }
                    
                    const chosenMove = bestMoves[Math.floor(Math.random() * bestMoves.length)];
                    handleCellClick(chosenMove.id);
                }, 1200); 
            }
        }
        return () => clearTimeout(timeoutId);
    }, [currentPlayer, currentRoll, gamePhase, diceRolling, players.p2.isBot, board]);

    /* ==========================================================================
       RENDER: SETUP VIEW
    ========================================================================== */
    const renderSetup = () => (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
            <div className="bg-white/90 backdrop-blur-md p-8 rounded-[32px] shadow-2xl w-full max-w-sm text-center relative z-10">
                <div className="flex justify-center mb-8">
                    <img src="images/rollino-logo.svg" alt="Rollino Logo" className="w-72 h-auto max-w-full drop-shadow-md" />
                </div>
                
                <div className="space-y-6 mb-8 text-left">
                    <div>
                        <label className="font-poetsen-one text-sm text-gray-500 uppercase tracking-wide ml-2 mb-1 block">Player 1</label>
                        <div className="relative">
                            <img src="images/counter-red.png" alt="" aria-hidden="true" className="counter-art absolute left-3.5 top-1/2 -translate-y-1/2 w-6 h-6" />
                            <input type="text" value={players.p1.name} onChange={e => setPlayers({...players, p1: {...players.p1, name: e.target.value}})} className="w-full bg-gray-100/50 text-gray-800 px-12 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#61adc0] border-2 border-transparent focus:bg-white transition-all font-medium" maxLength={12} />
                        </div>
                    </div>

                    <div className="border-t border-gray-200 pt-6">
                        <div className="flex items-center justify-between mb-3 px-2">
                            <label className="font-poetsen-one text-sm text-gray-500 uppercase tracking-wide">Player 2</label>
                            <div className="flex bg-gray-100 p-1 rounded-xl">
                                <button onClick={() => setPlayers({...players, p2: {...players.p2, isBot: false, name: 'Player 2'}})} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${!players.p2.isBot ? 'bg-white shadow-sm text-[#298de6]' : 'text-gray-400'}`}>Human</button>
                                <button onClick={() => setPlayers({...players, p2: {...players.p2, isBot: true, name: 'Rolly'}})} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${players.p2.isBot ? 'bg-white shadow-sm text-[#298de6]' : 'text-gray-400'}`}>Computer</button>
                            </div>
                        </div>
                        <div className="relative">
                            <img src="images/counter-blue.png" alt="" aria-hidden="true" className="counter-art absolute left-3.5 top-1/2 -translate-y-1/2 w-6 h-6" />
                            <input type="text" value={players.p2.name} disabled={players.p2.isBot} onChange={e => setPlayers({...players, p2: {...players.p2, name: e.target.value}})} className={`w-full text-gray-800 px-12 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#61adc0] border-2 border-transparent transition-all font-medium ${players.p2.isBot ? 'bg-gray-200/50 text-gray-500 cursor-not-allowed' : 'bg-gray-100/50 focus:bg-white'}`} maxLength={12} />
                        </div>
                    </div>
                </div>
                
                <div className="space-y-3">
                    <button onClick={() => startGame(false)} className="font-poetsen-one w-full bg-gradient-to-b from-[#ffd659] to-[#f09600] text-[#7a4b00] text-xl py-4 rounded-full shadow-[0_6px_0_#c27a00,0_10px_10px_rgba(0,0,0,0.2)] active:shadow-[0_0px_0_#c27a00,0_2px_5px_rgba(0,0,0,0.2)] active:translate-y-[6px] transition-all">
                        PLAY
                    </button>
                    <button onClick={() => setGamePhase('instructions')} className="font-poetsen-one w-full bg-gray-100/50 hover:bg-gray-200/80 text-[#4a8f9c] text-lg py-3 rounded-full shadow-[0_4px_0_rgba(74,143,156,0.15)] active:shadow-[0_0px_0_rgba(74,143,156,0.15)] active:translate-y-[4px] transition-all border border-black/5">
                        HOW TO PLAY
                    </button>
                </div>
                
                <div className="mt-8 text-xs font-semibold text-[#4a8f9c]/70 tracking-wider uppercase">
                    Created by Richard and Shaun Daubney
                </div>
            </div>
        </div>
    );

    /* ==========================================================================
       RENDER: INSTRUCTIONS VIEW
    ========================================================================== */
    const renderInstructions = () => (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            <div className="bg-white/90 backdrop-blur-md p-6 sm:p-8 rounded-[32px] shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col relative z-10">
                <h2 className="text-3xl font-extrabold text-[#4a8f9c] mb-6 text-center tracking-wide">HOW TO PLAY</h2>

                <div className="flex-1 overflow-y-auto pr-3 space-y-6 text-left text-sm sm:text-base instructions-scroll">
                    <section>
                        <h3 className="font-bold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-2">
                            <span className="bg-[#4a8f9c] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span> Objective
                        </h3>
                        <p className="text-gray-600">Be the first player to make a continuous line of 4 tiles in a row (horizontally, vertically or diagonally).</p>
                    </section>
                    <section>
                        <h3 className="font-bold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-2">
                            <span className="bg-[#4a8f9c] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span> Setup
                        </h3>
                        <p className="text-gray-600">The dominoes are randomly arranged into a 6x6 grid. Each player is assigned a set of coloured tiles.</p>
                    </section>
                    <section>
                        <h3 className="font-bold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-2">
                            <span className="bg-[#4a8f9c] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span> Game Flow
                        </h3>
                        <ul className="list-disc pl-5 text-gray-600 space-y-2">
                            <li>Players take turns rolling the die.</li>
                            <li>Cover one square showing the matching number with one of your coloured tiles.</li>
                            <li>If you roll a number that no longer appears on the board, you forfeit that roll and your turn ends.</li>
                        </ul>
                    </section>
                    <section>
                        <h3 className="font-bold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-2">
                            <span className="bg-[#4a8f9c] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">4</span> Bonus Wild Tiles
                        </h3>
                        <p className="text-gray-600 mb-2">Blank squares (showing zero) cannot be claimed by rolling.</p>
                        <p className="text-gray-600">If you already have one of your tiles on <strong>both sides</strong> of a blank square (horizontally, vertically or diagonally), you automatically claim that blank square as a bonus wild tile.</p>
                    </section>
                </div>

                <button onClick={() => setGamePhase('setup')} className="mt-6 w-full bg-gradient-to-b from-[#ffd659] to-[#f09600] text-[#7a4b00] font-black text-lg py-4 rounded-full shadow-[0_6px_0_#c27a00] active:shadow-[0_0px_0_#c27a00] active:translate-y-[6px] transition-all flex-shrink-0">
                    GOT IT
                </button>
            </div>
        </div>
    );

    /* ==========================================================================
       RENDER: PLAYING / GAMEOVER VIEW
    ========================================================================== */
    const renderPlaying = () => {
        const isBotTurn = currentPlayer === 'p2' && players.p2.isBot;
        const isRollDisabled = gamePhase !== 'playing' || diceRolling || currentRoll !== null || isBotTurn;

        let actionText = 'ROLL DICE';
        if (diceRolling) actionText = 'ROLLING...';
        else if (currentRoll !== null && isBotTurn) actionText = 'PLACING...';
        else if (currentRoll !== null) actionText = 'PLACE TILE';
        else if (isBotTurn) actionText = 'THINKING...';

        const panelOuterShadowClass = currentPlayer === 'p1'
            ? 'shadow-[0_8px_20px_rgba(214,40,40,0.4)]'
            : 'shadow-[0_8px_20px_rgba(26,124,216,0.4)]';

        let winnerBgClass = "bg-white border-gray-300";
        let winnerTextClass = "text-gray-700";
        let winnerFireworkColour = "mixed";

        if (winner === 'p1') {
            winnerBgClass = "bg-gradient-to-br from-[#ffeaea] to-[#fdb6b6] border-[#ed404c]";
            winnerTextClass = "text-[#d62828]";
            winnerFireworkColour = "red";
        } else if (winner === 'p2') {
            winnerBgClass = "bg-gradient-to-br from-[#eaf4ff] to-[#b6dafd] border-[#298de6]";
            winnerTextClass = "text-[#0a5699]";
            winnerFireworkColour = "blue";
        }

        return (
            <div className="playing-viewport min-h-screen flex items-start sm:items-center justify-center sm:p-4">
                <div className="playing-shell w-full min-h-screen sm:min-h-0 sm:h-[90vh] sm:max-h-[900px] sm:max-w-md sm:rounded-[40px] overflow-hidden relative flex flex-col">
                    
                    {/* HEADER */}
                    <div className="playing-header px-5 pt-8 sm:pt-6 pb-4 flex justify-between items-center z-10 relative">
                        <button onClick={() => setGamePhase('setup')} className="w-12 h-12 bg-white/40 hover:bg-white/60 rounded-[14px] flex items-center justify-center shadow-sm backdrop-blur-sm transition-colors text-[#5a9a9c]">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        </button>
                        
                        <div className="flex items-center justify-center flex-1 px-3">
                            <img src="images/rollino-logo.svg" alt="Rollino Logo" className="w-60 h-auto drop-shadow-md" />
                        </div>
                        
                        <div className="bg-[#6b9ca3]/80 backdrop-blur-md px-3 py-2 rounded-full flex gap-3 items-center shadow-inner border border-white/20">
                            <div className="flex items-center gap-1.5">
                                <img src="images/counter-red.png" alt="Red score" className="counter-art w-5 h-5" />
                                <span className="text-white font-bold text-base">{scores.p1}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <img src="images/counter-blue.png" alt="Blue score" className="counter-art w-5 h-5" />
                                <span className="text-white font-bold text-base">{scores.p2}</span>
                            </div>
                        </div>
                    </div>

                    {/* BOARD AREA */}
                    <div className="playing-board-area flex-none sm:flex-1 px-4 sm:px-6 flex items-center justify-center z-10 relative">
                        <div className="game-board-art w-full aspect-square max-w-[380px] relative mx-auto">
                            <div className="relative z-10 w-full h-full grid grid-rows-6 gap-[4px] sm:gap-[6px]">
                                {[0, 1, 2, 3, 4, 5].map(r => (
                                    <div key={r} className="grid grid-cols-3 gap-[4px] sm:gap-[6px] w-full h-full">
                                        {[0, 1, 2].map(d => {
                                            const c1 = board[r * 6 + d * 2];
                                            const c2 = board[r * 6 + d * 2 + 1];
                                            const isValid1 = gamePhase === 'playing' && !diceRolling && currentRoll !== null && c1.value === currentRoll && c1.owner === null;
                                            const isValid2 = gamePhase === 'playing' && !diceRolling && currentRoll !== null && c2.value === currentRoll && c2.owner === null;
                                            
                                            return (
                                                <div key={d} className="flex bg-[#fbe6d3] rounded-[15px] shadow-[0_3px_5px_rgba(0,0,0,0.15)] border-b-[3px] border-[#d4bca4] overflow-hidden">
                                                    <Cell cell={c1} onClick={() => !isBotTurn && handleCellClick(c1.id)} isValid={isValid1} isLeft={true} />
                                                    <Cell cell={c2} onClick={() => !isBotTurn && handleCellClick(c2.id)} isValid={isValid2} isLeft={false} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* BOTTOM CONTROL PANEL */}
                    <div className="playing-controls-area mt-3 sm:mt-auto px-4 pb-6 sm:pb-5 pt-0 sm:pt-1 z-10 relative">
                        <div className={`rounded-[24px] relative flex flex-col items-center p-5 transition-shadow duration-700 ${panelOuterShadowClass}`}>
                            <div className="player-panel-glass-red absolute inset-0" />

                            <div
                                className="player-panel-glass-blue absolute inset-0 transition-all duration-700 ease-in-out z-0"
                                style={{ clipPath: currentPlayer === 'p2' ? 'circle(150% at 50% 50%)' : 'circle(0% at 50% 50%)' }}
                            />

                            <div className="relative z-10 w-full flex flex-col items-center">
                                <div className="font-poetsen-one text-white text-2xl mb-4 drop-shadow-md">
                                    {notification ? notification : `${players[currentPlayer].name}'s turn`}
                                </div>
                                
                                <div className="flex w-full items-center justify-between gap-4 min-h-[70px]">
                                    <Dice rolling={diceRolling} value={diceTarget} />
                                    
                                    {isRollDisabled ? (
                                        <div className="flex-1 flex items-center justify-center">
                                            <span className="font-poetsen-one text-white text-2xl animate-pulse tracking-widest drop-shadow-lg">
                                                {actionText}
                                            </span>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={handleRoll}
                                            className="font-poetsen-one flex-1 py-4 rounded-full text-xl transition-all bg-gradient-to-b from-[#ffd659] to-[#f09600] text-[#7a4b00] shadow-[0_6px_0_#c27a00,0_10px_10px_rgba(0,0,0,0.2)] active:shadow-[0_0px_0_#c27a00,0_2px_5px_rgba(0,0,0,0.2)] active:translate-y-[6px]"
                                        >
                                            {actionText}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* GAME OVER OVERLAY */}
                    {gamePhase === 'gameOver' && (
                        <div className="absolute inset-0 z-50 overflow-hidden flex items-center justify-center">
                            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-0"></div>
                            <Fireworks winnerColour={winnerFireworkColour} />
                            
                            <div className={`relative z-10 rounded-[32px] p-8 text-center shadow-[0_0_50px_rgba(0,0,0,0.6)] max-w-sm w-[90%] transform scale-100 animate-in zoom-in-95 border-4 ${winnerBgClass}`}>
                                <h2 className={`font-poetsen-one text-3xl mb-6 uppercase ${winnerTextClass}`}>
                                    {winner === 'draw' ? 'Match Drawn!' : `${players[winner].name} Wins!`}
                                </h2>
                                
                                <div className="space-y-4">
                                    <button onClick={() => startGame(true)} className="font-poetsen-one w-full bg-gradient-to-b from-[#ffd659] to-[#f09600] text-[#7a4b00] text-lg py-4 rounded-full shadow-[0_6px_0_#c27a00] active:shadow-[0_0px_0_#c27a00] active:translate-y-[6px] transition-all">
                                        PLAY ROUND {roundNumber + 1}
                                    </button>
                                    <button onClick={() => setGamePhase('setup')} className="font-poetsen-one w-full bg-gray-100/50 hover:bg-gray-200/80 text-gray-800 text-lg py-4 rounded-full shadow-[0_6px_0_rgba(0,0,0,0.1)] active:shadow-[0_0px_0_rgba(0,0,0,0.1)] active:translate-y-[6px] transition-all backdrop-blur-sm border border-black/10">
                                        MAIN MENU
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <React.Fragment>
            {gamePhase === 'setup' && renderSetup()}
            {gamePhase === 'instructions' && renderInstructions()}
            {(gamePhase === 'playing' || gamePhase === 'gameOver') && renderPlaying()}
        </React.Fragment>
    );
}

// Render the application to the DOM
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
