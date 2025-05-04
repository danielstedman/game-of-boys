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

        if (selectedUnitType && row >= BOARD_SIZE - PLAYER_DEPLOYMENT_ROWS) {
            const unitToPlace = UNITS.crown[selectedUnitType];
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

    function displayUnitStats(unitId) {
        if (!unitStatsDisplay || !unitId || !UNITS.crown[unitId]) {
            if (unitStatsDisplay) unitStatsDisplay.innerHTML = "Select a unit to see stats.";
            return;
        }
        const unit = UNITS.crown[unitId];
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

        // Hide the deployment panel/sidebar and show the Show Panel button
        const sidebar = document.querySelector('.sidebar');
        const showPanelBtn = document.getElementById('show-panel-btn');
        if (sidebar && showPanelBtn) {
            sidebar.classList.add('hidden');
            showPanelBtn.style.display = 'block';
        }

        const unitButtons = controlsArea.querySelectorAll(".unit-select-btn");
        unitButtons.forEach(btn => btn.disabled = true);
        selectedUnitType = null;
        if (unitStatsDisplay) unitStatsDisplay.innerHTML = "Battle in progress...";
        const startBtn = document.getElementById("start-battle-btn");
        if (startBtn) startBtn.disabled = true;

        generateEnemyUnits();
        runBattleSimulation(); // Start the simulation loop
    }

    function generateEnemyUnits() {
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
        updatePointsDisplay();

        const unitList = document.createElement("div");
        unitList.id = "unit-selection-menu";
        for (const unitId in UNITS.crown) {
            const unit = UNITS.crown[unitId];
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
                console.log(`Selected unit: ${unit.name}`);
                displayUnitStats(unitId);
            });
            unitList.appendChild(unitButton);
        }
        controlsArea.appendChild(unitList);

        unitStatsDisplay = document.createElement("div");
        unitStatsDisplay.id = "unit-stats-display";
        unitStatsDisplay.innerHTML = "Select a unit to see stats.";
        controlsArea.appendChild(unitStatsDisplay);

        const startBattleButton = document.createElement("button");
        startBattleButton.id = "start-battle-btn";
        startBattleButton.textContent = "Start Battle";
        startBattleButton.addEventListener("click", startBattle);
        controlsArea.appendChild(startBattleButton);
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
            .replace('[A]', data.attacker || '')
            .replace('[D]', data.defender || '')
            .replace('[DMG]', data.damage !== undefined ? data.damage : '')
            .replace('[U]', data.unit || '');
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
            // If the special move killed the target, ensure the main loop continues
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
                        // Pulse spell effect on units in area
                        if (tile.dataset.unitOnTile) pulseUnit(tile.dataset.unitOnTile, 'unit-pulse-spell');
                    }
                }
            }
            
            return Promise.all(affectedUnits.map(async unit => {
                const isMainTarget = unit.id === target.id;
                const splashDamage = isMainTarget ? finalDamage : Math.floor(finalDamage / 2);
                unit.currentHp -= splashDamage;
                
                // Update health bar for affected unit
                if (unit.healthBar) {
                    updateHealthBar(unit, unit.healthBar);
                }
                
                const msg = fillTemplate(randomTemplate(isMainTarget ? (isCrit ? 'crit' : 'attack') : 'attack'), {
                    attacker: attacker.name,
                    defender: unit.name,
                    damage: splashDamage
                });
                await logMessage(msg, isMainTarget ? (isCrit ? 'crit' : 'spell') : 'attack', isMainTarget, attacker.faction);
                
                // Check for low health flavor message
                if (unit.currentHp > 0 && unit.currentHp < unit.hp * 0.3) {
                    logFlavorMessage('low-health', unit);
                }
                
                // Flash effect for all affected units
                flashElement(document.getElementById(unit.id), "damage-flash");
                flashElement(document.getElementById(unit.id), "wizard-flash");
                
                if (unit.currentHp <= 0) {
                    const deathMsg = fillTemplate(randomTemplate('death'), { defender: unit.name });
                    await logMessage(deathMsg, 'death', true, unit.faction);
                    logFlavorMessage('death', unit);
                    removeUnit(unit);
                }
            })).then(() => true);
        } else {
            // Regular attack
            target.currentHp -= finalDamage;
            
            // Update health bar for target
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
                
                // Check for low health flavor message
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
        } else if (!crownUnitsAlive && hordeUnitsAlive) {
            message = "Defeat!";
            victory = true;
        } else if (!crownUnitsAlive && !hordeUnitsAlive && turnNumber > 0) { // Only declare draw after turn 0
            message = "Mutual Annihilation!";
            victory = true;
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
            return true;
        }
        return false;
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
        proj.style.transition = 'transform 0.3s linear';
        fromTile.parentElement.appendChild(proj);
        // Calculate translation
        const dx = (toRect.left - fromRect.left) + (toRect.width - fromRect.width) / 2;
        const dy = (toRect.top - fromRect.top) + (toRect.height - fromRect.height) / 2;
        setTimeout(() => {
            proj.style.transform = `translate(${dx}px, ${dy}px)`;
        }, 10);
        setTimeout(() => {
            proj.remove();
        }, 500);
    }

    // --- Initialization ---
    if (startGameBtn) {
        console.log("Adding click listener to start button");
        startGameBtn.addEventListener("click", () => {
            console.log("Start button clicked");
            if (welcomeScreen) {
                console.log("Removing active class from welcome screen");
                welcomeScreen.classList.remove("active");
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
});

