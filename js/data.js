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
    { name:"John Wick", rarity:"Mythic", variants:["normal"] },
    { name:"Batman", rarity:"Mythic", variants:["normal","gold","gummy","galaxy","holofoil","cube"] },
    { name:"Water", rarity:"Rare", variants:["normal","gold","gummy","galaxy","holofoil","gem","quack"] },
    { name:"Earth", rarity:"Rare", variants:["normal","gold","gummy","galaxy","gem","cube","quack"] },
    { name:"Fire", rarity:"Rare", variants:["normal","gold","gummy","galaxy","holofoil","cube","quack"] },
    { name:"Duck", rarity:"Epic", variants:["normal","gold","gummy","galaxy","holofoil","gem"] },
    { name:"Ghost", rarity:"Epic", variants:["normal","gold","gummy","galaxy","holofoil"] },
    { name:"Dream", rarity:"Legendary", variants:["normal","gold","gummy","galaxy","cube"] },
    { name:"Demon", rarity:"Epic", variants:["normal","gold","gummy","galaxy","gem"] },
    { name:"Punk", rarity:"Legendary", variants:["normal","gold","gummy","galaxy","gem","cube"] },
    { name:"King", rarity:"Epic", variants:["normal","gold","gummy","galaxy","holofoil"] },
    { name:"Burnt Peanut", rarity:"Mythic", variants:["normal"] },
    { name:"Vini Jr", rarity:"Mythic", variants:["normal"] },
    { name:"Zero Point", rarity:"Mythic", variants:["normal","gold","gummy","galaxy","holofoil","cube","gem","quack"] },
    { name:"Fishy", rarity:"Rare", variants:["normal","gold","gummy","galaxy","cube"] },
    { name:"Striker", rarity:"Epic", variants:["normal","gold","gummy","galaxy","holofoil"] },
    { name:"Aura", rarity:"Epic", variants:["normal","gold","gummy","galaxy","gem"] },
    { name:"Boss", rarity:"Legendary", variants:["normal","gold","gummy","galaxy","cube"] },
    { name:"Grim", rarity:"Mythic", variants:["normal","gold","gummy","galaxy","holofoil","gem","cube"] },
    { name:"Air", rarity:"Rare", variants:["normal","gold","gummy","galaxy","holofoil"] },
    { name:"Seven", rarity:"Legendary", variants:["normal","gold","gummy","galaxy","holofoil"] },
    { name:"Pollo", rarity:"Mythic", variants:["normal"] },
    { name:"Llama", rarity:"Mythic", variants:["normal","gold","gummy","galaxy","gem"] },
    { name:"Peely", rarity:"Mythic", variants:["normal","gold","gummy","galaxy","holofoil"] },
    { name:"Ironmouse", rarity:"Mythic", variants:["normal"] }
];

const OVERRIDE_VARIANTS = [
    { id:"base", label:"Base" },
    { id:"gold", label:"Gold", prefix:"gold-" },
    { id:"cheatmaster", label:"Cheat Master", prefix:"cheatmaster-" }
];

const OVERRIDE_FAMILIES = [
    { name:"Jackrabbit", rarity:"Legendary", variants:["base","gold","cheatmaster"] },
    { name:"Shadow", rarity:"Epic", variants:["base","gold","cheatmaster"] },
    { name:"Bush", rarity:"Rare", variants:["base","gold","cheatmaster"] },
    { name:"Tails", rarity:"Epic", variants:["base","gold","cheatmaster"] },
    { name:"Killswitch", rarity:"Epic", variants:["base","gold","cheatmaster"] },
    { name:"Adventure", rarity:"Rare", variants:["base","gold","cheatmaster"] },
    { name:"Klombo", rarity:"Mythic", variants:["base","gold","cheatmaster"] },
    { name:"Jonesy", rarity:"Rare", variants:["base","gold","cheatmaster"] },
    { name:"Sonic", rarity:"Epic", variants:["base","gold","cheatmaster"] },
    { name:"Crown", rarity:"Mythic", variants:["base","gold","cheatmaster"] },
    { name:"8-Bit", rarity:"Rare", variants:["base","gold","cheatmaster"] },
    { name:"Storm Scout", rarity:"Rare", variants:["base","gold","cheatmaster"] }
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
