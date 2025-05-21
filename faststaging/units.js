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
        },
        cavalry: {
            name: "Cavalry",
            symbol: "V",
            cost: 130,
            hp: 35,
            attack: 10,
            defense: 3,
            range: 1,
            speed: 2,
            specialMove: {
                name: "Charge",
                description: "If an enemy is in a straight line within 3 tiles (no blocking units), Cavalry charges: +10 melee damage if it will kill. If not, moves and attacks normally (same turn). Visual streak effect.",
                chance: 0.15,
                effect: "charge"
            }
        }
    },
    
    // Horde Faction Units
    horde: {
        orc: { 
            name: "Orc", 
            symbol: "O", 
            cost: 60, 
            hp: 38,
            attack: 7,
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
            speed: 4,
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
                description: "Regenerates 7 HP (5% chance)",
                chance: 0.05,
                effect: "thickHide"
            }
        },
        shaman: {
            name: "Shaman",
            symbol: "S",
            cost: 140,
            hp: 28,
            attack: 10,
            defense: 1,
            range: 4,
            speed: 1,
            specialMove: {
                name: "Spirit Burst",
                description: "Standard attack: 3x3 AoE magic (main target takes double). Special: 3x3 AoE magic pulse (10% chance)",
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
            speed: 3,
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
            attack: 8,
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
            attack: 9,
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
            speed: 2,
            fly: true,
            waterAdaptive: true,
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
    },

    // Undead Faction Units
    undead: {
        skeleton: {
            name: "Skeleton",
            symbol: "S",
            cost: 45,
            hp: 15,
            attack: 5,
            defense: 1,
            range: 1,
            speed: 2,
            specialMove: {
                name: "Reassemble",
                description: "20% chance to revive on death with 50% HP",
                chance: 0.20,
                effect: "reassemble"
            }
        },
        ghoul: {
            name: "Ghoul",
            symbol: "G",
            cost: 70,
            hp: 25,
            attack: 6,
            defense: 2,
            range: 1,
            speed: 2,
            specialMove: {
                name: "Contagion",
                description: "Inflicts a debuff that reduces attack by 2 for 2 turns",
                chance: 0.15,
                effect: "contagion"
            }
        },
        lich: {
            name: "Lich",
            symbol: "L",
            cost: 160,
            hp: 30,
            attack: 8,
            defense: 3,
            range: 3,
            speed: 1,
            fly: true,
            specialMove: {
                name: "Soul Harvest",
                description: "Heals for 50% of damage dealt when killing an enemy",
                chance: 1.00,
                effect: "soulHarvest"
            }
        },
        boneBeast: {
            name: "Bone Beast",
            symbol: "B",
            cost: 120,
            hp: 40,
            attack: 7,
            defense: 4,
            range: 1,
            speed: 1,
            specialMove: {
                name: "Bone Wall",
                description: "Prevents enemy movement through adjacent tiles",
                chance: 1.00,
                effect: "boneWall"
            }
        },
        necromancer: {
            name: "Necromancer",
            symbol: "N",
            cost: 180,
            hp: 25,
            attack: 6,
            defense: 2,
            range: 3,
            speed: 1,
            specialMove: {
                name: "Raise Dead",
                description: "Summons a Skeleton once per game",
                chance: 1.00,
                effect: "raiseDead"
            }
        }
    },

    // Beasts Faction Units
    beasts: {
        wolf: {
            name: "Wolf",
            symbol: "W",
            cost: 60,
            hp: 20,
            attack: 6,
            defense: 1,
            range: 1,
            speed: 3,
            specialMove: {
                name: "Pack Tactics",
                description: "Deals +3 damage for each adjacent Wolf",
                chance: 1.00,
                effect: "packTactics"
            }
        },
        bear: {
            name: "Bear",
            symbol: "B",
            cost: 100,
            hp: 45,
            attack: 8,
            defense: 3,
            range: 1,
            speed: 2,
            specialMove: {
                name: "Frenzy",
                description: "Gains an extra attack after being hit",
                chance: 0.20,
                effect: "frenzy"
            }
        },
        druid: {
            name: "Druid",
            symbol: "D",
            cost: 140,
            hp: 30,
            attack: 5,
            defense: 2,
            range: 3,
            speed: 2,
            specialMove: {
                name: "Blessing of Roots",
                description: "Heals all allies for 3 HP per turn",
                chance: 1.00,
                effect: "blessingOfRoots"
            }
        },
        treant: {
            name: "Treant",
            symbol: "T",
            cost: 160,
            hp: 60,
            attack: 9,
            defense: 5,
            range: 1,
            speed: 0,
            specialMove: {
                name: "Rooted Slam",
                description: "AoE damage to all adjacent enemies",
                chance: 0.15,
                effect: "rootedSlam"
            }
        },
        stagRider: {
            name: "Stag Rider",
            symbol: "R",
            cost: 120,
            hp: 35,
            attack: 7,
            defense: 2,
            range: 1,
            speed: 3,
            specialMove: {
                name: "Nature's Charge",
                description: "Ignores terrain movement penalties",
                chance: 1.00,
                effect: "naturesCharge"
            }
        }
    },

    // Skyborn Faction Units
    skyborn: {
        swiftbeak: {
            name: "Swiftbeak",
            symbol: "S",
            cost: 70,
            hp: 25,
            attack: 7,
            defense: 1,
            range: 1,
            speed: 4,
            fly: true,
            specialMove: {
                name: "Dive Bomb",
                description: "Deals double damage to ranged units",
                chance: 0.15,
                effect: "diveBomb"
            }
        },
        skyHarrier: {
            name: "Sky Harrier",
            symbol: "H",
            cost: 100,
            hp: 30,
            attack: 6,
            defense: 2,
            range: 3,
            speed: 3,
            fly: true,
            specialMove: {
                name: "Airburst Shot",
                description: "Knocks target back 1 tile",
                chance: 0.20,
                effect: "airburstShot"
            }
        },
        ravenShaman: {
            name: "Raven Shaman",
            symbol: "R",
            cost: 130,
            hp: 28,
            attack: 5,
            defense: 2,
            range: 3,
            speed: 2,
            fly: true,
            specialMove: {
                name: "Wind Hex",
                description: "Reduces enemy movement by 2 for 2 turns",
                chance: 0.15,
                effect: "windHex"
            }
        },
        roc: {
            name: "Roc",
            symbol: "R",
            cost: 180,
            hp: 45,
            attack: 9,
            defense: 3,
            range: 1,
            speed: 3,
            fly: true,
            specialMove: {
                name: "Talon Crush",
                description: "AoE damage when landing from flight",
                chance: 0.20,
                effect: "talonCrush"
            }
        },
        owlWarden: {
            name: "Owl Warden",
            symbol: "O",
            cost: 150,
            hp: 35,
            attack: 6,
            defense: 2,
            range: 4,
            speed: 2,
            fly: true,
            specialMove: {
                name: "Sky Sight",
                description: "Reveals hidden enemies in a 3x3 area",
                chance: 1.00,
                effect: "skySight"
            }
        }
    },

    // The Swarm Faction Units
    swarm: {
        larvae: {
            name: "Larvae",
            symbol: "L",
            cost: 30,
            hp: 10,
            attack: 3,
            defense: 0,
            range: 1,
            speed: 2,
            specialMove: {
                name: "Hatchlings",
                description: "Splits into 2 small bugs on death",
                chance: 1.00,
                effect: "hatchlings"
            }
        },
        spitterBug: {
            name: "Spitter Bug",
            symbol: "S",
            cost: 80,
            hp: 25,
            attack: 5,
            defense: 1,
            range: 3,
            speed: 2,
            specialMove: {
                name: "Corrode Armor",
                description: "Reduces target's defense by 2 for 2 turns",
                chance: 0.20,
                effect: "corrodeArmor"
            }
        },
        devourer: {
            name: "Devourer",
            symbol: "D",
            cost: 140,
            hp: 40,
            attack: 8,
            defense: 2,
            range: 1,
            speed: 2,
            specialMove: {
                name: "Consume",
                description: "Heals for 100% of damage dealt when killing an enemy",
                chance: 1.00,
                effect: "consume"
            }
        },
        queenBrood: {
            name: "Queen Brood",
            symbol: "Q",
            cost: 200,
            hp: 35,
            attack: 6,
            defense: 3,
            range: 2,
            speed: 1,
            specialMove: {
                name: "Spawn Pool",
                description: "Creates a Larvae every 3 turns",
                chance: 1.00,
                effect: "spawnPool"
            }
        },
        hiveNode: {
            name: "Hive Node",
            symbol: "H",
            cost: 120,
            hp: 30,
            attack: 0,
            defense: 4,
            range: 0,
            speed: 0,
            specialMove: {
                name: "Nest",
                description: "Creates a Larvae every 2 turns until destroyed",
                chance: 1.00,
                effect: "nest"
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