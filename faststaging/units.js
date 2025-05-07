// Unit definitions for all factions
const UNITS = {
    // Crown Faction Units
    crown: {
        militia: { 
            name: "Militia", 
            symbol: "M", 
            cost: 50, 
            hp: 20,
            attack: 6,
            defense: 2, 
            range: 1, 
            speed: 1,
            specialMove: {
                name: "Last Stand",
                description: "If HP < 10, does double damage (10% chance)",
                chance: 0.10,
                effect: "lastStand"
            }
        },
        archer: { 
            name: "Archer", 
            symbol: "A", 
            cost: 75, 
            hp: 25, 
            attack: 7,
            defense: 1, 
            range: 4, 
            speed: 1,
            specialMove: {
                name: "Quick Shot",
                description: "Attacks twice (10% chance)",
                chance: 0.10,
                effect: "quickShot"
            }
        },
        knight: {
            name: "Knight",
            symbol: "K",
            cost: 100,
            hp: 45,
            attack: 7,
            defense: 4,
            range: 1,
            speed: 1,
            specialMove: {
                name: "Shield Bash",
                description: "Stuns enemy for 1 turn (5% chance)",
                chance: 0.05,
                effect: "shieldBash"
            }
        },
        wizard: { 
            name: "Wizard", 
            symbol: "W", 
            cost: 150, 
            hp: 20, 
            attack: 10, 
            defense: 1, 
            range: 4,
            speed: 1,
            fly: true,
            specialMove: {
                name: "Inferno Surge",
                description: "3x3 AoE fire (10% chance)",
                chance: 0.10,
                effect: "infernoSurge"
            }
        },
        paladin: {
            name: "Paladin",
            symbol: "P",
            cost: 175,
            hp: 50,
            attack: 8,
            defense: 5,
            range: 1,
            speed: 1,
            specialMove: {
                name: "Divine Shield",
                description: "Blocks all damage once (5% chance)",
                chance: 0.05,
                effect: "divineShield"
            }
        },
        crossbowman: {
            name: "Crossbowman",
            symbol: "C",
            cost: 125,
            hp: 30,
            attack: 9,
            defense: 1,
            range: 4,
            speed: 1,
            specialMove: {
                name: "Piercing Bolt",
                description: "Ignores enemy defense (10% chance)",
                chance: 0.10,
                effect: "piercingBolt"
            }
        },
        cleric: {
            name: "Cleric",
            symbol: "H",
            cost: 175,
            hp: 25,
            attack: 6,
            defense: 2,
            range: 5,
            speed: 1,
            specialMove: {
                name: "Holy Mend",
                description: "Heals nearest ally 10 HP (15% chance)",
                chance: 0.15,
                effect: "holyMend"
            }
        },
        scout: {
            name: "Scout",
            symbol: "S",
            cost: 60,
            hp: 18,
            attack: 5,
            defense: 1,
            range: 1,
            speed: 4,
            specialMove: {
                name: "Blinding Dust",
                description: "Reduces enemy accuracy (10% chance)",
                chance: 0.10,
                effect: "blindingDust"
            }
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
            defense: 2,
            range: 1, 
            speed: 1,
            specialMove: {
                name: "Roar of Blood",
                description: "Boosts own attack for next turn (10% chance)",
                chance: 0.10,
                effect: "roarOfBlood"
            }
        },
        goblin: { 
            name: "Goblin", 
            symbol: "G", 
            cost: 40, 
            hp: 15,
            attack: 4,
            defense: 1, 
            range: 1, 
            speed: 3,
            specialMove: {
                name: "Backstab",
                description: "Critical hit if target is distracted (10% chance)",
                chance: 0.10,
                effect: "backstab"
            }
        },
        troll: {
            name: "Troll",
            symbol: "T",
            cost: 100,
            hp: 45,
            attack: 7,
            defense: 4,
            range: 2,
            speed: 1,
            specialMove: {
                name: "Thick Hide",
                description: "Regenerates 5 HP (5% chance)",
                chance: 0.05,
                effect: "thickHide"
            }
        },
        shaman: {
            name: "Shaman",
            symbol: "S",
            cost: 140,
            hp: 25,
            attack: 7,
            defense: 1,
            range: 3,
            speed: 1,
            specialMove: {
                name: "Spirit Burst",
                description: "3x3 AoE magic pulse (10% chance)",
                chance: 0.10,
                effect: "spiritBurst"
            }
        },
        berserker: {
            name: "Berserker",
            symbol: "B",
            cost: 180,
            hp: 40,
            attack: 10,
            defense: 2,
            range: 1,
            speed: 2,
            specialMove: {
                name: "Blood Frenzy",
                description: "Takes extra turn if HP < 50% (10% chance)",
                chance: 0.10,
                effect: "bloodFrenzy"
            }
        },
        wolfrider: {
            name: "Wolfrider",
            symbol: "W",
            cost: 90,
            hp: 30,
            attack: 7,
            defense: 2,
            range: 2,
            speed: 4,
            specialMove: {
                name: "Howl",
                description: "Buffs speed of nearby allies (15% chance)",
                chance: 0.15,
                effect: "howl"
            }
        },
        ogre: {
            name: "Ogre",
            symbol: "O",
            cost: 160,
            hp: 55,
            attack: 8,
            defense: 5,
            range: 1,
            speed: 2,
            specialMove: {
                name: "Quake Slam",
                description: "AoE attack + knockback 1 tile (5% chance)",
                chance: 0.05,
                effect: "quakeSlam"
            }
        },
        imp: {
            name: "Imp",
            symbol: "I",
            cost: 70,
            hp: 15,
            attack: 4,
            defense: 1,
            range: 3,
            speed: 1,
            fly: true,
            specialMove: {
                name: "Trickster Blink",
                description: "Randomly teleports 1 tile away when attacked (10% chance)",
                chance: 0.10,
                effect: "tricksterBlink"
            }
        },
        bloodboy: {
            name: "BloodBoy",
            symbol: "B",
            cost: 120,
            hp: 30,
            attack: 8,
            defense: 2,
            range: 2,
            speed: 2,
            specialMove: {
                name: "Lifesteal",
                description: "Heals for damage dealt (10% chance)",
                chance: 0.10,
                effect: "lifesteal"
            }
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