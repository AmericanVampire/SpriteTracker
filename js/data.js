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
    { id:"power", label:"Power" },
    { id:"glitch", label:"Glitch" },
    { id:"master", label:"Master" }
];

const OVERRIDE_FAMILIES = [
    {
        name:"8-Bit Sprite",
        rarity:"Rare",
        variants:["base","power","glitch","master"],
        status:"scouting",
        accent:"#00e7ff"
    },
    {
        name:"Bullet Sprite",
        rarity:"Epic",
        variants:["base"],
        status:"announced",
        accent:"#ffef5a"
    },
    {
        name:"Dumpster Dive Sprite",
        rarity:"Rare",
        variants:["base"],
        status:"announced",
        accent:"#6dff72"
    },
    {
        name:"Honey Sprite",
        rarity:"Epic",
        variants:["base"],
        status:"announced",
        accent:"#ffb62d"
    },
    {
        name:"Pond Sprite",
        rarity:"Rare",
        variants:["base"],
        status:"announced",
        accent:"#50d7ff"
    },
    {
        name:"X-Ray Sprite",
        rarity:"Legendary",
        variants:["base"],
        status:"announced",
        accent:"#f64cff"
    }
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
                    ? `sprites/${variant.prefix}${slug(family.name)}-sprite.webp`
                    : `sprites/blank-${slug(family.name)}-sprite.webp`
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
                status:family.status,
                accent:family.accent
            };
        })
    );
}

const SEASONS = [
    {
        id:"override",
        label:"Override",
        title:"Override",
        kind:"current",
        summary:"Current-season workspace inspired by Chapter 7 Season 4's glitchy gaming-icon theme. Placeholder rows are ready for confirmed launch and mid-season Sprite data.",
        variants:OVERRIDE_VARIANTS,
        families:OVERRIDE_FAMILIES,
        sprites:buildOverrideSprites()
    },
    {
        id:"runners-archive",
        label:"Runners Archive",
        title:"Runners Archive",
        kind:"archive",
        summary:"Archived previous-generation Sprite collection, preserved separately so older progress can survive the new season.",
        variants:VARIANTS,
        families:LEGACY_FAMILIES,
        sprites:buildLegacySprites()
    }
];
