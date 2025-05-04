// Make sure the DOM is fully loaded before initializing
document.addEventListener("DOMContentLoaded", () => {
    // Initialize game elements
    const welcomeScreen = document.getElementById("welcome-screen");
    const gameArea = document.getElementById("game-area");
    const startGameBtn = document.getElementById("start-game-btn");
    const gameBoard = document.getElementById("game-board");
    const controlsArea = document.getElementById("controls-area");
    const logArea = document.getElementById("log-area");
    const gameOverOverlay = document.getElementById("game-over-overlay");
    const gameOverMessage = document.getElementById("game-over-message");

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

        for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i++) {
            const tile = document.createElement("div");
            tile.classList.add("tile");
            const row = Math.floor(i / BOARD_SIZE);
            const col = i % BOARD_SIZE;
            tile.dataset.row = row;
            tile.dataset.col = col;
            tile.id = `tile-${row}-${col}`;

            const terrainType = getRandomTerrain();
            tile.classList.add(`terrain-${terrainType}`);
            tile.dataset.terrain = terrainType;
            const terrainSpan = document.createElement("span");
            terrainSpan.classList.add("terrain-letter");
            terrainSpan.textContent = TERRAIN_REPRESENTATION[terrainType];
            tile.appendChild(terrainSpan);

            tile.addEventListener("click", handleTileClick);

            if (row >= BOARD_SIZE - PLAYER_DEPLOYMENT_ROWS) {
                tile.classList.add("deployment-zone");
            }

            gameBoard.appendChild(tile);
        }
        console.log("Game board created with terrain and placement listeners.");
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
        logMessage("Battle Begins!");

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
             logMessage(`The Horde appears with ${enemiesPlaced} units!`);
        } else {
             logMessage("The Horde failed to muster forces?");
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

        logMessage(line, 'normal');
    }

    function logMessage(message, type = 'normal', isDramatic = false) {
        if (!logArea) return;
        gameLog.push(message);
        const logEntry = document.createElement("p");
        logEntry.textContent = message;
        
        // Add appropriate class based on message type
        if (type !== 'normal') {
            logEntry.classList.add(`log-message-${type}`);
        }
        
        // Add faction-based coloring
        const unitMatch = message.match(/^([A-Za-z]+)/);
        if (unitMatch) {
            const unitName = unitMatch[0];
            const unit = Object.values(placedUnits).find(u => u.name === unitName);
            if (unit) {
                logEntry.classList.add(`log-${unit.faction}`);
            }
        }
        
        if (isDramatic) {
            logEntry.classList.add('log-message-dramatic');
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

    function moveUnit(unit, targetEnemy) {
        let moved = false;
        let currentMinDist = getDistance(unit, targetEnemy);
        const maxMoves = unit.speed;

        const potentialMoves = [];
        // Add all 8 possible directions (orthogonal and diagonal)
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
            let foundMove = false;
            let bestMove = null;
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
                    bestMove = { r: newRow, c: newCol };
                    foundMove = true;
                }
            }

            if (!foundMove) break;

            // Execute the move
            const oldTileKey = `${unit.row}-${unit.col}`;
            const newTileKey = `${bestMove.r}-${bestMove.c}`;
            const oldTile = document.getElementById(`tile-${oldTileKey}`);
            const newTile = document.getElementById(`tile-${newTileKey}`);
            const unitElement = document.getElementById(unit.id);

            if (oldTile && newTile && unitElement) {
                unit.row = bestMove.r;
                unit.col = bestMove.c;
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
            logMessage(`${unit.name} (${unit.id.substring(0,4)}) moves ${movesMade} squares.`);
        } else {
            logMessage(`${unit.name} (${unit.id.substring(0,4)}) cannot find a path or is blocked.`);
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

    function attackUnit(attacker, target) {
        if (!attacker || !target || attacker.currentHp <= 0 || target.currentHp <= 0) {
            return false; // Attack failed
        }

        const damage = Math.max(1, attacker.attack - target.defense);
        const isCrit = Math.random() < 0.1; // 10% chance for critical hit
        const finalDamage = isCrit ? damage * 2 : damage;
        
        if (attacker.name === "Wizard") {
            // Wizard's splash damage attack
            const affectedUnits = getUnitsInArea(target.row, target.col);
            logMessage("The wizard's fireball explodes, engulfing the area in flame!", 'spell', true);
            logFlavorMessage('spell', attacker);
            
            // Create flame effect on all affected tiles
            for (let r = Math.max(0, target.row - 1); r <= Math.min(BOARD_SIZE - 1, target.row + 1); r++) {
                for (let c = Math.max(0, target.col - 1); c <= Math.min(BOARD_SIZE - 1, target.col + 1); c++) {
                    const tile = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
                    if (tile) {
                        createFlameEffect(tile);
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
                
                const damageType = isMainTarget ? "full" : "splash";
                const message = `${attacker.name} deals ${splashDamage} ${damageType} damage to ${unit.name} (${unit.id.substring(0,4)}). (${unit.currentHp} HP left)`;
                await logMessage(message, isMainTarget ? 'spell' : 'normal', isMainTarget);
                
                // Check for low health flavor message
                if (unit.currentHp > 0 && unit.currentHp < unit.hp * 0.3) {
                    logFlavorMessage('low-health', unit);
                }
                
                // Flash effect for all affected units
                flashElement(document.getElementById(unit.id), "damage-flash");
                flashElement(document.getElementById(unit.id), "wizard-flash");
                
                if (unit.currentHp <= 0) {
                    await logMessage(`${unit.name} (${unit.id.substring(0,4)}) has been defeated!`, 'death', true);
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
            
            const message = `${attacker.name} (${attacker.id.substring(0,4)}) attacks ${target.name} (${target.id.substring(0,4)}) for ${finalDamage} damage${isCrit ? ' (CRITICAL HIT!)' : ''}. (${target.currentHp} HP left)`;
            return logMessage(message, isCrit ? 'crit' : 'normal', isCrit).then(() => {
                flashElement(document.getElementById(attacker.id), "attack-flash");
                flashElement(document.getElementById(target.id), "damage-flash");
                
                // Check for low health flavor message
                if (target.currentHp > 0 && target.currentHp < target.hp * 0.3) {
                    logFlavorMessage('low-health', target);
                }
                
                if (target.currentHp <= 0) {
                    return logMessage(`${target.name} (${target.id.substring(0,4)}) has been defeated!`, 'death', true).then(() => {
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
            message = "Victory for the Crown!";
            victory = true;
        } else if (!crownUnitsAlive && hordeUnitsAlive) {
            message = "Victory for the Horde!";
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

    // --- Initialization ---
    if (startGameBtn) {
        startGameBtn.addEventListener("click", () => {
            if (welcomeScreen) {
                welcomeScreen.classList.remove("active");
            }
            if (gameArea) {
                gameArea.classList.add("active");
                playerPoints = 1000;
                gameLog = [];
                if(logArea) logArea.innerHTML = "";
                createGameBoard();
                createControls();
                console.log("Game started! Player points: ", playerPoints);
            }
        });
    }
});

