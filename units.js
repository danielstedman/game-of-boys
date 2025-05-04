// Unit definitions for all factions
const UNITS = {
    // Crown Faction Units
    crown: {
        militia: { 
            name: "Militia", 
            symbol: "M", 
            cost: 50, 
            hp: 30, 
            attack: 5, 
            defense: 2, 
            range: 1, 
            speed: 2 
        },
        archer: { 
            name: "Archer", 
            symbol: "A", 
            cost: 75, 
            hp: 25, 
            attack: 8, 
            defense: 1, 
            range: 3, 
            speed: 2 
        },
        knight: {
            name: "Knight",
            symbol: "K",
            cost: 100,
            hp: 40,
            attack: 7,
            defense: 4,
            range: 1,
            speed: 3
        },
        wizard: { 
            name: "Wizard", 
            symbol: "W", 
            cost: 150, 
            hp: 20, 
            attack: 10, 
            defense: 1, 
            range: 2, 
            speed: 2 
        },
        paladin: {
            name: "Paladin",
            symbol: "P",
            cost: 200,
            hp: 50,
            attack: 8,
            defense: 5,
            range: 1,
            speed: 2
        },
        crossbowman: {
            name: "Crossbowman",
            symbol: "C",
            cost: 125,
            hp: 30,
            attack: 9,
            defense: 2,
            range: 3,
            speed: 2
        },
        cleric: {
            name: "Cleric",
            symbol: "H",
            cost: 175,
            hp: 25,
            attack: 6,
            defense: 2,
            range: 2,
            speed: 2
        },
        scout: {
            name: "Scout",
            symbol: "S",
            cost: 60,
            hp: 20,
            attack: 4,
            defense: 1,
            range: 1,
            speed: 4
        }
    },
    
    // Horde Faction Units
    horde: {
        orc: { 
            name: "Orc", 
            symbol: "O", 
            cost: 60, 
            hp: 35, 
            attack: 6, 
            defense: 3, 
            range: 1, 
            speed: 2 
        },
        goblin: { 
            name: "Goblin", 
            symbol: "G", 
            cost: 40, 
            hp: 20, 
            attack: 4, 
            defense: 1, 
            range: 1, 
            speed: 3 
        },
        troll: {
            name: "Troll",
            symbol: "T",
            cost: 120,
            hp: 45,
            attack: 7,
            defense: 4,
            range: 1,
            speed: 2
        },
        shaman: {
            name: "Shaman",
            symbol: "S",
            cost: 140,
            hp: 25,
            attack: 9,
            defense: 1,
            range: 2,
            speed: 2
        },
        berserker: {
            name: "Berserker",
            symbol: "B",
            cost: 180,
            hp: 40,
            attack: 10,
            defense: 2,
            range: 1,
            speed: 3
        },
        wolfrider: {
            name: "Wolfrider",
            symbol: "W",
            cost: 90,
            hp: 30,
            attack: 6,
            defense: 2,
            range: 1,
            speed: 4
        },
        ogre: {
            name: "Ogre",
            symbol: "O",
            cost: 160,
            hp: 55,
            attack: 8,
            defense: 5,
            range: 1,
            speed: 2
        },
        imp: {
            name: "Imp",
            symbol: "I",
            cost: 70,
            hp: 15,
            attack: 5,
            defense: 1,
            range: 2,
            speed: 3
        }
    }
};

// Faction configurations
const FACTIONS = {
    crown: {
        name: "Crown",
        color: "#90caf9",
        deploymentRows: 4
    },
    horde: {
        name: "Horde",
        color: "#ef9a9a",
        deploymentRows: 4
    }
};

export { UNITS, FACTIONS }; 