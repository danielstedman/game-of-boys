// Unit definitions for all factions
const UNITS = {
    // Crown Faction Units
    crown: {
        militia: { 
            name: "Militia", 
            symbol: "M", 
            cost: 50, 
            hp: 10, 
            attack: 3, 
            defense: 1, 
            range: 1, 
            speed: 2 
        },
        archer: { 
            name: "Archer", 
            symbol: "A", 
            cost: 100, 
            hp: 8, 
            attack: 4, 
            defense: 0, 
            range: 4, 
            speed: 2 
        },
        knight: {
            name: "Knight",
            symbol: "K",
            cost: 150,
            hp: 12,
            attack: 4,
            defense: 3,
            range: 1,
            speed: 4
        },
        wizard: { 
            name: "Wizard", 
            symbol: "W", 
            cost: 250, 
            hp: 6, 
            attack: 6, 
            defense: 0, 
            range: 3, 
            speed: 2 
        },
        paladin: {
            name: "Paladin",
            symbol: "P",
            cost: 200,
            hp: 14,
            attack: 5,
            defense: 2,
            range: 1,
            speed: 3
        },
        crossbowman: {
            name: "Crossbowman",
            symbol: "X",
            cost: 120,
            hp: 7,
            attack: 5,
            defense: 1,
            range: 3,
            speed: 2
        },
        cleric: {
            name: "Cleric",
            symbol: "C",
            cost: 180,
            hp: 8,
            attack: 3,
            defense: 2,
            range: 2,
            speed: 2
        },
        scout: {
            name: "Scout",
            symbol: "S",
            cost: 80,
            hp: 6,
            attack: 2,
            defense: 1,
            range: 1,
            speed: 5
        }
    },
    
    // Horde Faction Units
    horde: {
        orc: { 
            name: "Orc", 
            symbol: "O", 
            cost: 0, 
            hp: 12, 
            attack: 4, 
            defense: 2, 
            range: 1, 
            speed: 2 
        },
        goblin: { 
            name: "Goblin", 
            symbol: "g", 
            cost: 0, 
            hp: 5, 
            attack: 2, 
            defense: 0, 
            range: 1, 
            speed: 5 
        },
        troll: {
            name: "Troll",
            symbol: "T",
            cost: 0,
            hp: 15,
            attack: 5,
            defense: 3,
            range: 1,
            speed: 1
        },
        shaman: {
            name: "Shaman",
            symbol: "S",
            cost: 0,
            hp: 7,
            attack: 5,
            defense: 0,
            range: 3,
            speed: 2
        },
        berserker: {
            name: "Berserker",
            symbol: "B",
            cost: 0,
            hp: 10,
            attack: 6,
            defense: 1,
            range: 1,
            speed: 4
        },
        wolfrider: {
            name: "Wolfrider",
            symbol: "W",
            cost: 0,
            hp: 8,
            attack: 4,
            defense: 1,
            range: 1,
            speed: 5
        },
        ogre: {
            name: "Ogre",
            symbol: "o",
            cost: 0,
            hp: 18,
            attack: 7,
            defense: 2,
            range: 1,
            speed: 1
        },
        imp: {
            name: "Imp",
            symbol: "i",
            cost: 0,
            hp: 4,
            attack: 3,
            defense: 0,
            range: 2,
            speed: 4
        }
    }
};

// Faction configurations
const FACTIONS = {
    crown: {
        name: "Crown",
        color: "#90caf9",
        deploymentRows: 8
    },
    horde: {
        name: "Horde",
        color: "#ef9a9a",
        deploymentRows: 8
    }
};

// Export the configurations
export { UNITS, FACTIONS }; 