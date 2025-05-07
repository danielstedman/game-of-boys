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

    // Message templates for log events
    const LOG_TEMPLATES = {
        attack: [
            '[A] strikes [D] for [DMG]!',
            '[A] hacks at [D], dealing [DMG]!',
            '[A] attacks — blood sprays from [D]!',
            '[A] swings at [D] and hits for [DMG]!',
            '[A] lands a blow on [D] ([DMG] damage)!'
        ],
        move: [
            '[U] advances.',
            '[U] moves forward.',
            '[U] charges ahead.',
            '[U] repositions.',
            '[U] shifts on the battlefield.'
        ],
        hold: [
            '[U] holds position.',
            '[U] stands their ground.',
            '[U] waits for an opening.',
            '[U] braces for impact.'
        ],
        death: [
            '[D] falls, their shield shattered!',
            '[D] screams as they collapse!',
            '[D] is torn apart in a burst of gore!',
            '[D] drops to the ground, defeated!',
            'A silence falls as [D] is slain!'
        ],
        spell: [
            '[A] unleashes a torrent of magic!',
            '[A] casts a devastating spell!',
            'Arcane fire erupts from [A]!',
            '[A] conjures a blast of energy!'
        ],
        crit: [
            '[A] lands a CRITICAL HIT on [D] for [DMG]!',
            '[A] delivers a devastating blow to [D] ([DMG] CRIT)!',
            '[A] strikes true — [D] is rocked by a critical hit!'
        ]
    };

    // --- Game State for Mode Selection ---
    const gameState = {
        mode: 'single', // or 'two-player' or 'campaign'
        deploymentPhase: null, // 'crown', 'horde', or null
        campaignLevel: null
    };

    // --- Campaign State ---
    const campaignState = {
        currentLevel: 1,
        survivingUnits: [],
        defeatedUnits: [],
        totalHeroes: 0,
        playerPoints: 1000
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
        // For campaign mode, generate horde right before battle if not present
        if (gameState.mode === 'campaign' && !Object.values(placedUnits).some(u => u.faction === 'horde')) {
            const enemyPoints = 1000 + ((gameState.campaignLevel - 1) * 100);
            setTimeout(() => {
                generateHordeDeployment(enemyPoints);
                console.log("DEBUG: After generateHordeDeployment, horde units:", Object.values(placedUnits).filter(u => u.faction === 'horde').length);
                console.log("DEBUG: Before runBattleSimulation, horde units:", Object.values(placedUnits).filter(u => u.faction === 'horde').length);
                runBattleSimulation();
            }, 100);
            setPanelDefaults('battle');
            return;
        } else if (gameState.mode === 'single' && !Object.values(placedUnits).some(u => u.faction === 'horde')) {
            generateHordeDeployment();
            console.log("DEBUG: After generateHordeDeployment, horde units:", Object.values(placedUnits).filter(u => u.faction === 'horde').length);
        }
        console.log("DEBUG: Before runBattleSimulation, horde units:", Object.values(placedUnits).filter(u => u.faction === 'horde').length);
        runBattleSimulation(); // Start the simulation loop
        setPanelDefaults('battle');
    }

    function generateHordeDeployment() {
        console.log("[DEBUG] generateHordeDeployment called");
        // Check if the board is ready
        const testTile = document.getElementById('tile-0-0');
        if (!testTile) {
            console.error("[DEBUG] Board not initialized! No tiles found.");
            return;
        }
        let pointsLeft = 1000;
        const maxAttempts = 1000;
        let attempts = 0;
        let placed = 0;
        const usedTiles = new Set();
        while (pointsLeft > 0 && attempts < maxAttempts) {
            attempts++;
            // Pick a random Horde unit
            const unitKeys = Object.keys(UNITS.horde);
            const randomUnitId = unitKeys[Math.floor(Math.random() * unitKeys.length)];
            const unitData = UNITS.horde[randomUnitId];
            if (unitData.cost > pointsLeft) continue;
            // Pick a random tile in the top 4 rows
            const randomRow = Math.floor(Math.random() * ENEMY_DEPLOYMENT_ROWS);
            const randomCol = Math.floor(Math.random() * BOARD_SIZE);
            const tileKey = `${randomRow}-${randomCol}`;
            if (usedTiles.has(tileKey)) continue;
            const targetTile = document.getElementById(`tile-${tileKey}`);
            if (!targetTile || targetTile.dataset.unitOnTile) continue;
            // Place the unit
            console.log(`[DEBUG] Placing ${randomUnitId} at ${tileKey}, cost: ${unitData.cost}, points left: ${pointsLeft}`);
            const unitElement = document.createElement("div");
            unitElement.classList.add("unit", `unit-${randomUnitId}`, "horde-unit");
            unitElement.textContent = unitData.symbol;
            unitElement.dataset.unitId = randomUnitId;
            // Create health bar
            const healthBar = createHealthBar(unitElement, unitData.hp);
            targetTile.appendChild(unitElement);
            const uniqueId = `horde-${randomUnitId}-${Date.now()}-${Math.random()}`;
            placedUnits[uniqueId] = {
                ...unitData,
                row: randomRow,
                col: randomCol,
                faction: "horde",
                currentHp: unitData.hp,
                id: uniqueId,
                healthBar: healthBar
            };
            ensureUnitStats(placedUnits[uniqueId]);
            targetTile.dataset.unitOnTile = uniqueId;
            unitElement.id = uniqueId;
            usedTiles.add(tileKey);
            pointsLeft -= unitData.cost;
            placed++;
        }
        logMessage(`Enemy reinforcements arrive! (${placed} units, ${1000-pointsLeft} points)`, 'important');
        console.log(`[DEBUG] Horde units generated: ${placed}, points used: ${1000-pointsLeft}`);
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
        logEntry.textContent = message;

        // Faction-based coloring
        if (faction === 'crown') {
            logEntry.classList.add('log-crown');
        } else if (faction === 'horde') {
            logEntry.classList.add('log-horde');
        }

        // Important event styling and flash
        if (IMPORTANT_EVENT_TYPES.includes(type)) {
            logEntry.classList.add('log-important');
            const flashClass = FLASH_CLASS_MAP[type] || 'log-flash-important';
            logEntry.classList.add(flashClass);
        }

        logArea.appendChild(logEntry);
        logArea.scrollTop = logArea.scrollHeight;
        console.log("Log: ", message);

        // Return a promise that resolves after the delay if it's a dramatic event
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

        // Only add the Start Battle button in single-player or campaign mode
        if (gameState.mode === 'single' || gameState.mode === 'campaign') {
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
        return Math.abs(unit1.row - unit2.row) + Math.abs(unit1.col - unit2.col);
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

    function moveUnit(unit, targetEnemy) {
        let moved = false;
        let currentMinDist = getDistance(unit, targetEnemy);
        const maxMoves = unit.speed;

        // All 8 possible directions (orthogonal and diagonal)
        const directions = [
            { r: 0, c: 1 },   // right
            { r: 0, c: -1 },  // left
            { r: 1, c: 0 },   // down
            { r: -1, c: 0 },  // up
            { r: 1, c: 1 },   // down-right
            { r: 1, c: -1 },  // down-left
            { r: -1, c: 1 },  // up-right
            { r: -1, c: -1 }  // up-left
        ];

        let movesMade = 0;
        while (movesMade < maxMoves) {
            let bestMoves = [];
            let bestDist = currentMinDist;

            // Check all possible moves
            for (const dir of directions) {
                const newRow = unit.row + dir.r;
                const newCol = unit.col + dir.c;

                // Skip if out of bounds
                if (newRow < 0 || newRow >= BOARD_SIZE || newCol < 0 || newCol >= BOARD_SIZE) continue;

                // Check if the target tile is occupied
                const targetTile = document.getElementById(`tile-${newRow}-${newCol}`);
                if (!targetTile || targetTile.dataset.unitOnTile) continue;

                // Prevent moving onto water unless unit can fly
                if (targetTile.dataset.terrain === 'water' && !unit.fly) continue;

                // For diagonal moves, check if we can move through the corner
                if (dir.r !== 0 && dir.c !== 0) {
                    const corner1 = document.getElementById(`tile-${unit.row}-${newCol}`);
                    const corner2 = document.getElementById(`tile-${newRow}-${unit.col}`);
                    if ((corner1 && corner1.dataset.unitOnTile) && (corner2 && corner2.dataset.unitOnTile)) {
                        continue; // Skip if both corners are blocked
                    }
                }

                // Calculate distance to target
                const dist = Math.abs(newRow - targetEnemy.row) + Math.abs(newCol - targetEnemy.col);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestMoves = [{ r: newRow, c: newCol }];
                } else if (dist === bestDist) {
                    bestMoves.push({ r: newRow, c: newCol });
                }
            }

            if (bestMoves.length === 0 || bestDist >= currentMinDist) break;

            // Pick randomly among the best moves
            const chosenMove = bestMoves[Math.floor(Math.random() * bestMoves.length)];
            const oldTileKey = `${unit.row}-${unit.col}`;
            const newTileKey = `${chosenMove.r}-${chosenMove.c}`;
            const oldTile = document.getElementById(`tile-${oldTileKey}`);
            const newTile = document.getElementById(`tile-${newTileKey}`);
            const unitElement = document.getElementById(unit.id);

            if (oldTile && newTile && unitElement) {
                unit.row = chosenMove.r;
                unit.col = chosenMove.c;
                delete oldTile.dataset.unitOnTile;
                newTile.dataset.unitOnTile = unit.id;
                newTile.appendChild(unitElement);
                moved = true;
                movesMade++;
                currentMinDist = bestDist;
            } else {
                break;
            }
        }

        if (moved) {
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
            default:
                logText = `${attacker.name} attempts a special move, but nothing happens.`;
        }
        logMessage(logText, 'spell', true, attacker.faction);
        return skipNormalAttack;
    }

    // --- Patch: Ensure all units have afflictions/bonuses arrays ---
    function ensureUnitStatusArrays(unit) {
        if (!unit.afflictions) unit.afflictions = [];
        if (!unit.bonuses) unit.bonuses = [];
    }

    const originalAttackUnit = attackUnit;
    attackUnit = function(attacker, target) {
        const result = originalAttackUnit.apply(this, arguments);
        if (target && target.faction === 'crown') updateUnitStatusPanel();
        return result;
    };

    function attackUnit(attacker, target) {
        if (!attacker || !target || attacker.currentHp <= 0 || target.currentHp <= 0) {
            return false; // Attack failed
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
        if (attacker.name === "Wizard") {
            // Wizard's splash damage attack
            const affectedUnits = getUnitsInArea(target.row, target.col);
            logMessage(fillTemplate(randomTemplate('spell'), { attacker: attacker.name }), 'spell', true, attacker.faction);
            logFlavorMessage('spell', attacker);
            // Create flame effect on all affected tiles
            for (let r = Math.max(0, target.row - 1); r <= Math.min(BOARD_SIZE - 1, target.row + 1); r++) {
                for (let c = Math.max(0, target.col - 1); c <= Math.min(BOARD_SIZE - 1, target.col + 1); c++) {
                    const tile = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
                    if (tile) {
                        createFlameEffect(tile);
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
    }

    function flashElement(element, className, duration = 300) {
        if (!element) return;
        element.classList.add(className);
        setTimeout(() => {
            element.classList.remove(className);
        }, duration);
    }

    function processNextUnitAction() {
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
                // Try to move towards the nearest enemy (only one step per action)
                actionTaken = moveUnit(unit, enemy);
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
        
        // Determine unit order for this turn
        currentTurnUnitOrder = Object.keys(placedUnits).filter(id => placedUnits[id] && placedUnits[id].currentHp > 0);
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

        // Check only if battle has started to avoid premature victory messages
        // Or if one side is already empty before the first action
        if (!battleStarted && !(crownUnitsAlive && hordeUnitsAlive)) return false; // Don't check before start unless one side is empty
        if (!battleStarted && (crownUnitsAlive && hordeUnitsAlive)) return false; // Don't check if both have units before start

        let message = null;
        let victory = false;

        if (!hordeUnitsAlive && crownUnitsAlive) {
            message = "Victory!";
            victory = true;
            if (gameState.mode === 'campaign') {
                handleCampaignVictory();
            }
        } else if (!crownUnitsAlive && hordeUnitsAlive) {
            message = "Defeat!";
            victory = true;
            if (gameState.mode === 'campaign') {
                handleCampaignDefeat();
            }
        } else if (!crownUnitsAlive && !hordeUnitsAlive && turnNumber > 0) { // Only declare draw after turn 0
            message = "Mutual Annihilation!";
            victory = true;
            if (gameState.mode === 'campaign') {
                handleCampaignDefeat();
            }
        }

        if (victory) {
            logMessage(message);
            if (unitStatsDisplay) unitStatsDisplay.innerHTML = message;
            if (showOverlay && gameOverOverlay && gameOverMessage) {
                gameOverMessage.textContent = message;
                gameOverOverlay.classList.add("active");
            }
            battleStarted = false; // End the battle state
            if (battleTimeout) clearTimeout(battleTimeout); // Stop any pending actions
            setPanelDefaults('gameover');
            return true;
        }
        return false;
    }

    function handleCampaignVictory() {
        // Save surviving units
        campaignState.survivingUnits = Object.values(placedUnits)
            .filter(u => u && u.faction === 'crown' && u.currentHp > 0)
            .map(u => ({
                ...u,
                currentHp: u.currentHp,
                isHero: u.isHero
            }));

        // Show campaign victory modal
        showCampaignVictoryModal();
    }

    function handleCampaignDefeat() {
        // Reset campaign state
        campaignState.currentLevel = 1;
        campaignState.survivingUnits = [];
        campaignState.defeatedUnits = [];
        campaignState.totalHeroes = 0;
        campaignState.playerPoints = 1000;
    }

    function showCampaignVictoryModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `<div class="modal-content"><h2>Victory!</h2><p>You have completed this campaign level.</p></div>`;
        document.body.appendChild(modal);
    }

    // ... rest of the existing code ...
});