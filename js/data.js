const APP_VERSION = "0.1.0-web";

const VARIANTS = [
    { id:"normal", label:"Normal", prefix:"" },
    { id:"gold", label:"Gold", prefix:"gold-" },
    { id:"gummy", label:"Gummy", prefix:"gummy-" },
    { id:"galaxy", label:"Galaxy", prefix:"galaxy-" },
    { id:"holofoil", label:"Holofoil", prefix:"holofoil-" },
    { id:"cube", label:"Cube", prefix:"cube-" },
    { id:"gem", label:"Gem", prefix:"gem-" },
    { id:"quack", label:"Quack", prefix:"quack-" }
];

const LEGACY_FAMILIES = [
    { name:"John Wick", rarity:"Mythic", ability:"Knocking players reveals others nearby. Mark duration increases with each Level Up.", variants:["normal"] },
    { name:"Batman", rarity:"Mythic", ability:"Grants the ability to launch in the air and deploy the Bat Cape.", variants:["normal","gold","gummy","galaxy","holofoil","cube"] },
    { name:"Water", rarity:"Rare", ability:"Replenish shields while standing in water. Shield restored per tick increases with each Level Up.", variants:["normal","gold","gummy","galaxy","holofoil","gem","quack"] },
    { name:"Earth", rarity:"Rare", ability:"Chance to find additional rare items when opening chests. Chance increases with each Level Up.", variants:["normal","gold","gummy","galaxy","gem","cube","quack"] },
    { name:"Fire", rarity:"Rare", ability:"Creates a fiery burst after dealing enough damage to an enemy. Required damage decreases with each Level Up.", variants:["normal","gold","gummy","galaxy","holofoil","cube","quack"] },
    { name:"Duck", rarity:"Epic", ability:"Emoting or Jamming replenishes shields. Shield restored per tick increases with each Level Up.", variants:["normal","gold","gummy","galaxy","holofoil","gem"] },
    { name:"Ghost", rarity:"Epic", ability:"Grants cloak for a duration upon reloading. Cloak duration increases with each Level Up.", variants:["normal","gold","gummy","galaxy","holofoil"] },
    { name:"Dream", rarity:"Legendary", ability:"Grants a random item at each level, exploding with legendary loot at Max Level. Loot value increases with each Level Up.", variants:["normal","gold","gummy","galaxy","cube"] },
    { name:"Demon", rarity:"Epic", ability:"Siphon health and shields when you eliminate an opponent. Healing increases with each Level Up.", variants:["normal","gold","gummy","galaxy","gem"] },
    { name:"Punk", rarity:"Legendary", ability:"Possibly nothing... or infinitely something.", variants:["normal","gold","gummy","galaxy","gem","cube"] },
    { name:"King", rarity:"Epic", ability:"Your Pickaxe deals more damage. Bonus damage increases with each Level Up.", variants:["normal","gold","gummy","galaxy","holofoil"] },
    { name:"Burnt Peanut", rarity:"Mythic", ability:"Eliminating players may drop more loot, sometimes mythic. Drop chance increases with each Level Up.", variants:["normal"] },
    { name:"Vini Jr", rarity:"Mythic", ability:"Sprinting makes your slide destructive. Slidekicking enemies increases rate of fire and reload speed.", variants:["normal"] },
    { name:"Zero Point", rarity:"Mythic", ability:"Spawn a Shield Bubble Jr. when using a healing item on yourself. Bubble duration increases with each Level Up.", variants:["normal","gold","gummy","galaxy","holofoil","cube","gem","quack"] },
    { name:"Fishy", rarity:"Rare", ability:"Swim speed is greatly increased. Taking damage briefly increases movement speed. Bonuses increase with each Level Up.", variants:["normal","gold","gummy","galaxy","cube"] },
    { name:"Striker", rarity:"Epic", ability:"Gain Overdrive when you Mantle, Hurdle, or Wall Scramble. Duration increases with each Level Up.", variants:["normal","gold","gummy","galaxy","holofoil"] },
    { name:"Aura", rarity:"Epic", ability:"Gain a Shock Rock charge after dealing enough damage to enemies. Required damage decreases with each Level Up.", variants:["normal","gold","gummy","galaxy","gem"] },
    { name:"Boss", rarity:"Legendary", ability:"Grants an increase to your max HP and Shield. Bonus increases with each Level Up.", variants:["normal","gold","gummy","galaxy","cube"] },
    { name:"Grim", rarity:"Mythic", ability:"Players who attack you are marked for a duration. Mark duration increases with each Level Up.", variants:["normal","gold","gummy","galaxy","holofoil","gem","cube"] },
    { name:"Air", rarity:"Rare", ability:"Increases sprinting speed and jump height, and nullifies fall damage. Jump height increases with each Level Up.", variants:["normal","gold","gummy","galaxy","holofoil"] },
    { name:"Seven", rarity:"Legendary", ability:"Enemy player foot trails are visible to your Squad. Trail duration increases with each Level Up.", variants:["normal","gold","gummy","galaxy","holofoil"] },
    { name:"Pollo", rarity:"Mythic", ability:"Eliminations slowly replenish shield for you and nearby squad members. Duration increases with each Level Up.", variants:["normal"] },
    { name:"Llama", rarity:"Mythic", ability:"Opening ammo boxes has a chance to grant a weapon upgrade. Chance increases with each Level Up.", variants:["normal","gold","gummy","galaxy","gem"] },
    { name:"Peely", rarity:"Mythic", ability:"Pings players with rare sprites nearby, but marks you on the map. Detection radius increases with each Level Up.", variants:["normal","gold","gummy","galaxy","holofoil"] },
    { name:"Ironmouse", rarity:"Mythic", ability:"Regenerate health over time when low. While regenerating, gain Cloak and low gravity.", variants:["normal"] }
];

const OVERRIDE_VARIANTS = [
    { id:"base", label:"Base" },
    { id:"gold", label:"Gold", prefix:"gold-" },
    { id:"cheatmaster", label:"Cheat Master", prefix:"cheatmaster-" }
];

const OVERRIDE_FAMILIES = [
    { name:"Jackrabbit", rarity:"Legendary", ability:"Grants the ability to perform another jump while mid-air. Cooldown between jumps decreases with each Level Up.", variants:["base","gold","cheatmaster"] },
    { name:"Shadow", rarity:"Epic", ability:"Automatically reloads unequipped weapons over time, and reloads the equipped weapon at max level.", variants:["base","gold","cheatmaster"] },
    { name:"Bush", rarity:"Rare", ability:"Grants a bush after a duration, and grants a bush on elimination at max level. Activation time decreases with each Level Up.", variants:["base","gold","cheatmaster"] },
    { name:"Tails", rarity:"Epic", ability:"Grants the ability to hover with the help of Tails. Hover speed increases with each Level Up.", variants:["base","gold","cheatmaster"] },
    { name:"Killswitch", rarity:"Epic", ability:"Enter Hangtime with improved accuracy when aiming while jumping and falling. Accuracy increases with each Level Up.", variants:["base","gold","cheatmaster"] },
    { name:"Adventure", rarity:"Rare", ability:"Upgrades a random item in the player's inventory with each Level Up.", variants:["base","gold","cheatmaster"] },
    { name:"Klombo", rarity:"Mythic", ability:"Grants random items at each level, only levels up by consuming items. Item quality increases with each Level Up.", variants:["base","gold","cheatmaster"] },
    { name:"Jonesy", rarity:"Rare", ability:"Recover health or shields after being damaged, after a short duration. Amount healed increases with each Level Up.", variants:["base","gold","cheatmaster"] },
    { name:"Sonic", rarity:"Epic", ability:"Gotta Go Fast! Sprint faster with each Level Up.", variants:["base","gold","cheatmaster"] },
    { name:"Crown", rarity:"Mythic", ability:"Only levels up by winning matches. Levels up faster with Crown Wins. New variants unlock after mastering.", variants:["base","gold","cheatmaster"] },
    { name:"8-Bit", rarity:"Rare", ability:"Find an 8-Bit Shotgun in your first chest and gain a score multiplier for it.", variants:["base","gold","cheatmaster"] },
    { name:"Storm Scout", rarity:"Rare", ability:"Applies Overdrive after taking storm damage and reveals future Storm Circles at max level.", variants:["base","gold","cheatmaster"] }
];

function slug(text){
    return text.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
}

function buildLegacySprites(){
    return LEGACY_FAMILIES.flatMap(family=>
        VARIANTS.map(variant=>{
            const available = family.variants.includes(variant.id);
            return {
                id:`legacy-${slug(family.name)}-${variant.id}`,
                family:family.name,
                variantId:variant.id,
                variant:variant.label,
                ability:family.ability,
                rarity:available && variant.id === "normal" ? family.rarity : available ? "Special" : "N/A",
                available,
                image:available
                    ? `sprites/S3/${variant.prefix}${slug(family.name)}-sprite.webp`
                    : `sprites/S3/blank-${slug(family.name)}-sprite.webp`
            };
        })
    );
}

function buildOverrideSprites(){
    return OVERRIDE_FAMILIES.flatMap(family=>
        OVERRIDE_VARIANTS.map(variant=>{
            const available = family.variants.includes(variant.id);
            return {
                id:`override-${slug(family.name)}-${variant.id}`,
                family:family.name,
                variantId:variant.id,
                variant:variant.label,
                ability:family.ability,
                rarity:available && variant.id === "base" ? family.rarity : available ? "Special" : "N/A",
                available,
                image:available
                    ? `sprites/S4/${variant.prefix ?? ""}${slug(family.name)}-sprite.webp`
                    : ""
            };
        })
    );
}

const SEASONS = [
    {
        id:"override",
        label:"Override",
        chapter:"Chapter 7",
        season:"Season 4",
        title:"Override",
        kind:"current",
        summary:"Chapter 7 Season 4: Override's new generation of retro gaming-inspired Sprites, separated from the archived Runners collection.",
        variants:OVERRIDE_VARIANTS,
        families:OVERRIDE_FAMILIES,
        sprites:buildOverrideSprites()
    },
    {
        id:"runners-archive",
        label:"Runners Archive",
        chapter:"Chapter 7",
        season:"Season 3",
        title:"Runners Archive",
        kind:"archive",
        summary:"Archived previous-generation Sprite collection, preserved separately so older progress can survive the new season.",
        variants:VARIANTS,
        families:LEGACY_FAMILIES,
        sprites:buildLegacySprites()
    }
];
