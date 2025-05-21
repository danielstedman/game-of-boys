import { UNITS, FACTIONS } from './units.js';

// Make sure the DOM is fully loaded before initializing
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM Content Loaded");
    
    // Initialize game elements
    const welcomeScreen = document.getElementById("welcome-screen");
    const gameArea = document.getElementById("game-area");
    const startGameBtn = document.getElementById("start-game-btn");
    const gameBoard = document.getElementById("game-board");
    const controlsArea = document.getElementById("controls-area");
    const logArea = document.getElementById("log-area");
    const gameOverOverlay = document.getElementById("game-over-overlay");
    const gameOverMessage = document.getElementById("game-over-message");

    console.log("Elements initialized:", {
        welcomeScreen,
        gameArea,
        startGameBtn,
        gameBoard,
        controlsArea,
        logArea,
        gameOverOverlay,
        gameOverMessage
    });

    // Game constants
    const BOARD_SIZE = 16;
    const PLAYER_DEPLOYMENT_ROWS = FACTIONS.crown.deploymentRows;
    const ENEMY_DEPLOYMENT_ROWS = FACTIONS.horde.deploymentRows;
    const TERRAIN_TYPES = ["grass", "forest", "sand"];
    const TERRAIN_REPRESENTATION = {
        grass: "G",
        forest: "F",
        sand: "S"
    };

    // Game state
    let selectedUnitType = null;
    let playerPoints = 1000;
    let unitStatsDisplay = null;
    let pointsDisplay = null;
    let placedUnits = {};
    let gameLog = [];
    let battleStarted = false;
    let turnNumber = 0;
    let battleTimeout = null;
    let currentTurnUnitOrder = [];
    let currentUnitIndex = 0;
    const ACTION_DELAY = 500;
    const TURN_START_DELAY = 1000;

    const HORDE_UNIT_IDS = Object.keys(UNITS.horde);

    const IMPORTANT_EVENT_TYPES = ['death', 'crit', 'spell', 'important', 'victory', 'defeat'];
    const FLASH_CLASS_MAP = {
        death: 'log-flash-death',
        crit: 'log-flash-crit',
        spell: 'log-flash-spell',
        victory: 'log-flash-victory',
        defeat: 'log-flash-defeat',
        important: 'log-flash-important'
    };

    // --- Expanded and dynamic log templates ---
    const LOG_TEMPLATES = {
        attack: [
            '[A] strikes at [D].',
            '[A] slashes [D] with a blade.',
            '[A] lunges at [D], weapon ready.',
            '[A] delivers a crushing blow to [D].',
            '[A] attacks [D] with deadly precision.',
            '[A] swings at [D] and connects.'
        ],
        move: [
            '[U] advances cautiously.',
            '[U] moves into position.',
            '[U] steps forward.',
            '[U] circles the enemy.',
            '[U] closes the distance.'
        ],
        hold: [
            '[U] holds ground.',
            '[U] waits for an opening.',
            '[U] stands ready.',
            '[U] braces for attack.'
        ],
        death: [
            '[D] falls to the ground, defeated.',
            '[D] collapses from wounds.',
            '[D] is slain.',
            '[D] breathes their last.'
        ],
        spell: [
            '[A] utters an incantation.',
            '[A] releases a burst of magic.',
            '[A] calls forth arcane power.',
            '[A] gestures and a spell erupts.'
        ],
        crit: [
            '[A] lands a devastating blow on [D]!',
            '[A] strikes a vital spot!',
            '[A] delivers a critical hit to [D]!',
            '[A] wounds [D] grievously!'
        ]
    };

    // --- Nicknames and titles ---
    const UNIT_NICKNAMES = [
        'the Brave', 'the Cowardly', 'the Swift', 'the Unlucky', 'the Bold', 'the Sassy', 'the Mysterious', 'the Unstoppable', 'the Sleepy', 'the Daring', 'the Reluctant', 'the Lucky', 'the Fearless', 'the Cunning', 'the Loud', 'the Silent'
    ];
    function getUnitNickname(unit) {
        if (unit.isHero && unit.heroName) return unit.heroName;
        if (Math.random() < 0.15) {
            // 15% chance to use a nickname
            return `${unit.name} ${UNIT_NICKNAMES[Math.floor(Math.random() * UNIT_NICKNAMES.length)]}`;
        }
        return unit.name;
    }

    // --- Narrator and rare event logic ---
    const NARRATOR_LINES = [
        'The gods watch with interest...',
        'A hush falls over the battlefield.',
        'Somewhere, a bard is already writing a song about this.',
        'The ground trembles with anticipation.',
        'A distant thunder rolls. Is it an omen?',
        'The wind whispers: "Who will be victorious?"',
        'A crow caws ominously.'
    ];
    function maybeNarratorLine() {
        if (Math.random() < 0.03) { // 3% chance
            return NARRATOR_LINES[Math.floor(Math.random() * NARRATOR_LINES.length)];
        }
        return null;
    }

    // --- Rare battle-related surprises ---
    const RARE_BATTLE_EVENTS = [
        'A stray arrow lands harmlessly in the mud.',
        'A helmet rolls across the field.',
        "A sudden gust of wind blows dust in everyone's eyes.",
        'A frog hops between the combatants, undisturbed.',
        'A banner falls, but is quickly raised again.',
        'A mysterious figure is seen watching from afar.'
    ];
    function maybeRareBattleEvent() {
        if (Math.random() < 0.01) { // 1% chance
            return RARE_BATTLE_EVENTS[Math.floor(Math.random() * RARE_BATTLE_EVENTS.length)];
        }
        return null;
    }

    // --- Context-aware flavor (low health, kill streaks, etc.) ---
    function logContextFlavor(unit) {
        if (unit.currentHp > 0 && unit.currentHp < unit.hp * 0.25) {
            logMessage(`${getUnitNickname(unit)} is barely standing!`, 'important', false, unit.faction);
        }
        if (unit.kills && unit.kills >= 3 && Math.random() < 0.3) {
            logMessage(`${getUnitNickname(unit)} is on a rampage! (${unit.kills} kills)`, 'important', false, unit.faction);
        }
    }

    // --- Patch logMessage to use new flavor logic ---
    const originalLogMessage = logMessage;
    logMessage = function(message, type = 'normal', isDramatic = false, faction = null) {
        // Occasionally insert a narrator line
        const narrator = maybeNarratorLine();
        if (narrator) {
            originalLogMessage(`🗣️ ${narrator}`, 'important', true);
        }
        // Occasionally insert a rare battle event
        const rare = maybeRareBattleEvent();
        if (rare) {
            originalLogMessage(`🎲 ${rare}`, 'normal', false);
        }
        // Replace [A], [D], [U] with nicknames sometimes
        message = message.replace(/\[A\]/g, (match, offset, str) => {
            // Try to find attacker in context
            if (window.lastAttacker) return getUnitNickname(window.lastAttacker);
            return match;
        });
        message = message.replace(/\[D\]/g, (match, offset, str) => {
            if (window.lastDefender) return getUnitNickname(window.lastDefender);
            return match;
        });
        message = message.replace(/\[U\]/g, (match, offset, str) => {
            if (window.lastUnit) return getUnitNickname(window.lastUnit);
            return match;
        });
        return originalLogMessage(message, type, isDramatic, faction);
    };

    // --- Patch fillTemplate to set lastAttacker/Defender/Unit for nickname logic ---
    const originalFillTemplate = fillTemplate;
    fillTemplate = function(template, data) {
        if (data.attackerObj) window.lastAttacker = data.attackerObj;
        if (data.defenderObj) window.lastDefender = data.defenderObj;
        if (data.unitObj) window.lastUnit = data.unitObj;
        return originalFillTemplate(template, data);
    };

    // --- Patch attackUnit and moveUnit to call logContextFlavor ---
    const originalAttackUnit = attackUnit;
    attackUnit = async function(attacker, target) {
        const result = await originalAttackUnit.apply(this, arguments);
        if (attacker) logContextFlavor(attacker);
        if (target) logContextFlavor(target);
        return result;
    };
    const originalMoveUnit = moveUnit;
    moveUnit = async function(unit, targetEnemy) {
        const result = await originalMoveUnit.apply(this, arguments);
        if (unit) logContextFlavor(unit);
        return result;
    };

    // --- Game State for Mode Selection ---
    const gameState = {
        mode: 'single', // or 'two-player'
        deploymentPhase: null // 'crown', 'horde', or null
    };

    // --- Two-Player Deployment Flow ---
    let hordePoints = 1000;
    let hordeDeployedUnits = {};
    function setupTwoPlayerDeployment() {
        // Player 1: Crown deployment
        playerPoints = 1000;
        gameState.deploymentPhase = 'crown';
        updatePointsDisplay();
        showDeploymentModal('Player 1: Deploy your army (Crown)', true, 'OK');
        // Add 'Done Deploying' button
        const controlsArea = document.getElementById('controls-area');
        if (controlsArea && !document.getElementById('done-deploy-btn')) {
            const doneBtn = document.createElement('button');
            doneBtn.id = 'done-deploy-btn';
            doneBtn.textContent = 'Done Deploying';
            doneBtn.style.marginTop = '18px';
            doneBtn.style.width = '100%';
            doneBtn.style.fontSize = '1.1em';
            doneBtn.onclick = () => {
                // Hide Crown units visually
                Object.values(placedUnits).forEach(u => {
                    if (u.faction === 'crown') {
                        const el = document.getElementById(u.id);
                        if (el) el.style.visibility = 'hidden';
                    }
                });
                controlsArea.innerHTML = '';
                showDeploymentModal("Pass the device to Player 2 (Horde). Crown's forces are hidden.", true, "Begin Horde Deployment", () => {
                    // Start Horde deployment (manual for two-player, auto for single)
                    if (gameState.mode === 'single') {
                        generateHordeDeployment();
                        startBattle();
                    } else if (gameState.mode === 'two-player') {
                        startHordeDeployment();
                    }
                });
            };
            controlsArea.appendChild(doneBtn);
        }
    }
    function startHordeDeployment() {
        // Reset points and allow Horde deployment
        hordePoints = 1000;
        gameState.deploymentPhase = 'horde';
        updatePointsDisplayHorde();
        // Remove all Crown units from the board visually
        Object.values(placedUnits).forEach(u => {
            if (u.faction === 'crown') {
                const el = document.getElementById(u.id);
                if (el) el.style.visibility = 'hidden';
            }
        });
        // Show Horde deployment message
        showDeploymentModal('Player 2: Deploy your army (Horde)', true, 'OK', () => {
            createControls();
            // Rebind all tile click events for Horde deployment
            document.querySelectorAll('.tile').forEach(tile => {
                tile.removeEventListener('click', handleTileClick);
                tile.addEventListener('click', twoPlayerHandleTileClick);
            });
            // Set default selected unit type for Horde
            selectedUnitType = Object.keys(UNITS.horde)[0];
            const defaultUnitBtn = document.querySelector(`.unit-select-btn[data-unit-id="${selectedUnitType}"]`);
            if (defaultUnitBtn) defaultUnitBtn.click();
            // Add 'Start Battle' button ONLY after Horde deployment
            const controlsArea = document.getElementById('controls-area');
            if (controlsArea) {
                const startBtn = document.createElement('button');
                startBtn.id = 'start-battle-btn';
                startBtn.textContent = 'Start Battle';
                startBtn.style.marginTop = '18px';
                startBtn.style.width = '100%';
                startBtn.style.fontSize = '1.1em';
                startBtn.onclick = () => {
                    // Reveal all units
                    Object.values(placedUnits).forEach(u => {
                        const el = document.getElementById(u.id);
                        if (el) el.style.visibility = '';
                    });
                    controlsArea.innerHTML = '';
                    hideDeploymentModal();
                    // Start the battle
                    startBattle();
                };
                controlsArea.appendChild(startBtn);
            }
        });
    }
    function updatePointsDisplayHorde() {
        if (pointsDisplay) {
            pointsDisplay.textContent = `Horde Points: ${hordePoints}`;
        }
    }
    // Patch: On two-player mode, override deployment logic
    const originalHandleTileClick = handleTileClick;
    function twoPlayerHandleTileClick(event) {
        const tile = event.currentTarget;
        const row = parseInt(tile.dataset.row);
        const col = parseInt(tile.dataset.col);
        if (gameState.deploymentPhase === 'crown' && row < 8) return; // Only bottom half
        if (gameState.deploymentPhase === 'horde' && row > 3) return; // Only top four rows (0,1,2,3)
        if (gameState.deploymentPhase === 'crown') {
            originalHandleTileClick(event);
        } else if (gameState.deploymentPhase === 'horde') {
            // Place Horde units
            if (!selectedUnitType) return;
            const unitToPlace = UNITS.horde[selectedUnitType];
            if (hordePoints >= unitToPlace.cost && !tile.dataset.unitOnTile) {
                hordePoints -= unitToPlace.cost;
                updatePointsDisplayHorde();
                const unitElement = document.createElement("div");
                unitElement.classList.add("unit", `unit-${selectedUnitType}`, "horde-unit");
                unitElement.textContent = unitToPlace.symbol;
                unitElement.dataset.unitId = selectedUnitType;
                // Create health bar for the new unit
                const healthBar = createHealthBar(unitElement, unitToPlace.hp);
                tile.appendChild(unitElement);
                const unitId = `horde-${selectedUnitType}-${Date.now()}-${Math.random()}`;
                placedUnits[unitId] = {
                    ...unitToPlace,
                    row: row,
                    col: col,
                    faction: "horde",
                    currentHp: unitToPlace.hp,
                    id: unitId,
                    healthBar: healthBar
                };
                ensureUnitStats(placedUnits[unitId]);
                tile.dataset.unitOnTile = unitId;
                unitElement.id = unitId;
            }
        }
    }
    // Patch: On createGameBoard, set up two-player deployment if needed
    const originalCreateGameBoard = createGameBoard;
    createGameBoard = function() {
        originalCreateGameBoard.apply(this, arguments);
        if (gameState.mode === 'two-player') {
            setupTwoPlayerDeployment();
            // Override tile click
            document.querySelectorAll('.tile').forEach(tile => {
                tile.removeEventListener('click', handleTileClick);
                tile.addEventListener('click', twoPlayerHandleTileClick);
            });
        }
    };
    // Patch: On createControls, show correct points for each phase
    const originalCreateControls = createControls;
    createControls = function() {
        originalCreateControls.apply(this, arguments);
        if (gameState.mode === 'two-player') {
            if (gameState.deploymentPhase === 'horde') {
                updatePointsDisplayHorde();
            } else {
                updatePointsDisplay();
            }
        }
    };

    function randomTemplate(type) {
        const arr = LOG_TEMPLATES[type];
        if (!arr) return null;
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function getRandomTerrain() {
        return TERRAIN_TYPES[Math.floor(Math.random() * TERRAIN_TYPES.length)];
    }

    function updatePointsDisplay() {
        if (pointsDisplay) {
            pointsDisplay.textContent = `Points: ${playerPoints}`;
        }
    }

    function createHealthBar(unitElement, maxHp) {
        const healthContainer = document.createElement('div');
        healthContainer.className = 'unit-health-container';
        
        const healthBar = document.createElement('div');
        healthBar.className = 'unit-health-bar high';
        healthBar.style.width = '100%';
        
        healthContainer.appendChild(healthBar);
        unitElement.appendChild(healthContainer);
        
        return healthBar;
    }

    function updateHealthBar(unit, healthBar) {
        const percentage = (unit.currentHp / unit.hp) * 100;
        healthBar.style.width = `${percentage}%`;
        
        // Update color based on health percentage
        healthBar.className = 'unit-health-bar ' + 
            (percentage > 60 ? 'high' : 
             percentage > 30 ? 'medium' : 'low');
    }

    function handleTileClick(event) {
        if (battleStarted) return;
        const tile = event.currentTarget;
        const row = parseInt(tile.dataset.row);
        const col = parseInt(tile.dataset.col);
        const tileKey = `${row}-${col}`;

        // Prevent placement on water unless unit can fly
        if (selectedUnitType && row >= BOARD_SIZE - PLAYER_DEPLOYMENT_ROWS) {
            const unitToPlace = UNITS.crown[selectedUnitType];
            if (tile.dataset.terrain === 'water' && !unitToPlace.fly) {
                console.log("Cannot place units on water unless they can fly!");
                return;
            }
            if (playerPoints >= unitToPlace.cost && !tile.dataset.unitOnTile) {
                playerPoints -= unitToPlace.cost;
                updatePointsDisplay();
                console.log(`Placed ${unitToPlace.name}. Remaining points: ${playerPoints}`);

                const unitElement = document.createElement("div");
                unitElement.classList.add("unit", `unit-${selectedUnitType}`, "crown-unit");
                unitElement.textContent = unitToPlace.symbol;
                unitElement.dataset.unitId = selectedUnitType;
                
                // Create health bar for the new unit
                const healthBar = createHealthBar(unitElement, unitToPlace.hp);
                
                tile.appendChild(unitElement);

                const unitId = `crown-${selectedUnitType}-${Date.now()}-${Math.random()}`;
                placedUnits[unitId] = { 
                    ...unitToPlace, 
                    row: row, 
                    col: col, 
                    faction: "crown", 
                    currentHp: unitToPlace.hp, 
                    id: unitId,
                    healthBar: healthBar // Store reference to health bar
                };
                ensureUnitStats(placedUnits[unitId]);
                tile.dataset.unitOnTile = unitId;
                unitElement.id = unitId;

            } else if (playerPoints < unitToPlace.cost) {
                console.log("Not enough points!");
                if(pointsDisplay) {
                    pointsDisplay.classList.add("error");
                    setTimeout(() => pointsDisplay.classList.remove("error"), 500);
                }
            } else if (tile.dataset.unitOnTile) {
                console.log("Tile already occupied!");
            }
        } else if (!selectedUnitType) {
            console.log("Select a unit first!");
        } else if (row < BOARD_SIZE - PLAYER_DEPLOYMENT_ROWS) {
            console.log("Cannot place units in the top rows.");
        }
    }

    function createGameBoard() {
        if (!gameBoard) return;
        gameBoard.innerHTML = "";
        placedUnits = {};
        battleStarted = false;
        turnNumber = 0;
        currentUnitIndex = 0;
        currentTurnUnitOrder = [];
        if (battleTimeout) clearTimeout(battleTimeout);
        if (gameOverOverlay) gameOverOverlay.classList.remove("active");

        // --- New: Generate terrain in blobs with all types ---
        const terrainMap = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill('grass'));
        const blobTypes = ["forest", "sand", "water", "mountain", "swamp"];
        const numBlobs = Math.floor(Math.random() * 11) + 10; // 10-20 blobs

        for (let b = 0; b < numBlobs; b++) {
            const blobType = blobTypes[Math.floor(Math.random() * blobTypes.length)];
            const blobSize = Math.floor(Math.random() * 6) + 4; // 4-9 tiles
            let tries = 0;
            let startRow, startCol;
            // Find a starting point that is still grass
            do {
                startRow = Math.floor(Math.random() * BOARD_SIZE);
                startCol = Math.floor(Math.random() * BOARD_SIZE);
                tries++;
            } while (terrainMap[startRow][startCol] !== 'grass' && tries < 100);
            if (terrainMap[startRow][startCol] !== 'grass') continue;
            // Flood-fill/random walk to grow the blob
            let blobTiles = [{ r: startRow, c: startCol }];
            terrainMap[startRow][startCol] = blobType;
            for (let i = 1; i < blobSize; i++) {
                // Pick a random tile from the blob so far
                const base = blobTiles[Math.floor(Math.random() * blobTiles.length)];
                // Try to expand in a random direction
                const directions = [
                    { r: 0, c: 1 }, { r: 0, c: -1 }, { r: 1, c: 0 }, { r: -1, c: 0 },
                    { r: 1, c: 1 }, { r: 1, c: -1 }, { r: -1, c: 1 }, { r: -1, c: -1 }
                ];
                const shuffled = directions.sort(() => Math.random() - 0.5);
                let placed = false;
                for (const dir of shuffled) {
                    const nr = base.r + dir.r;
                    const nc = base.c + dir.c;
                    if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && terrainMap[nr][nc] === 'grass') {
                        terrainMap[nr][nc] = blobType;
                        blobTiles.push({ r: nr, c: nc });
                        placed = true;
                        break;
                    }
                }
                if (!placed) break; // Can't grow further
            }
        }

        // --- Render the board using terrainMap ---
        for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i++) {
            const tile = document.createElement("div");
            tile.classList.add("tile");
            const row = Math.floor(i / BOARD_SIZE);
            const col = i % BOARD_SIZE;
            tile.dataset.row = row;
            tile.dataset.col = col;
            tile.id = `tile-${row}-${col}`;

            const terrainType = terrainMap[row][col];
            tile.classList.add(`terrain-${terrainType}`);
            tile.dataset.terrain = terrainType;
            // Removed terrainSpan/letter for a cleaner look
            // const terrainSpan = document.createElement("span");
            // terrainSpan.classList.add("terrain-letter");
            // terrainSpan.textContent = TERRAIN_REPRESENTATION[terrainType] || '?';
            // tile.appendChild(terrainSpan);

            tile.addEventListener("click", handleTileClick);

            if (row >= BOARD_SIZE - PLAYER_DEPLOYMENT_ROWS) {
                tile.classList.add("deployment-zone");
            }

            gameBoard.appendChild(tile);
        }
        console.log("Game board created with terrain blobs and placement listeners.");
    }

    function displayUnitStats(unitId, unitsObj = UNITS.crown) {
        if (!unitStatsDisplay || !unitId || !unitsObj[unitId]) {
            if (unitStatsDisplay) unitStatsDisplay.innerHTML = "Select a unit to see stats.";
            return;
        }
        const unit = unitsObj[unitId];
        unitStatsDisplay.innerHTML = `
            <strong>${unit.name} (${unit.symbol})</strong><br>
            Cost: ${unit.cost}<br>
            HP: ${unit.hp} | Atk: ${unit.attack} | Def: ${unit.defense}<br>
            Rng: ${unit.range} | Spd: ${unit.speed}
        `;
    }

    function startBattle() {
        if (battleStarted) return;
        battleStarted = true;
        turnNumber = 0;
        currentUnitIndex = 0;
        currentTurnUnitOrder = [];
        console.log("Battle Started!");
        logMessage("Battle Begins!", 'important');
        // Remove the deployment panel/sidebar from the DOM
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) sidebar.remove();
        // Remove the Show Panel button if present
        const showPanelBtn = document.getElementById('show-panel-btn');
        if (showPanelBtn) showPanelBtn.remove();
        // Show status panel
        const unitStatusPanel = document.getElementById('unit-status-panel');
        if (unitStatusPanel) unitStatusPanel.style.display = '';
        // --- Ensure all units are visible on the grid in two-player mode ---
        if (gameState.mode === 'two-player') {
            Object.values(placedUnits).forEach(u => {
                const el = document.getElementById(u.id);
                if (el) el.style.visibility = '';
            });
        }
        updateUnitStatusPanel();
        if (gameState.mode === 'single') {
            generateHordeDeployment();
        }
        runBattleSimulation(); // Start the simulation loop
        setPanelDefaults('battle');
    }

    function generateHordeDeployment() {
        console.log("Generating enemy units...");
        const numberOfEnemies = 10; // Example
        let enemiesPlaced = 0;
        const maxAttempts = 100;
        let attempts = 0;

        while (enemiesPlaced < numberOfEnemies && attempts < maxAttempts) {
            attempts++;
            const randomRow = Math.floor(Math.random() * ENEMY_DEPLOYMENT_ROWS);
            const randomCol = Math.floor(Math.random() * BOARD_SIZE);
            const tileKey = `${randomRow}-${randomCol}`;
            const targetTile = document.getElementById(`tile-${tileKey}`);

            if (targetTile && !targetTile.dataset.unitOnTile) {
                const randomEnemyId = HORDE_UNIT_IDS[Math.floor(Math.random() * HORDE_UNIT_IDS.length)];
                const enemyUnitData = UNITS.horde[randomEnemyId];

                const unitElement = document.createElement("div");
                unitElement.classList.add("unit", `unit-${randomEnemyId}`, "horde-unit");
                unitElement.textContent = enemyUnitData.symbol;
                unitElement.dataset.unitId = randomEnemyId;
                
                // Create health bar for the enemy unit
                const healthBar = createHealthBar(unitElement, enemyUnitData.hp);
                
                targetTile.appendChild(unitElement);

                const unitId = `horde-${randomEnemyId}-${Date.now()}-${Math.random()}`;
                placedUnits[unitId] = { 
                    ...enemyUnitData, 
                    row: randomRow, 
                    col: randomCol, 
                    faction: "horde", 
                    currentHp: enemyUnitData.hp, 
                    id: unitId,
                    healthBar: healthBar // Store reference to health bar
                };
                ensureUnitStats(placedUnits[unitId]);
                targetTile.dataset.unitOnTile = unitId;
                unitElement.id = unitId;
                enemiesPlaced++;
            }
        }

        if (enemiesPlaced > 0) {
             logMessage(`Enemy reinforcements arrive! (${enemiesPlaced} units)`, 'important');
        } else {
             logMessage("No enemy reinforcements arrived.", 'important');
        }
        console.log("Enemy units generated.");
    }

    function logFlavorMessage(contextType, unit) {
        const flavorLines = {
            'low-health': [
                `${unit.name} stares blankly at a lost limb.`,
                `${unit.name} is weeping in the corner.`,
                `${unit.name} clutches their wounds and trembles.`
            ],
            'death': [
                `A silence falls as ${unit.name} hits the ground.`,
                `${unit.name}'s blood darkens the soil.`,
                `The battlefield briefly pauses for ${unit.name}'s end.`
            ],
            'spell': [
                `Flames dance on the scorched earth.`,
                `The smell of ash lingers in the air.`,
                `A crackling echo of fire rolls across the field.`
            ]
        };

        if (Math.random() > 0.2) return;
        const lines = flavorLines[contextType];
        if (!lines || lines.length === 0) return;

        const recent = gameLog.slice(-1)[0];
        let line = lines[Math.floor(Math.random() * lines.length)];
        while (recent && recent.includes(line)) {
            line = lines[Math.floor(Math.random() * lines.length)];
        }

        logMessage(line, 'normal', false, unit.faction);
    }

    function logMessage(message, type = 'normal', isDramatic = false, faction = null) {
        if (!logArea) return;
        gameLog.push(message);
        const logEntry = document.createElement("p");
        // Styled log text and emojis
        if (type === 'crit') {
            logEntry.innerHTML = `<span class='log-critical'>💥 <b>${message}</b></span>`;
        } else if (type === 'death') {
            logEntry.innerHTML = `<span class='log-death'>☠️ <b>${message}</b></span>`;
        } else if (type === 'important' && message.includes('HERO HAS EMERGED')) {
            logEntry.innerHTML = `<span class='log-hero'>✨ <b>${message.replace('A HERO HAS EMERGED:', 'A HERO HAS EMERGED: ★')}</b></span>`;
        } else {
            logEntry.textContent = message;
        }
        // Faction-based coloring
        if (faction === 'crown') {
            logEntry.classList.add('log-crown');
        } else if (faction === 'horde') {
            logEntry.classList.add('log-horde');
        }
        // Remove all flash/animation classes
        logEntry.classList.remove('log-flash-death', 'log-flash-crit', 'log-flash-spell', 'log-flash-victory', 'log-flash-defeat', 'log-flash-important');
        logArea.appendChild(logEntry);
        logArea.scrollTop = logArea.scrollHeight;
        console.log("Log: ", message);
        // Add a pause for important events
        if (['death', 'crit'].includes(type) || (type === 'important' && message.includes('HERO HAS EMERGED'))) {
            return new Promise(resolve => setTimeout(resolve, 500));
        }
        if (isDramatic) {
            return new Promise(resolve => setTimeout(resolve, 500));
        }
        return Promise.resolve();
    }

    function createControls() {
        if (!controlsArea) return;
        controlsArea.innerHTML = "";

        pointsDisplay = document.createElement("div");
        pointsDisplay.id = "points-display";
        controlsArea.appendChild(pointsDisplay);
        if (gameState.mode === 'two-player' && gameState.deploymentPhase === 'horde') {
            updatePointsDisplayHorde();
        } else {
            updatePointsDisplay();
        }

        const unitList = document.createElement("div");
        unitList.id = "unit-selection-menu";
        // Show correct units for current deployment phase
        let unitsToShow = UNITS.crown;
        if (gameState.mode === 'two-player' && gameState.deploymentPhase === 'horde') {
            unitsToShow = UNITS.horde;
        }
        for (const unitId in unitsToShow) {
            const unit = unitsToShow[unitId];
            const unitButton = document.createElement("button");
            unitButton.classList.add("unit-select-btn");
            unitButton.dataset.unitId = unitId;
            unitButton.innerHTML = `${unit.name}<br>${unit.cost} points`;
            unitButton.addEventListener("click", () => {
                if (battleStarted) return;
                const currentlySelected = unitList.querySelector(".selected");
                if (currentlySelected) {
                    currentlySelected.classList.remove("selected");
                }
                unitButton.classList.add("selected");
                selectedUnitType = unitId;
                displayUnitStats(unitId, unitsToShow); // Pass correct units
            });
            unitList.appendChild(unitButton);
        }
        controlsArea.appendChild(unitList);

        unitStatsDisplay = document.createElement("div");
        unitStatsDisplay.id = "unit-stats-display";
        unitStatsDisplay.innerHTML = "Select a unit to see stats.";
        controlsArea.appendChild(unitStatsDisplay);

        // Only add the Start Battle button in single-player mode
        if (gameState.mode === 'single') {
            const startBattleButton = document.createElement("button");
            startBattleButton.id = "start-battle-btn";
            startBattleButton.textContent = "Start Battle";
            startBattleButton.addEventListener("click", startBattle);
            controlsArea.appendChild(startBattleButton);
        }
        // In two-player mode, do NOT add Start Battle during deployment; it is added in startHordeDeployment.
    }

    // --- Battle Logic (Sequential Actions) ---

    function getDistance(unit1, unit2) {
        const rowDiff = Math.abs(unit1.row - unit2.row);
        const colDiff = Math.abs(unit1.col - unit2.col);
        
        // For melee units (range 1), only allow orthogonal attacks
        if (unit1.range === 1) {
            return rowDiff + colDiff;
        }
        
        // For ranged units, use the maximum of row and column difference
        // This means diagonal attacks count as 1 space of range
        return Math.max(rowDiff, colDiff);
    }

    function findNearestEnemy(unit, allUnits) {
        let nearestEnemy = null;
        let minDistance = Infinity;

        for (const otherUnitId in allUnits) {
            const otherUnit = allUnits[otherUnitId];
            if (otherUnit && otherUnit.faction !== unit.faction && otherUnit.currentHp > 0) {
                const distance = getDistance(unit, otherUnit);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestEnemy = otherUnit;
                }
            }
        }
        return { enemy: nearestEnemy, distance: minDistance };
    }

    // Helper to fill a template with values
    function fillTemplate(template, data) {
        return template
            .replace('[A]', data.attackerObj ? heroNameOr(data.attackerObj) : (data.attacker || ''))
            .replace('[D]', data.defenderObj ? heroNameOr(data.defenderObj) : (data.defender || ''))
            .replace('[DMG]', data.damage !== undefined ? data.damage : '')
            .replace('[U]', data.unitObj ? heroNameOr(data.unitObj) : (data.unit || ''));
    }

    // Helper for delay
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Pathfinding: BFS to find shortest path from (startRow, startCol) to (endRow, endCol)
    function findPath(startRow, startCol, endRow, endCol, isBlocked) {
        const queue = [];
        const visited = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(false));
        const prev = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
        queue.push({ r: startRow, c: startCol });
        visited[startRow][startCol] = true;
        const directions = [
            { r: 0, c: 1 }, { r: 0, c: -1 }, { r: 1, c: 0 }, { r: -1, c: 0 },
            { r: 1, c: 1 }, { r: 1, c: -1 }, { r: -1, c: 1 }, { r: -1, c: -1 }
        ];
        while (queue.length > 0) {
            const { r, c } = queue.shift();
            if (r === endRow && c === endCol) {
                // Reconstruct path
                const path = [];
                let curr = { r, c };
                while (curr && (curr.r !== startRow || curr.c !== startCol)) {
                    path.push(curr);
                    curr = prev[curr.r][curr.c];
                }
                path.reverse();
                return path;
            }
            for (const dir of directions) {
                const nr = r + dir.r;
                const nc = c + dir.c;
                if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) continue;
                if (visited[nr][nc]) continue;
                if (isBlocked(nr, nc)) continue;
                visited[nr][nc] = true;
                prev[nr][nc] = { r, c };
                queue.push({ r: nr, c: nc });
            }
        }
        return null; // No path found
    }

    async function moveUnit(unit, targetEnemy) {
        let moved = false;
        const maxMoves = unit.speed;
        // Pathfinding: avoid tiles with units (except self and target)
        const isBlocked = (r, c) => {
            const tile = document.getElementById(`tile-${r}-${c}`);
            if (!tile) return true;
            if (tile.dataset.unitOnTile && tile.dataset.unitOnTile !== unit.id && !(r === targetEnemy.row && c === targetEnemy.col)) return true;
            return false;
        };
        // Find path to target
        const path = findPath(unit.row, unit.col, targetEnemy.row, targetEnemy.col, isBlocked);
        if (path && path.length > 0) {
            // Move up to speed or until adjacent to target
            let steps = Math.min(maxMoves, path.length);
            for (let i = 0; i < steps; i++) {
                const next = path[i];
                // If next tile is the target's tile and we're not in range, stop (don't move into enemy)
                if (next.r === targetEnemy.row && next.c === targetEnemy.col && getDistance(unit, targetEnemy) > 1) break;
                const oldTile = document.getElementById(`tile-${unit.row}-${unit.col}`);
                const newTile = document.getElementById(`tile-${next.r}-${next.c}`);
                const unitElement = document.getElementById(unit.id);
                if (oldTile && newTile && unitElement) {
                    // Animate the movement for this step
                    unitElement.style.transition = 'transform 0.2s ease-in-out';
                    const oldRect = oldTile.getBoundingClientRect();
                    const newRect = newTile.getBoundingClientRect();
                    const dx = newRect.left - oldRect.left;
                    const dy = newRect.top - oldRect.top;
                    unitElement.style.transform = `translate(${dx}px, ${dy}px)`;
                    await sleep(200);
                    unitElement.style.transform = '';
                    unitElement.style.transition = '';
                    // Update position after animation
                    unit.row = next.r;
                    unit.col = next.c;
                    delete oldTile.dataset.unitOnTile;
                    newTile.dataset.unitOnTile = unit.id;
                    newTile.appendChild(unitElement);
                    moved = true;
                } else {
                    break;
                }
                // If after moving, we're adjacent to the target, stop
                if (getDistance(unit, targetEnemy) <= unit.range) break;
            }
        }
        // After all moves are complete
        if (moved) {
            const newTile = document.getElementById(`tile-${unit.row}-${unit.col}`);
            if (newTile && newTile.dataset.terrain === 'water' && !unit.waterAdaptive) {
                unit.skipNextTurn = true;
                logMessage(`${unit.name} is slowed by water and will skip their next turn!`, 'important', false, unit.faction);
                console.log(`Unit ${unit.name} (${unit.id}) moved into water and will skip next turn.`);
            }
            const msg = fillTemplate(randomTemplate('move'), { unit: unit.name });
            logMessage(msg, 'normal', false, unit.faction);
        } else {
            const msg = fillTemplate(randomTemplate('hold'), { unit: unit.name });
            logMessage(msg, 'normal', false, unit.faction);
        }
        return moved;
    }

    function getUnitsInArea(row, col) {
        const unitsInArea = [];
        for (let r = Math.max(0, row - 1); r <= Math.min(BOARD_SIZE - 1, row + 1); r++) {
            for (let c = Math.max(0, col - 1); c <= Math.min(BOARD_SIZE - 1, col + 1); c++) {
                const tile = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
                if (tile && tile.dataset.unitOnTile) {
                    unitsInArea.push(placedUnits[tile.dataset.unitOnTile]);
                }
            }
        }
        return unitsInArea;
    }

    function createFlameEffect(tile) {
        const flame = document.createElement('div');
        flame.className = 'wizard-flame';
        tile.appendChild(flame);

        // Create flame particles
        for (let i = 0; i < 10; i++) {
            const particle = document.createElement('div');
            particle.className = 'wizard-flame-particle';
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.top = `${Math.random() * 100}%`;
            tile.appendChild(particle);
        }

        // Remove the effects after animation
        setTimeout(() => {
            flame.remove();
            tile.querySelectorAll('.wizard-flame-particle').forEach(p => p.remove());
        }, 500);
    }

    function flashElement(element, className, duration = 400) {
        if (!element) return;
        element.classList.add(className);
        setTimeout(() => {
            element.classList.remove(className);
        }, duration);
    }

    function triggerVisualEffect(unit, effectClass) {
        const el = document.getElementById(unit.id);
        if (!el) return;
        el.classList.add(effectClass);
        setTimeout(() => el.classList.remove(effectClass), 600);
    }

    function performSpecialMove(attacker, target) {
        const move = attacker.specialMove;
        let logText = '';
        let skipNormalAttack = false;
        switch (move.effect) {
            case 'lastStand':
                if (attacker.currentHp < 10) {
                    const dmg = (Math.max(1, attacker.attack - target.defense)) * 2;
                    target.currentHp -= dmg;
                    if (target.healthBar) updateHealthBar(target, target.healthBar);
                    logText = `${attacker.name} uses ${move.name}! Double damage: ${dmg} to ${target.name}!`;
                    skipNormalAttack = true;
                    if (target.currentHp <= 0) {
                        logMessage(`${target.name} is obliterated by ${attacker.name}'s Last Stand!`, 'death', true, target.faction);
                        removeUnit(target);
                    }
                }
                break;
            case 'quickShot':
                logText = `${attacker.name} uses ${move.name}! Attacks twice!`;
                attackUnit(attacker, target);
                break;
            case 'shieldBash':
                logText = `${attacker.name} uses ${move.name}! ${target.name} is stunned!`;
                if (target) {
                    target.skipNextTurn = true;
                    logMessage(`${target.name} is stunned and will skip their next turn!`, 'important', false, target.faction);
                }
                break;
            case 'infernoSurge':
                logText = `${attacker.name} unleashes ${move.name}! 3x3 AoE fire!`;
                break;
            case 'divineShield':
                logText = `${attacker.name} activates ${move.name}! Blocks all damage this turn!`;
                break;
            case 'piercingBolt':
                const dmgPierce = attacker.attack;
                target.currentHp -= dmgPierce;
                if (target.healthBar) updateHealthBar(target, target.healthBar);
                logText = `${attacker.name} fires a ${move.name}! Ignores defense: ${dmgPierce} to ${target.name}!`;
                skipNormalAttack = true;
                if (target.currentHp <= 0) {
                    logMessage(`${target.name} is felled by a Piercing Bolt!`, 'death', true, target.faction);
                    removeUnit(target);
                }
                break;
            case 'holyMend':
                logText = `${attacker.name} uses ${move.name}! Heals nearest ally 10 HP.`;
                break;
            case 'blindingDust':
                logText = `${attacker.name} uses ${move.name}! ${target.name}'s accuracy is reduced!`;
                break;
            case 'spiritBurst':
                if (target) {
                    triggerVisualEffect(target, 'zap-flash');
                }
                break;
            case 'lifesteal':
                if (attacker) {
                    triggerVisualEffect(attacker, 'lifesteal-glow');
                }
                break;
            case 'quakeSlam':
                logText = `${attacker.name} uses ${move.name}! ${target.name} is stunned by the quake!`;
                if (target) {
                    target.skipNextTurn = true;
                    logMessage(`${target.name} is stunned and will skip their next turn!`, 'important', false, target.faction);
                }
                break;
            case 'charge':
                // Cavalry Charge logic
                // If a charge would kill the target (with +10 bonus), perform the charge. If not, move up to 2 tiles toward the target and attack normally (same turn).
                if (!target) break;
                const dr = target.row - attacker.row;
                const dc = target.col - attacker.col;
                let dir = null;
                if (dr === 0 && Math.abs(dc) > 0 && Math.abs(dc) <= 3) dir = { r: 0, c: Math.sign(dc) };
                if (dc === 0 && Math.abs(dr) > 0 && Math.abs(dr) <= 3) dir = { r: Math.sign(dr), c: 0 };
                if (dir) {
                    // Check for clear path (enemy units block, friendly do not)
                    let blocked = false;
                    for (let i = 1; i < Math.max(Math.abs(dr), Math.abs(dc)); i++) {
                        const checkRow = attacker.row + dir.r * i;
                        const checkCol = attacker.col + dir.c * i;
                        const checkTile = document.getElementById(`tile-${checkRow}-${checkCol}`);
                        if (checkTile && checkTile.dataset.unitOnTile && !(checkRow === target.row && checkCol === target.col)) {
                            const unitId = checkTile.dataset.unitOnTile;
                            const unitOnTile = placedUnits[unitId];
                            if (unitOnTile && unitOnTile.faction !== attacker.faction) {
                                blocked = true;
                                break;
                            }
                        }
                    }
                    if (!blocked) {
                        // Calculate if charge would kill the target
                        const chargeDamage = Math.max(1, attacker.attack - target.defense) + 10;
                        if (target.currentHp <= chargeDamage) {
                            // Visual streak effect on all tiles in the path
                            for (let i = 1; i <= Math.max(Math.abs(dr), Math.abs(dc)); i++) {
                                const streakRow = attacker.row + dir.r * i;
                                const streakCol = attacker.col + dir.c * i;
                                const streakTile = document.getElementById(`tile-${streakRow}-${streakCol}`);
                                if (streakTile) createCavalryStreakEffect(streakTile);
                            }
                            // Log message
                            logText = `🐎 Cavalry charges into ${target.name}!`;
                            // Charge attack: +10 bonus damage
                            target.currentHp -= chargeDamage;
                            if (target.healthBar) updateHealthBar(target, target.healthBar);
                            skipNormalAttack = true;
                            if (target.currentHp <= 0) {
                                // Move Cavalry into the target's tile
                                const oldTile = document.getElementById(`tile-${attacker.row}-${attacker.col}`);
                                const newTile = document.getElementById(`tile-${target.row}-${target.col}`);
                                if (oldTile && newTile) {
                                    delete oldTile.dataset.unitOnTile;
                                    newTile.dataset.unitOnTile = attacker.id;
                                    attacker.row = target.row;
                                    attacker.col = target.col;
                                    const unitElement = document.getElementById(attacker.id);
                                    if (unitElement) newTile.appendChild(unitElement);
                                }
                                logMessage(`${target.name} is trampled by the Cavalry's charge!`, 'death', true, target.faction);
                                removeUnit(target);
                            } else {
                                // Move Cavalry to one tile before the target
                                const stopRow = attacker.row + dir.r * (Math.max(Math.abs(dr), Math.abs(dc)) - 1);
                                const stopCol = attacker.col + dir.c * (Math.max(Math.abs(dr), Math.abs(dc)) - 1);
                                const oldTile = document.getElementById(`tile-${attacker.row}-${attacker.col}`);
                                const stopTile = document.getElementById(`tile-${stopRow}-${stopCol}`);
                                if (oldTile && stopTile) {
                                    delete oldTile.dataset.unitOnTile;
                                    stopTile.dataset.unitOnTile = attacker.id;
                                    attacker.row = stopRow;
                                    attacker.col = stopCol;
                                    const unitElement = document.getElementById(attacker.id);
                                    if (unitElement) stopTile.appendChild(unitElement);
                                }
                            }
                        } else {
                            // Not lethal: move up to 2 tiles toward the target, then attack normally
                            let moves = Math.min(2, Math.max(Math.abs(dr), Math.abs(dc)) - 1);
                            let moved = false;
                            let newRow = attacker.row;
                            let newCol = attacker.col;
                            for (let i = 1; i <= moves; i++) {
                                const nextRow = attacker.row + dir.r * i;
                                const nextCol = attacker.col + dir.c * i;
                                const nextTile = document.getElementById(`tile-${nextRow}-${nextCol}`);
                                if (nextTile && !nextTile.dataset.unitOnTile) {
                                    newRow = nextRow;
                                    newCol = nextCol;
                                    moved = true;
                                } else {
                                    break;
                                }
                            }
                            if (moved) {
                                const oldTile = document.getElementById(`tile-${attacker.row}-${attacker.col}`);
                                const newTile = document.getElementById(`tile-${newRow}-${newCol}`);
                                if (oldTile && newTile) {
                                    delete oldTile.dataset.unitOnTile;
                                    newTile.dataset.unitOnTile = attacker.id;
                                    attacker.row = newRow;
                                    attacker.col = newCol;
                                    const unitElement = document.getElementById(attacker.id);
                                    if (unitElement) newTile.appendChild(unitElement);
                                }
                            }
                            // After moving, attack normally if in range
                            if (Math.abs(attacker.row - target.row) + Math.abs(attacker.col - target.col) === 1) {
                                // Log message for move and attack
                                logText = `🐎 Cavalry advances and attacks ${target.name}!`;
                                // Normal attack (already buffed to 10)
                                const normalDamage = Math.max(1, attacker.attack - target.defense);
                                target.currentHp -= normalDamage;
                                if (target.healthBar) updateHealthBar(target, target.healthBar);
                                if (target.currentHp <= 0) {
                                    logMessage(`${target.name} is defeated by the Cavalry!`, 'death', true, target.faction);
                                    removeUnit(target);
                                }
                                skipNormalAttack = true;
                            }
                        }
                    }
                }
                break;
            default:
                logText = `${attacker.name} attempts a special move, but nothing happens.`;
        }
        if (logText) logMessage(logText, 'important', true, attacker.faction);
        return skipNormalAttack;
    }

    // --- Patch: Ensure all units have afflictions/bonuses arrays ---
    function ensureUnitStatusArrays(unit) {
        if (!unit.afflictions) unit.afflictions = [];
        if (!unit.bonuses) unit.bonuses = [];
    }

    function attackUnit(attacker, target) {
        if (!attacker || !target || attacker.currentHp <= 0 || target.currentHp <= 0) {
            return false; // Attack failed
        }
        // Initialize tracking variables if they don't exist
        if (attacker.criticalHits === undefined) attacker.criticalHits = 0;
        if (attacker.highestHit === undefined) attacker.highestHit = 0;

        // --- Cleric always prioritizes healing ---
        if (attacker.name === 'Cleric') {
            // Find all allies within range (4 tiles) who are wounded
            const allies = Object.values(placedUnits).filter(u => u.faction === attacker.faction && u.id !== attacker.id && u.currentHp > 0 && u.currentHp < u.hp);
            let nearestWounded = null;
            let minDist = Infinity;
            for (const ally of allies) {
                const dist = Math.abs(attacker.row - ally.row) + Math.abs(attacker.col - ally.col);
                if (dist <= 4 && (nearestWounded === null || ally.currentHp / ally.hp < nearestWounded.currentHp / nearestWounded.hp)) {
                    nearestWounded = ally;
                    minDist = dist;
                }
            }
            if (nearestWounded) {
                // Heal the most injured nearby ally
                const healAmount = 10;
                nearestWounded.currentHp = Math.min(nearestWounded.hp, nearestWounded.currentHp + healAmount);
                if (nearestWounded.healthBar) updateHealthBar(nearestWounded, nearestWounded.healthBar);
                // Visuals: heart + flash-heal
                triggerVisualEffect(nearestWounded, 'flash-heal');
                // Optionally, show a heart icon
                const tile = document.getElementById(`tile-${nearestWounded.row}-${nearestWounded.col}`);
                if (tile) {
                    const heart = document.createElement('div');
                    heart.textContent = '❤';
                    heart.style.position = 'absolute';
                    heart.style.left = '50%';
                    heart.style.top = '10%';
                    heart.style.transform = 'translate(-50%, 0)';
                    heart.style.fontSize = '1.2em';
                    heart.style.color = '#f06292';
                    heart.style.pointerEvents = 'none';
                    tile.appendChild(heart);
                    setTimeout(() => heart.remove(), 700);
                }
                logMessage(`${attacker.name} uses Holy Mend! Heals ${nearestWounded.name} for ${healAmount} HP.`, 'spell', true, attacker.faction);
                setTimeout(() => {
                    if (typeof processNextUnitAction === 'function') processNextUnitAction();
                }, 500);
                return true;
            }
            // If no wounded ally, proceed to normal attack below
        }
        // Special move check
        let skipNormalAttack = false;
        if (attacker.specialMove && Math.random() < attacker.specialMove.chance) {
            skipNormalAttack = performSpecialMove(attacker, target);
        }
        // Always advance the turn, even after a special move
        if (skipNormalAttack) {
            setTimeout(() => {
                if (typeof processNextUnitAction === 'function') processNextUnitAction();
            }, 500);
            return true;
        }

        // Launch projectile for ranged units
        if (attacker.range > 1) {
            const fromTile = document.getElementById(`tile-${attacker.row}-${attacker.col}`);
            const toTile = document.getElementById(`tile-${target.row}-${target.col}`);
            let projType = 'arrow';
            if (attacker.name === 'Wizard') projType = 'fire';
            if (attacker.name === 'Shaman') projType = 'arrow';
            if (attacker.name === 'Imp') projType = 'arrow';
            if (attacker.name === 'Crossbowman') projType = 'arrow';
            launchProjectile(fromTile, toTile, projType);
        }

        const damage = Math.max(1, attacker.attack - target.defense);
        const isCrit = Math.random() < 0.1; // 10% chance for critical hit
        const finalDamage = isCrit ? damage * 2 : damage;

        // Track critical hits and highest hit
        if (isCrit) attacker.criticalHits++;
        if (finalDamage > attacker.highestHit) attacker.highestHit = finalDamage;

        if (attacker.name === "Wizard" || attacker.name === "Shaman") {
            // Wizard's and Shaman's splash damage attack
            const affectedUnits = getUnitsInArea(target.row, target.col);
            logMessage(fillTemplate(randomTemplate('spell'), { attacker: attacker.name }), 'spell', true, attacker.faction);
            logFlavorMessage('spell', attacker);
            // Create visual effect on all affected tiles
            for (let r = Math.max(0, target.row - 1); r <= Math.min(BOARD_SIZE - 1, target.row + 1); r++) {
                for (let c = Math.max(0, target.col - 1); c <= Math.min(BOARD_SIZE - 1, target.col + 1); c++) {
                    const tile = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
                    if (tile) {
                        if (attacker.name === 'Wizard') {
                            createFlameEffect(tile);
                        } else if (attacker.name === 'Shaman') {
                            createBlueBlastEffect(tile);
                        }
                        if (tile.dataset.unitOnTile) pulseUnit(tile.dataset.unitOnTile, 'unit-pulse-spell');
                    }
                }
            }
            return Promise.all(affectedUnits.map(async unit => {
                ensureUnitStatusArrays(unit);
                const isMainTarget = unit.id === target.id;
                const splashDamage = isMainTarget ? finalDamage * 2 : finalDamage;
                unit.isBeingAttacked = true;
                unit.currentHp -= splashDamage;
                if (unit.healthBar) updateHealthBar(unit, unit.healthBar);
                const msg = fillTemplate(randomTemplate(isMainTarget ? (isCrit ? 'crit' : 'attack') : 'attack'), {
                    attacker: attacker.name,
                    defender: unit.name,
                    damage: splashDamage
                });
                await logMessage(msg, isMainTarget ? (isCrit ? 'crit' : 'spell') : 'attack', isMainTarget, attacker.faction);
                if (unit.currentHp > 0 && unit.currentHp < unit.hp * 0.3) {
                    logFlavorMessage('low-health', unit);
                }
                flashElement(document.getElementById(unit.id), "damage-flash");
                flashElement(document.getElementById(unit.id), "wizard-flash");
                if (unit.faction === 'crown') updateUnitStatusPanel(unit.id);
                setTimeout(() => { unit.isBeingAttacked = false; if (unit.faction === 'crown') updateUnitStatusPanel(); }, 700);
                if (unit.currentHp <= 0) {
                    const deathMsg = fillTemplate(randomTemplate('death'), { defender: unit.name });
                    await logMessage(deathMsg, 'death', true, unit.faction);
                    logFlavorMessage('death', unit);
                    removeUnit(unit);
                }
            })).then(() => true);
        } else {
            ensureUnitStatusArrays(target);
            target.isBeingAttacked = true;
            target.currentHp -= finalDamage;
            if (target.healthBar) {
                updateHealthBar(target, target.healthBar);
            }
            const msg = fillTemplate(randomTemplate(isCrit ? 'crit' : 'attack'), {
                attacker: attacker.name,
                defender: target.name,
                damage: finalDamage
            });
            return logMessage(msg, isCrit ? 'crit' : 'attack', isCrit, attacker.faction).then(() => {
                flashElement(document.getElementById(attacker.id), "attack-flash");
                flashElement(document.getElementById(target.id), "damage-flash");
                if (target.faction === 'crown') updateUnitStatusPanel(target.id);
                setTimeout(() => { target.isBeingAttacked = false; if (target.faction === 'crown') updateUnitStatusPanel(); }, 700);
                if (target.currentHp > 0 && target.currentHp < target.hp * 0.3) {
                    logFlavorMessage('low-health', target);
                }
                if (target.currentHp <= 0) {
                    const deathMsg = fillTemplate(randomTemplate('death'), { defender: target.name });
                    return logMessage(deathMsg, 'death', true, target.faction).then(() => {
                        logFlavorMessage('death', target);
                        removeUnit(target);
                        return true;
                    });
                }
                return true;
            });
        }
    }

    function removeUnit(unit) {
        if (!unit) return;
        const unitElement = document.getElementById(unit.id);
        const tile = document.getElementById(`tile-${unit.row}-${unit.col}`);
        
        if (unitElement) {
            unitElement.remove();
        }
        if (tile && tile.dataset.unitOnTile === unit.id) {
            delete tile.dataset.unitOnTile;
        }
        // Mark as dead instead of deleting immediately, to avoid issues during turn iteration
        if (placedUnits[unit.id]) {
             placedUnits[unit.id].currentHp = 0; 
        }
        console.log(`Marked unit as defeated: ${unit.id}`);
        // Actual removal from placedUnits might happen at end of turn or start of next
        triggerVisualEffect(unit, 'fade-out');
        setTimeout(() => {
            // ... existing removal logic ...
        }, 600);
    }

    function flashElement(element, className, duration = 300) {
        if (!element) return;
        element.classList.add(className);
        setTimeout(() => {
            element.classList.remove(className);
        }, duration);
    }

    // Update processNextUnitAction to await moveUnit
    async function processNextUnitAction() {
        if (!battleStarted) return; // Stop if battle ended prematurely

        // Check for victory before processing the next unit
        if (checkVictory(true)) {
            return; // Stop the loop if victory condition met
        }

        // Find the next living unit in the order
        let unit = null;
        while (currentUnitIndex < currentTurnUnitOrder.length) {
            const unitId = currentTurnUnitOrder[currentUnitIndex];
            unit = placedUnits[unitId];
            if (unit && unit.currentHp > 0) {
                break; // Found a living unit to process
            }
            currentUnitIndex++; // Skip dead units
        }

        // If we processed all units for the turn
        if (currentUnitIndex >= currentTurnUnitOrder.length) {
            // Clean up units marked as dead
            for (const unitId in placedUnits) {
                if (placedUnits[unitId].currentHp <= 0) {
                    delete placedUnits[unitId];
                }
            }
            // Start the next turn after a delay
            battleTimeout = setTimeout(startNewTurn, TURN_START_DELAY);
            return;
        }

        // Debug log for unit processing
        if (unit) {
            console.log(`Processing unit: ${unit.name} (${unit.id}), skipNextTurn: ${unit.skipNextTurn}`);
        }

        // Skip turn if skipNextTurn is set
        if (unit && unit.skipNextTurn) {
            unit.skipNextTurn = false;
            logMessage(`${unit.name} is delayed and skips this turn!`, 'important', false, unit.faction);
            console.log(`Unit ${unit.name} (${unit.id}) is skipping turn due to skipNextTurn.`);
            currentUnitIndex++;
            battleTimeout = setTimeout(processNextUnitAction, ACTION_DELAY);
            return;
        }

        // Process the current unit's action
        const { enemy, distance } = findNearestEnemy(unit, placedUnits);
        let actionTaken = false;

        if (enemy) {
            if (distance <= unit.range) {
                attackUnit(unit, enemy).then(success => {
                    actionTaken = success;
                    // Move to the next unit after a delay
                    currentUnitIndex++;
                    battleTimeout = setTimeout(processNextUnitAction, ACTION_DELAY);
                });
                return; // Exit early as the attack will handle the next step
            } else {
                // Await step-by-step movement
                actionTaken = await moveUnit(unit, enemy);
                // After movement, check if now in range to attack
                const newDistance = getDistance(unit, enemy);
                if (newDistance <= unit.range) {
                    await attackUnit(unit, enemy);
                }
            }
        } else {
            logMessage(`${unit.name} (${unit.id.substring(0,4)}) finds no enemies.`, 'normal');
            actionTaken = true; // Considered an action (holding position)
        }
        
        // If no move or attack happened (e.g., blocked), still count as an action
        if (!actionTaken) {
            logMessage(`${unit.name} (${unit.id.substring(0,4)}) holds position.`, 'normal');
        }

        // Move to the next unit after a delay
        currentUnitIndex++;
        battleTimeout = setTimeout(processNextUnitAction, ACTION_DELAY);
    }

    function startNewTurn() {
        if (!battleStarted) return;
        turnNumber++;
        logMessage(`--- Turn ${turnNumber} ---`, 'important');
        
        // Get all alive units
        const aliveUnits = Object.entries(placedUnits)
            .filter(([_, unit]) => unit && unit.currentHp > 0)
            .map(([id, unit]) => ({ id, ...unit }));

        // Group units by speed
        const speedGroups = {};
        aliveUnits.forEach(unit => {
            const speed = unit.speed;
            if (!speedGroups[speed]) {
                speedGroups[speed] = {
                    crown: [],
                    horde: []
                };
            }
            speedGroups[speed][unit.faction].push(unit.id);
        });

        // Create turn order by alternating within each speed group
        currentTurnUnitOrder = [];
        Object.keys(speedGroups).sort((a, b) => b - a).forEach(speed => {
            const group = speedGroups[speed];
            const crownUnits = group.crown;
            const hordeUnits = group.horde;
            
            // Alternate between factions within this speed group
            while (crownUnits.length > 0 || hordeUnits.length > 0) {
                // Always start with Crown if there are Crown units
                if (crownUnits.length > 0) {
                    currentTurnUnitOrder.push(crownUnits.shift());
                }
                // Then add Horde if there are Horde units
                if (hordeUnits.length > 0) {
                    currentTurnUnitOrder.push(hordeUnits.shift());
                }
            }
        });

        currentUnitIndex = 0;

        // Increment turnsSurvived for all units and check hero promotion
        Object.values(placedUnits).forEach(unit => {
            ensureUnitStats(unit);
            unit.turnsSurvived += 1;
        });
        checkHeroPromotion();

        // Start processing the first unit of the new turn
        processNextUnitAction();
    }

    function checkVictory(showOverlay = false) {
        const crownUnitsAlive = Object.values(placedUnits).some(u => u && u.faction === 'crown' && u.currentHp > 0);
        const hordeUnitsAlive = Object.values(placedUnits).some(u => u && u.faction === 'horde' && u.currentHp > 0);

        if (!battleStarted && !(crownUnitsAlive && hordeUnitsAlive)) return false;
        if (!battleStarted && (crownUnitsAlive && hordeUnitsAlive)) return false;

        let message = null;
        let victory = false;

        if (!hordeUnitsAlive && crownUnitsAlive) {
            message = "Victory!";
            victory = true;
        } else if (!crownUnitsAlive && hordeUnitsAlive) {
            message = "Defeat!";
            victory = true;
        } else if (!crownUnitsAlive && !hordeUnitsAlive && turnNumber > 0) {
            message = "Mutual Annihilation!";
            victory = true;
        }

        if (victory) {
            logMessage(message);
            if (unitStatsDisplay) unitStatsDisplay.innerHTML = message;
            if (showOverlay && gameOverOverlay && gameOverMessage) {
                // Generate battle statistics
                const stats = generateBattleStats();
                // Set only the main message in #game-over-message
                gameOverMessage.textContent = message;
                // Set the stats/summary in #game-over-stats
                const gameOverStats = document.getElementById('game-over-stats');
                if (gameOverStats) {
                    gameOverStats.innerHTML = `
                        <div class="battle-stats">
                            <div class="stats-section">
                                <h3>Battle Summary</h3>
                                <p>Total Turns: ${turnNumber}</p>
                                <p>Winner: ${!hordeUnitsAlive ? 'Crown' : 'Horde'}</p>
                                <p>Total Units Deployed: ${stats.totalDeployed}</p>
                                <p>Total Units Lost: ${stats.totalLost}</p>
                            </div>
                            <div class="stats-section">
                                <h3>Unit Performance</h3>
                                <p><span class="unit-stat-image ${stats.mostValuableUnit.image}"></span> Most Valuable: ${stats.mostValuableUnit.name} (${stats.mostValuableUnit.damage} damage)</p>
                                <p><span class="unit-stat-image ${stats.mostDurableUnit.image}"></span> Most Durable: ${stats.mostDurableUnit.name} (${stats.mostDurableUnit.damage} damage taken)</p>
                                <p><span class="unit-stat-image ${stats.mostKills.image}"></span> Most Kills: ${stats.mostKills.name} (${stats.mostKills.kills} kills)</p>
                                <p><span class="unit-stat-image ${stats.longestSurvivor.image}"></span> Longest Survivor: ${stats.longestSurvivor.name} (${stats.longestSurvivor.turns} turns)</p>
                            </div>
                            <div class="stats-section">
                                <h3>Heroes</h3>
                                <p>Heroes Promoted: ${stats.heroesPromoted}</p>
                                ${stats.heroList ? `<p>${stats.heroList}</p>` : ''}
                            </div>
                            <div class="stats-section">
                                <h3>Damage Statistics</h3>
                                <p>Total Damage Dealt: ${stats.totalDamage}</p>
                                <p>Highest Single Hit: ${stats.highestHit}</p>
                                <p>Critical Hits: ${stats.criticalHits}</p>
                            </div>
                        </div>
                    `;
                }
                // Hide unit status panel and log area for a clean end screen
                const unitStatusPanel = document.getElementById('unit-status-panel');
                const logArea = document.getElementById('log-area');
                if (unitStatusPanel) unitStatusPanel.style.display = 'none';
                if (logArea) logArea.style.display = 'none';
                gameOverOverlay.classList.add("active");
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            battleStarted = false;
            if (battleTimeout) clearTimeout(battleTimeout);
            setPanelDefaults('gameover');
            return true;
        }
        return false;
    }

    // Add new function to generate battle statistics
    function generateBattleStats() {
        const stats = {
            totalDeployed: 0,
            totalLost: 0,
            mostValuableUnit: { name: 'None', damage: 0, image: '' },
            mostDurableUnit: { name: 'None', damage: 0, image: '' },
            mostKills: { name: 'None', kills: 0, image: '' },
            longestSurvivor: { name: 'None', turns: 0, image: '' },
            heroesPromoted: 0,
            heroList: [],
            totalDamage: 0,
            highestHit: 0,
            criticalHits: 0
        };

        // Track all units that were ever in the battle
        const allUnits = Object.values(placedUnits);
        const crownUnits = allUnits.filter(u => u.faction === 'crown');
        const hordeUnits = allUnits.filter(u => u.faction === 'horde');

        // Basic counts
        stats.totalDeployed = allUnits.length;
        stats.totalLost = allUnits.filter(u => u.currentHp <= 0).length;

        // Find most valuable unit (most damage dealt)
        let maxDamage = 0;
        allUnits.forEach(unit => {
            const unitDamage = unit.totalDamage || 0;
            if (unitDamage > maxDamage) {
                maxDamage = unitDamage;
                stats.mostValuableUnit = {
                    name: unit.name || 'Unknown',
                    damage: unitDamage,
                    image: `unit-${(unit.name || 'unknown').toLowerCase()}`
                };
            }
        });

        // Find most durable unit (took most damage but survived)
        let maxDamageTaken = 0;
        allUnits.forEach(unit => {
            const damageTaken = (unit.hp || 0) - (unit.currentHp || 0);
            if (damageTaken > maxDamageTaken && unit.currentHp > 0) {
                maxDamageTaken = damageTaken;
                stats.mostDurableUnit = {
                    name: unit.name || 'Unknown',
                    damage: damageTaken,
                    image: `unit-${(unit.name || 'unknown').toLowerCase()}`
                };
            }
        });

        // Find unit with most kills
        let maxKills = 0;
        allUnits.forEach(unit => {
            const unitKills = unit.kills || 0;
            if (unitKills > maxKills) {
                maxKills = unitKills;
                stats.mostKills = {
                    name: unit.name || 'Unknown',
                    kills: unitKills,
                    image: `unit-${(unit.name || 'unknown').toLowerCase()}`
                };
            }
        });

        // Find longest surviving unit
        let maxTurns = 0;
        allUnits.forEach(unit => {
            const unitTurns = unit.turnsSurvived || 0;
            if (unitTurns > maxTurns) {
                maxTurns = unitTurns;
                stats.longestSurvivor = {
                    name: unit.name || 'Unknown',
                    turns: unitTurns,
                    image: `unit-${(unit.name || 'unknown').toLowerCase()}`
                };
            }
        });

        // Count heroes and create hero list
        const heroes = allUnits.filter(u => u.isHero);
        stats.heroesPromoted = heroes.length;
        stats.heroList = heroes.map(h => ({
            name: h.heroName || 'Unknown Hero',
            unit: h.name || 'Unknown Unit',
            kills: h.kills || 0,
            damage: h.totalDamage || 0,
            image: `unit-${(h.name || 'unknown').toLowerCase()}`
        }));

        // Calculate total damage and critical hits
        stats.totalDamage = allUnits.reduce((sum, unit) => sum + (unit.totalDamage || 0), 0);
        stats.highestHit = Math.max(...allUnits.map(u => u.highestHit || 0));
        stats.criticalHits = allUnits.reduce((sum, unit) => sum + (unit.criticalHits || 0), 0);

        return stats;
    }

    function runBattleSimulation() {
        if (battleTimeout) clearTimeout(battleTimeout);
        // Initial check in case one side starts empty
        if (checkVictory(true)) return; 
        // Start the first turn
        startNewTurn();
    }

    function setActiveUnit(unitId) {
        // Remove .unit-active from all units
        document.querySelectorAll('.unit').forEach(u => u.classList.remove('unit-active'));
        // Add to the current unit
        const el = document.getElementById(unitId);
        if (el) el.classList.add('unit-active');
    }

    function pulseUnit(unitId, pulseClass) {
        const el = document.getElementById(unitId);
        if (el) {
            el.classList.add(pulseClass);
            setTimeout(() => el.classList.remove(pulseClass), 700);
        }
    }

    // Helper to get direction index for 8-way arrows
    function getDirectionIndex(dx, dy) {
        // atan2 octant: 0=E, 1=NE, 2=N, 3=NW, 4=W, 5=SW, 6=S, 7=SE
        // user order:   0=N, 1=NE, 2=E, 3=SE, 4=S, 5=SW, 6=W, 7=NW
        const angle = Math.atan2(-dy, dx); // negative dy because y increases downward
        let octant = Math.round(8 * angle / (2 * Math.PI) + 8) % 8;
        // Map standard octant to user order
        const map = [2, 1, 0, 7, 6, 5, 4, 3];
        return map[octant];
    }

    function launchProjectile(fromTile, toTile, type) {
        if (!fromTile || !toTile) return;
        const boardRect = fromTile.parentElement.getBoundingClientRect();
        const fromRect = fromTile.getBoundingClientRect();
        const toRect = toTile.getBoundingClientRect();
        const proj = document.createElement('div');
        proj.className = 'projectile projectile-' + type;
        // Position at center of fromTile
        proj.style.left = (fromRect.left - boardRect.left + fromRect.width / 2 - 4) + 'px';
        proj.style.top = (fromRect.top - boardRect.top + fromRect.height / 2 - 4) + 'px';
        proj.style.position = 'absolute';
        proj.style.transition = 'transform 0.28s linear';
        
        // Directional arrow sprite logic
        if (type === 'arrow') {
            // Get grid positions from tile IDs
            const fromRow = parseInt(fromTile.dataset.row);
            const fromCol = parseInt(fromTile.dataset.col);
            const toRow = parseInt(toTile.dataset.row);
            const toCol = parseInt(toTile.dataset.col);
            const dx = toCol - fromCol;
            const dy = toRow - fromRow;
            const dirIdx = getDirectionIndex(dx, dy);
            const arrowImg = `img/arrow${dirIdx}.png`;
            console.log(`Arrow direction: ${dirIdx}, image: ${arrowImg}, dx: ${dx}, dy: ${dy}`);
            proj.style.backgroundImage = `url('${arrowImg}')`;
            proj.style.backgroundSize = 'cover';
            proj.style.backgroundRepeat = 'no-repeat';
            proj.style.backgroundPosition = 'center';
            proj.style.backgroundColor = 'transparent';
            proj.style.width = '16px';
            proj.style.height = '16px';
            proj.style.borderRadius = '0';
            proj.style.boxShadow = 'none';
        } else if (type === 'fire') {
            proj.style.backgroundImage = 'url("img/fireball.png")';
            proj.style.backgroundSize = 'contain';
            proj.style.backgroundRepeat = 'no-repeat';
            proj.style.backgroundPosition = 'center';
            proj.style.backgroundColor = 'transparent';
            proj.style.width = '24px';
            proj.style.height = '24px';
            proj.style.borderRadius = '50%';
            proj.style.boxShadow = '0 0 10px #ff5722';
        }
        
        fromTile.parentElement.appendChild(proj);
        // Calculate translation
        const dx = (toRect.left - fromRect.left) + (toRect.width - fromRect.width) / 2;
        const dy = (toRect.top - fromRect.top) + (toRect.height - fromRect.height) / 2;
        setTimeout(() => {
            proj.style.transform = `translate(${dx}px, ${dy}px)`;
        }, 50);
        setTimeout(() => {
            proj.remove();
        }, 300);
    }

    // --- Initialization ---
    if (startGameBtn) {
        console.log("Adding click listener to start button");
        startGameBtn.addEventListener("click", () => {
            console.log("Start button clicked");
            if (welcomeScreen) {
                welcomeScreen.classList.add("fade-out");
                setTimeout(() => {
                    welcomeScreen.classList.remove("active");
                    welcomeScreen.style.display = "none";
                }, 700); // Match CSS transition
            }
            if (gameArea) {
                console.log("Adding active class to game area");
                gameArea.classList.add("active");
                playerPoints = 1000;
                gameLog = [];
                if(logArea) logArea.innerHTML = "";
                createGameBoard();
                createControls();
                console.log("Game started! Player points: ", playerPoints);
            }
        });
    } else {
        console.error("Start button not found!");
    }

    // Show Panel button logic
    const showPanelBtn = document.getElementById('show-panel-btn');
    if (showPanelBtn) {
        showPanelBtn.addEventListener('click', () => {
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) {
                sidebar.classList.remove('hidden');
                showPanelBtn.style.display = 'none';
            }
        });
    }

    // --- Robust Reset to Welcome Screen ---
    function resetGameToWelcome() {
        // Clear any pending timeouts/intervals
        if (battleTimeout) {
            clearTimeout(battleTimeout);
            battleTimeout = null;
        }
        
        // Reset all game state variables
        selectedUnitType = null;
        playerPoints = 1000;
        placedUnits = {};
        gameLog = [];
        battleStarted = false;
        turnNumber = 0;
        currentUnitIndex = 0;
        currentTurnUnitOrder = [];
        if (typeof gameState !== 'undefined') {
            gameState.deploymentPhase = null;
            gameState.mode = null;
        }
        
        // Reset UI elements
        const welcomeScreen = document.getElementById('welcome-screen');
        const gameArea = document.getElementById('game-area');
        const gameBoard = document.getElementById('game-board');
        const logArea = document.getElementById('log-area');
        const controlsArea = document.getElementById('controls-area');
        const unitStatusPanel = document.getElementById('unit-status-panel');
        const gameOverOverlay = document.getElementById('game-over-overlay');
        const sidebar = document.querySelector('.sidebar');
        const showPanelBtn = document.getElementById('show-panel-btn');
        
        // Show welcome screen and hide game area
        if (welcomeScreen) {
            welcomeScreen.classList.add('active');
            welcomeScreen.style.display = 'flex';
            welcomeScreen.classList.remove('fade-out');
        }
        if (gameArea) {
            gameArea.classList.remove('active');
            gameArea.style.display = 'none';
        }
        
        // Clear all UI elements
        if (gameBoard) gameBoard.innerHTML = '';
        if (logArea) logArea.innerHTML = '';
        if (controlsArea) controlsArea.innerHTML = '';
        if (unitStatusPanel) unitStatusPanel.innerHTML = '';
        
        // Reset overlays and panels
        if (gameOverOverlay) {
            gameOverOverlay.classList.remove('active');
            gameOverOverlay.style.display = 'none';
        }
        if (sidebar) sidebar.classList.add('hidden');
        if (showPanelBtn) showPanelBtn.style.display = 'none';
        
        // Remove any lingering event listeners from tiles
        document.querySelectorAll('.tile').forEach(tile => {
            tile.replaceWith(tile.cloneNode(true));
        });
        
        // Reset points display
        const pointsDisplay = document.getElementById('points-display');
        if (pointsDisplay) {
            pointsDisplay.textContent = `Points: ${playerPoints}`;
            pointsDisplay.classList.remove('error');
        }

        // Reset mode selection buttons
        const modeButtons = document.querySelectorAll('.mode-select-btn');
        modeButtons.forEach(btn => {
            btn.disabled = false;
            btn.classList.remove('selected');
        });

        // Restore their display (do not redeclare, just reuse existing variables)
        if (unitStatusPanel) unitStatusPanel.style.display = '';
        if (logArea) logArea.style.display = '';
    }

    // Play Again button logic
    const playAgainBtn = document.getElementById('play-again-btn');
    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', () => {
            resetGameToWelcome();
        });
    }

    // --- Simple Unit Status Panel for Crown and Horde Units in 2-Player Mode ---
    function updateUnitStatusPanel() {
        const panel = document.getElementById('unit-status-panel');
        if (!panel) return;
        if (gameState.mode === 'two-player') {
            const crownUnits = Object.values(placedUnits).filter(u => u.faction === 'crown' && u.currentHp > 0);
            const hordeUnits = Object.values(placedUnits).filter(u => u.faction === 'horde' && u.currentHp > 0);
            if (crownUnits.length === 0 && hordeUnits.length === 0) {
                panel.innerHTML = '<div style="color:#bbb; text-align:center;">No units alive.</div>';
                return;
            }
            panel.innerHTML = `
                <div><strong>Crown Units</strong></div>
                ${crownUnits.map(unit => {
                    const pct = unit.currentHp / unit.hp;
                    let statusClass = 'status-healthy';
                    if (pct <= 0.3) statusClass = 'status-critical';
                    else if (pct <= 0.6) statusClass = 'status-wounded';
                    
                    // Get status effects
                    const statusEffects = [];
                    if (unit.skipNextTurn) {
                        if (unit.row !== undefined && unit.col !== undefined) {
                            const tile = document.getElementById(`tile-${unit.row}-${unit.col}`);
                            if (tile && tile.dataset.terrain === 'water') {
                                statusEffects.push('<span class="status-effect-icon status-effect-water" title="Slowed by water"></span>');
                            } else {
                                statusEffects.push('<span class="status-effect-icon status-effect-stun" title="Stunned"></span>');
                            }
                        }
                    }
                    if (unit.isBeingAttacked) {
                        statusEffects.push('<span class="status-effect-icon status-effect-spell" title="Under spell effect"></span>');
                    }
                    
                    return `
                        <div class="unit-status-entry">
                            <strong>${unit.name}</strong> (${unit.symbol})<br>
                            <span class="${statusClass}">${unit.currentHp} / ${unit.hp} HP</span>
                            <div class="status-effects">${statusEffects.join('')}</div>
                        </div>
                    `;
                }).join('')}
                <div style="margin-top:10px;"><strong>Horde Units</strong></div>
                ${hordeUnits.map(unit => {
                    const pct = unit.currentHp / unit.hp;
                    let statusClass = 'status-healthy';
                    if (pct <= 0.3) statusClass = 'status-critical';
                    else if (pct <= 0.6) statusClass = 'status-wounded';
                    
                    // Get status effects
                    const statusEffects = [];
                    if (unit.skipNextTurn) {
                        if (unit.row !== undefined && unit.col !== undefined) {
                            const tile = document.getElementById(`tile-${unit.row}-${unit.col}`);
                            if (tile && tile.dataset.terrain === 'water') {
                                statusEffects.push('<span class="status-effect-icon status-effect-water" title="Slowed by water"></span>');
                            } else {
                                statusEffects.push('<span class="status-effect-icon status-effect-stun" title="Stunned"></span>');
                            }
                        }
                    }
                    if (unit.isBeingAttacked) {
                        statusEffects.push('<span class="status-effect-icon status-effect-spell" title="Under spell effect"></span>');
                    }
                    
                    return `
                        <div class="unit-status-entry">
                            <strong>${unit.name}</strong> (${unit.symbol})<br>
                            <span class="${statusClass}">${unit.currentHp} / ${unit.hp} HP</span>
                            <div class="status-effects">${statusEffects.join('')}</div>
                        </div>
                    `;
                }).join('')}
            `;
        } else {
            // Single player: show only Crown units
            const crownUnits = Object.values(placedUnits).filter(u => u.faction === 'crown' && u.currentHp > 0);
            if (crownUnits.length === 0) {
                panel.innerHTML = '<div style="color:#bbb; text-align:center;">No units alive.</div>';
                return;
            }
            panel.innerHTML = crownUnits.map(unit => {
                const pct = unit.currentHp / unit.hp;
                let statusClass = 'status-healthy';
                if (pct <= 0.3) statusClass = 'status-critical';
                else if (pct <= 0.6) statusClass = 'status-wounded';
                
                // Get status effects
                const statusEffects = [];
                if (unit.skipNextTurn) {
                    if (unit.row !== undefined && unit.col !== undefined) {
                        const tile = document.getElementById(`tile-${unit.row}-${unit.col}`);
                        if (tile && tile.dataset.terrain === 'water') {
                            statusEffects.push('<span class="status-effect-icon status-effect-water" title="Slowed by water"></span>');
                        } else {
                            statusEffects.push('<span class="status-effect-icon status-effect-stun" title="Stunned"></span>');
                        }
                    }
                }
                if (unit.isBeingAttacked) {
                    statusEffects.push('<span class="status-effect-icon status-effect-spell" title="Under spell effect"></span>');
                }
                
                return `
                    <div class="unit-status-entry">
                        <strong>${unit.name}</strong> (${unit.symbol})<br>
                        <span class="${statusClass}">${unit.currentHp} / ${unit.hp} HP</span>
                        <div class="status-effects">${statusEffects.join('')}</div>
                    </div>
                `;
            }).join('');
        }
    }

    // --- Panel Toggle Logic ---
    function setPanelCollapsed(panelId, collapsed) {
        const panel = document.getElementById(panelId);
        const btn = panel && panel.querySelector('.panel-toggle-btn');
        if (!panel || !btn) return;
        if (collapsed) {
            panel.classList.add('collapsed');
            btn.textContent = '+';
        } else {
            panel.classList.remove('collapsed');
            btn.textContent = '−';
        }
    }
    function setupPanelToggle(panelId) {
        const panel = document.getElementById(panelId);
        const btn = panel && panel.querySelector('.panel-toggle-btn');
        if (!panel || !btn) return;
        btn.addEventListener('click', () => {
            const collapsed = panel.classList.toggle('collapsed');
            btn.textContent = collapsed ? '+' : '−';
        });
    }
    // Set default panel states for each phase
    function setPanelDefaults(phase) {
        // phase: 'deploy', 'battle', 'gameover'
        setPanelCollapsed('unit-status-panel', phase === 'deploy');
        setPanelCollapsed('controls-area', phase !== 'deploy');
        setPanelCollapsed('log-area', false);
    }
    // Setup toggles on DOMContentLoaded
    setupPanelToggle('unit-status-panel');
    setupPanelToggle('controls-area');
    setupPanelToggle('log-area');
    // Set initial state for deployment phase
    setPanelDefaults('deploy');

    // --- Hero Promotion System ---
    const HERO_NAMES = [
        "Varn the Ash-Blooded", "Serra Ironheart", "Durnan the Relentless", "Kael of the Dawn", "Mira Stormblade", "Thane the Unbroken", "Lira the Swift", "Bramm the Stalwart", "Eira the Flame", "Garrick the Wolf", "Sable the Silent", "Torin the Just"
    ];
    function getRandomHeroName() {
        return HERO_NAMES[Math.floor(Math.random() * HERO_NAMES.length)];
    }
    function promoteToHero(unit) {
        if (unit.isHero) return;
        unit.isHero = true;
        unit.level = 2;
        unit.heroName = getRandomHeroName();
        unit.attack += 2;
        unit.hp += 5;
        unit.currentHp += 5;
        // Visual: add star icon, gold glow, tooltip
        const unitEl = document.getElementById(unit.id);
        if (unitEl) {
            // Add star icon if not present
            if (!unitEl.querySelector('.hero-star')) {
                const star = document.createElement('span');
                star.className = 'hero-star';
                star.textContent = '★';
                star.style.position = 'absolute';
                star.style.top = '2px';
                star.style.right = '6px';
                star.style.fontSize = '1.2em';
                star.style.color = '#ffd700';
                star.style.textShadow = '0 0 6px #fff176, 0 0 2px #fff';
                star.style.pointerEvents = 'none';
                unitEl.appendChild(star);
            }
            unitEl.classList.add('hero-glow');
            unitEl.title = unit.heroName;
        }
        // Log dramatic message
        logMessage(`⚔ A HERO HAS EMERGED: ${unit.heroName} rises from the ranks!`, 'important', true, unit.faction);
    }
    function heroNameOr(unit) {
        return unit.isHero && unit.heroName ? unit.heroName : unit.name;
    }
    // Patch: Track stats for each unit
    function ensureUnitStats(unit) {
        if (unit.kills === undefined) unit.kills = 0;
        if (unit.totalDamage === undefined) unit.totalDamage = 0;
        if (unit.turnsSurvived === undefined) unit.turnsSurvived = 0;
        if (unit.hasTakenDamage === undefined) unit.hasTakenDamage = false;
    }
    // Patch: In createGameBoard and generateEnemyUnits, ensure stats for each unit
    // Patch: In attackUnit, increment stats
    // Patch: In processNextUnitAction, increment turnsSurvived
    // Patch: At end of each turn (in startNewTurn), check for hero promotion
    function checkHeroPromotion() {
        Object.values(placedUnits).forEach(unit => {
            ensureUnitStats(unit);
            if (!unit.isHero && (
                unit.totalDamage >= 20 ||
                unit.kills >= 2 ||
                (unit.turnsSurvived >= 6 && unit.hasTakenDamage)
            )) {
                promoteToHero(unit);
            }
        });
    }
    // Patch: In startNewTurn, after incrementing turnsSurvived, call checkHeroPromotion
    // Patch: In logMessage, use heroNameOr(unit) for unit names

    // Welcome screen mode selection logic
    const singlePlayerBtn = document.getElementById('single-player-btn');
    const twoPlayerBtn = document.getElementById('two-player-btn');

    if (singlePlayerBtn) {
        singlePlayerBtn.addEventListener('click', () => {
            console.log('Single player mode selected');
            gameState.mode = 'single';
            if (welcomeScreen) {
                welcomeScreen.classList.add("fade-out");
                setTimeout(() => {
                    welcomeScreen.classList.remove("active");
                    welcomeScreen.style.display = "none";
                }, 700);
            }
            if (gameArea) {
                gameArea.classList.add("active");
                playerPoints = 1000;
                gameLog = [];
                if(logArea) logArea.innerHTML = "";
                createGameBoard();
                createControls();
            }
        });
    }

    if (twoPlayerBtn) {
        twoPlayerBtn.addEventListener('click', () => {
            console.log('Two player mode selected');
            gameState.mode = 'two-player';
            if (welcomeScreen) {
                welcomeScreen.classList.add("fade-out");
                setTimeout(() => {
                    welcomeScreen.classList.remove("active");
                    welcomeScreen.style.display = "none";
                }, 700);
            }
            if (gameArea) {
                gameArea.classList.add("active");
                playerPoints = 1000;
                gameLog = [];
                if(logArea) logArea.innerHTML = "";
                createGameBoard();
                createControls();
                setupTwoPlayerDeployment();
            }
        });
    }

    // --- Deployment Modal Logic ---
    function showDeploymentModal(message, showButton = true, buttonText = 'OK', onClick = null) {
        const modal = document.getElementById('deployment-modal');
        if (!modal) return;
        modal.innerHTML = `<div>${message}</div>`;
        if (showButton) {
            const btn = document.createElement('button');
            btn.textContent = buttonText;
            btn.style.marginTop = '18px';
            btn.style.width = '100%';
            btn.style.fontSize = '1.1em';
            btn.onclick = () => {
                modal.style.display = 'none';
                if (onClick) onClick();
            };
            modal.appendChild(btn);
        }
        modal.style.display = 'flex';
    }
    function hideDeploymentModal() {
        const modal = document.getElementById('deployment-modal');
        if (modal) modal.style.display = 'none';
    }

    // Add this helper function for the Shaman's blue blast effect
    function createBlueBlastEffect(tile) {
        const blast = document.createElement('div');
        blast.style.position = 'absolute';
        blast.style.left = '0';
        blast.style.top = '0';
        blast.style.width = '100%';
        blast.style.height = '100%';
        blast.style.pointerEvents = 'none';
        blast.style.backgroundImage = "url('img/blueblast.png')";
        blast.style.backgroundSize = 'cover';
        blast.style.backgroundRepeat = 'no-repeat';
        blast.style.backgroundPosition = 'center';
        blast.style.zIndex = '10';
        tile.appendChild(blast);
        setTimeout(() => blast.remove(), 500);
    }

    // Add this helper function for the Cavalry's streak effect
    function createCavalryStreakEffect(tile) {
        const streak = document.createElement('div');
        streak.style.position = 'absolute';
        streak.style.left = '0';
        streak.style.top = '0';
        streak.style.width = '100%';
        streak.style.height = '100%';
        streak.style.pointerEvents = 'none';
        streak.style.background = 'linear-gradient(90deg, rgba(255,255,0,0.3) 0%, rgba(255,255,255,0.7) 50%, rgba(255,255,0,0.3) 100%)';
        streak.style.opacity = '0.8';
        streak.style.zIndex = '12';
        streak.style.borderRadius = '12px';
        streak.style.transition = 'opacity 0.3s';
        tile.appendChild(streak);
        setTimeout(() => { streak.style.opacity = '0'; }, 200);
        setTimeout(() => streak.remove(), 500);
    }
});

