const state = {
    profile:null,
    seasonId:"override",
    loading:true
};
let suppressNextAbilityCloseClick = false;

const PAYPAL_DONATE_URL = "https://www.paypal.com/ncp/payment/YFKSSWL424586";
const DISCORD_INVITE_URL = "https://discord.com/invite/yBG6A6bf4W";
const MICROSOFT_STORE_URL = "https://apps.microsoft.com/detail/9pc2c5hx0tdk";
const APP_NOTICE_STORAGE_KEY = "sprite-tracker-app-notice-v1";

const els = {
    topBar:document.querySelector(".topBar"),
    noticeButton:document.getElementById("noticeButton"),
    donateButton:document.getElementById("donateButton"),
    discordButton:document.getElementById("discordButton"),
    footerInfoButton:document.getElementById("footerInfoButton"),
    footerLicenseButton:document.getElementById("footerLicenseButton"),
    currentProfileName:document.getElementById("currentProfileName"),
    foundStat:document.getElementById("foundStat"),
    masteredStat:document.getElementById("masteredStat"),
    setsStat:document.getElementById("setsStat"),
    overallStat:document.getElementById("overallStat"),
    timerValue:document.getElementById("timerValue"),
    timerDate:document.getElementById("timerDate"),
    hackCodesPanel:document.getElementById("hackCodesPanel"),
    trackerDeck:document.querySelector(".trackerDeck"),
    gridHeader:document.getElementById("gridHeader"),
    trackerGrid:document.getElementById("trackerGrid"),
    noProfileNotice:document.querySelector(".noProfileNotice"),
    dialog:document.getElementById("dialog"),
    dialogTitle:document.getElementById("dialogTitle"),
    dialogContent:document.getElementById("dialogContent"),
    dialogActions:document.getElementById("dialogActions"),
    abilityPreview:document.getElementById("abilityPreview"),
    importFileInput:document.getElementById("importFileInput")
};

function activeSeason(){
    return SEASONS.find(season=>season.id === state.seasonId) || SEASONS[0];
}

function seasonProgress(profile,seasonId){
    profile.seasons[seasonId] = profile.seasons[seasonId] || {
        sprites:{},
        disabledSprites:{},
        disabledFamilies:{},
        disabledVariants:{}
    };
    return profile.seasons[seasonId];
}

function emptySeasonProgress(){
    return {
        sprites:{},
        disabledSprites:{},
        disabledFamilies:{},
        disabledVariants:{}
    };
}

function lobbyHacks(profile){
    profile.lobbyHacks = profile.lobbyHacks || {};
    return profile.lobbyHacks;
}

function profileLoaded(){
    return Boolean(state.profile);
}

function seasonPickerLabel(season){
    return season.season.toUpperCase();
}

function seasonPickerChapter(season){
    return (season.chapter || "").toUpperCase();
}

function variantType(variant){
    return variant.id === "normal" ? "base" : variant.id;
}

function rarityClass(rarity){
    return slug(rarity || "n-a");
}

function spriteState(sprite){
    if(!profileLoaded()){
        return "not-found";
    }
    return seasonProgress(state.profile,state.seasonId).sprites[sprite.id] || "not-found";
}

function isDisabled(sprite){
    if(!profileLoaded()){
        return false;
    }
    const progress = seasonProgress(state.profile,state.seasonId);
    return progress.disabledSprites[sprite.id] === true ||
        progress.disabledFamilies[slug(sprite.family)] === true ||
        progress.disabledVariants[sprite.variantId] === true;
}

function isFamilyOrVariantDisabled(sprite){
    if(!profileLoaded()){
        return false;
    }
    const progress = seasonProgress(state.profile,state.seasonId);
    return progress.disabledFamilies[slug(sprite.family)] === true ||
        progress.disabledVariants[sprite.variantId] === true;
}

async function persist(){
    if(!state.profile){
        return;
    }
    state.profile.activeSeasonId = state.seasonId;
    state.profile = await SpriteStore.saveProfile(state.profile);
    await SpriteStore.setStartupProfile(state.profile.profileName);
}

function setSpriteState(sprite,nextState){
    const progress = seasonProgress(state.profile,state.seasonId);
    progress.sprites[sprite.id] = nextState;
}

function nextSpriteState(current){
    if(current === "not-found"){
        return "found";
    }
    if(current === "found"){
        return "mastered";
    }
    return "not-found";
}

function cycleMobileSpriteState(sprite){
    const progress = seasonProgress(state.profile,state.seasonId);
    if(isFamilyOrVariantDisabled(sprite)){
        return;
    }
    if(progress.disabledSprites[sprite.id] === true){
        delete progress.disabledSprites[sprite.id];
        progress.sprites[sprite.id] = "not-found";
        return;
    }
    const current = spriteState(sprite);
    if(current === "not-found"){
        progress.sprites[sprite.id] = "found";
        return;
    }
    if(current === "found"){
        progress.sprites[sprite.id] = "mastered";
        return;
    }
    progress.sprites[sprite.id] = "not-found";
    progress.disabledSprites[sprite.id] = true;
}

function calculateStats(){
    const season = activeSeason();
    const progress = state.profile
        ? seasonProgress(state.profile,state.seasonId)
        : {sprites:{},disabledSprites:{},disabledFamilies:{},disabledVariants:{}};
    const activeSprites = season.sprites.filter(sprite=>
        sprite.available &&
        progress.disabledSprites[sprite.id] !== true &&
        progress.disabledFamilies[slug(sprite.family)] !== true &&
        progress.disabledVariants[sprite.variantId] !== true
    );
    let found = 0;
    let mastered = 0;
    activeSprites.forEach(sprite=>{
        const current = progress.sprites[sprite.id];
        if(current === "found"){
            found++;
        }
        if(current === "mastered"){
            found++;
            mastered++;
        }
    });
    const activeFamilies = season.families.filter(family=>
        activeSprites.some(sprite=>sprite.family === family.name)
    );
    const completedSets = activeFamilies.filter(family=>{
        const familySprites = activeSprites.filter(sprite=>sprite.family === family.name);
        return familySprites.length > 0 &&
            familySprites.every(sprite=>progress.sprites[sprite.id] === "mastered");
    }).length;
    const totalPossible = (activeSprites.length * 2) + activeFamilies.length;
    const currentProgress = found + mastered + completedSets;
    return {
        found,
        mastered,
        completedSets,
        totalSprites:activeSprites.length,
        totalSets:activeFamilies.length,
        percent:totalPossible ? Math.round((currentProgress / totalPossible) * 100) : 0
    };
}

function renderStats(){
    if(state.loading){
        els.foundStat.textContent = "- / -";
        els.masteredStat.textContent = "- / -";
        els.setsStat.textContent = "- / -";
        els.overallStat.textContent = "-";
        return;
    }
    const stats = calculateStats();
    els.foundStat.textContent = `${stats.found} / ${stats.totalSprites}`;
    els.masteredStat.textContent = `${stats.mastered} / ${stats.totalSprites}`;
    els.setsStat.textContent = `${stats.completedSets} / ${stats.totalSets}`;
    els.overallStat.textContent = `${stats.percent}%`;
}

function renderProfile(){
    els.currentProfileName.textContent = state.loading
        ? "Loading profile..."
        : state.profile?.profileName || "No profile loaded";
}

function easternDateParts(date){
    return new Intl.DateTimeFormat("en-US",{
        timeZone:"America/New_York",
        year:"numeric",
        month:"2-digit",
        day:"2-digit",
        weekday:"short",
        hour:"2-digit",
        minute:"2-digit",
        second:"2-digit",
        hour12:false
    }).formatToParts(date).reduce((parts,part)=>{
        if(part.type !== "literal"){
            parts[part.type] =
                part.type === "weekday"
                    ? part.value
                    : Number(part.value);
        }
        return parts;
    },{});
}

function nextEasternResetDate(now = new Date()){
    const easternParts = easternDateParts(now);
    const easternDate = new Date(Date.UTC(
        easternParts.year,
        easternParts.month - 1,
        easternParts.day,
        SPRITE_DROP_TIMER.resetHourEt,
        0,
        0
    ));
    const currentEastern = new Date(Date.UTC(
        easternParts.year,
        easternParts.month - 1,
        easternParts.day,
        easternParts.hour,
        easternParts.minute,
        easternParts.second
    ));
    if(currentEastern >= easternDate){
        easternDate.setUTCDate(easternDate.getUTCDate() + 1);
    }
    const easternOffset = getTimeZoneOffsetMinutes(easternDate,"America/New_York");
    return new Date(easternDate.getTime() - easternOffset * 60000);
}

function nextWeeklyEasternDate({
    weekdayEt = 4,
    hourEt = 9,
    minuteEt = 0
} = {},now = new Date()){
    const easternParts = easternDateParts(now);
    const currentEastern = new Date(Date.UTC(
        easternParts.year,
        easternParts.month - 1,
        easternParts.day,
        easternParts.hour,
        easternParts.minute,
        easternParts.second
    ));
    const currentWeekday = currentEastern.getUTCDay();
    const targetEastern = new Date(Date.UTC(
        easternParts.year,
        easternParts.month - 1,
        easternParts.day,
        hourEt,
        minuteEt,
        0
    ));
    let daysUntil = (weekdayEt - currentWeekday + 7) % 7;
    if(daysUntil === 0 && currentEastern >= targetEastern){
        daysUntil = 7;
    }
    targetEastern.setUTCDate(targetEastern.getUTCDate() + daysUntil);
    const easternOffset = getTimeZoneOffsetMinutes(targetEastern,"America/New_York");
    return new Date(targetEastern.getTime() - easternOffset * 60000);
}

function getTimeZoneOffsetMinutes(date,timeZone){
    const parts = new Intl.DateTimeFormat("en-US",{
        timeZone,
        year:"numeric",
        month:"2-digit",
        day:"2-digit",
        hour:"2-digit",
        minute:"2-digit",
        second:"2-digit",
        hour12:false
    }).formatToParts(date).reduce((acc,part)=>{
        if(part.type !== "literal"){
            acc[part.type] = Number(part.value);
        }
        return acc;
    },{});
    const utcAsZone = Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour,
        parts.minute,
        parts.second
    );
    return (utcAsZone - date.getTime()) / 60000;
}

function dropTimerTarget(){
    if(!SPRITE_DROP_TIMER?.enabled){
        return null;
    }
    if(SPRITE_DROP_TIMER.target){
        return new Date(SPRITE_DROP_TIMER.target);
    }
    if(SPRITE_DROP_TIMER.cadence === "weekly"){
        return nextWeeklyEasternDate({
            weekdayEt:SPRITE_DROP_TIMER.weekdayEt,
            hourEt:SPRITE_DROP_TIMER.hourEt,
            minuteEt:SPRITE_DROP_TIMER.minuteEt
        });
    }
    if(SPRITE_DROP_TIMER.cadence === "daily-reset"){
        return nextEasternResetDate();
    }
    return null;
}

function formatCountdown(target){
    if(!target || Number.isNaN(target.getTime())){
        return "--:--:--";
    }
    const remaining = Math.max(0,target.getTime() - Date.now());
    const totalSeconds = Math.floor(remaining / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = value=>String(value).padStart(2,"0");
    return days > 0
        ? `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
        : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function formatEventDate(date){
    return new Intl.DateTimeFormat("en-US",{
        weekday:"long",
        month:"long",
        day:"numeric",
        hour:"numeric",
        minute:"2-digit"
    }).format(date);
}

function renderDropTimer(){
    if(!els.timerValue){
        return;
    }
    const target = dropTimerTarget();
    if(!target || Number.isNaN(target.getTime())){
        els.timerValue.textContent = "--:--:--";
        if(els.timerDate){
            els.timerDate.textContent = "Schedule unavailable";
        }
        return;
    }
    els.timerValue.textContent = formatCountdown(target);
    if(els.timerDate){
        els.timerDate.textContent = formatEventDate(target);
    }
}

function hackUsedIcon(){
    return `
        <span class="hackCheck" aria-hidden="true">
            <svg class="foundIcon" viewBox="0 0 24 24">
                <path d="M5 13.5L10 18L19 7" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        </span>
    `;
}

function copyIcon(){
    return `
        <svg class="copyIcon" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="8" y="8" width="10" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2"></rect>
            <path d="M6 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
        </svg>
    `;
}

async function copyText(text){
    if(navigator.clipboard?.writeText){
        await navigator.clipboard.writeText(text);
        return;
    }
    const input = document.createElement("textarea");
    input.value = text;
    input.setAttribute("readonly","");
    input.style.position = "fixed";
    input.style.left = "-9999px";
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    input.remove();
}

function renderLobbyHacks(){
    if(!els.hackCodesPanel){
        return;
    }
    const used = state.profile ? lobbyHacks(state.profile) : {};
    const totalCodes = (LOBBY_HACK_GROUPS || []).reduce((total,group)=>total + group.items.length,0);
    els.hackCodesPanel.innerHTML = `
        <p class="hackIntro">Keep track of your used codes.</p>
        <p class="hackTotal">TOTAL CODES: ${totalCodes}</p>
        ${(LOBBY_HACK_GROUPS || []).map(group=>`
            <section class="hackGroup">
                <h3>${escapeHtml(group.name)}</h3>
                ${group.items.map(item=>{
                    const isUsed = used[item.code] === true;
                    return `
                        <article class="hackItem" data-used="${isUsed}" data-disabled="${!profileLoaded()}">
                            <button class="hackUseButton" type="button" data-code="${escapeHtml(item.code)}" ${profileLoaded() ? "" : "disabled"} title="${isUsed ? "Mark unused" : "Mark used"}">
                                ${hackUsedIcon()}
                                <span class="hackText">
                                    <strong>${escapeHtml(item.code)}</strong>
                                    <small>${escapeHtml(item.reward)}</small>
                                </span>
                            </button>
                            <button class="hackCopyButton" type="button" data-copy-code="${escapeHtml(item.code)}" title="Copy code" aria-label="Copy code ${escapeHtml(item.code)}">
                                ${copyIcon()}
                                <span>Copy code</span>
                            </button>
                        </article>
                    `;
                }).join("")}
            </section>
        `).join("")}
    `;
    els.hackCodesPanel.querySelectorAll(".hackUseButton").forEach(button=>{
        button.addEventListener("click",async()=>{
            if(!profileLoaded()){
                return;
            }
            const usedCodes = lobbyHacks(state.profile);
            usedCodes[button.dataset.code] = usedCodes[button.dataset.code] !== true;
            await persist();
            renderLobbyHacks();
        });
    });
    els.hackCodesPanel.querySelectorAll(".hackCopyButton").forEach(button=>{
        button.addEventListener("click",async event=>{
            event.stopPropagation();
            await copyText(button.dataset.copyCode);
            button.dataset.copied = "true";
            setTimeout(()=>delete button.dataset.copied,1100);
        });
    });
}

function renderTracker(){
    const season = activeSeason();
    els.trackerGrid.innerHTML = "";
    els.gridHeader.innerHTML = "";
    els.trackerDeck.dataset.loading = String(state.loading);
    if(els.noProfileNotice){
        els.noProfileNotice.querySelector("strong").textContent = state.loading
            ? "Loading your profile..."
            : "Please name your profile to begin tracking.";
        els.noProfileNotice.querySelector("span").textContent = state.loading
            ? "Sprite Tracker is opening your saved progress."
            : "Use Menu to create, open, or import a profile.";
    }
    els.trackerGrid.style.setProperty(
        "--variant-count",
        season.variants.length
    );
    els.gridHeader.style.setProperty(
        "--variant-count",
        season.variants.length
    );
    els.trackerDeck.dataset.variantCount = String(season.variants.length);
    els.trackerDeck.dataset.profileLoaded = String(profileLoaded());
    if(state.loading){
        return;
    }
    const progress = profileLoaded()
        ? seasonProgress(state.profile,state.seasonId)
        : emptySeasonProgress();
    els.gridHeader.innerHTML = `
        <div class="seasonPickerCell">
            <details class="seasonMenu">
                <summary>
                    <span class="seasonSummaryLabel">
                        <small>${seasonPickerChapter(season)}</small>
                        <b>${seasonPickerLabel(season)}</b>
                    </span>
                </summary>
                <div class="seasonMenuPanel">
                    ${SEASONS.map(item=>`
                        <button type="button" data-season="${item.id}" data-active="${item.id === state.seasonId}">
                            ${seasonPickerLabel(item)}
                        </button>
                    `).join("")}
                </div>
            </details>
        </div>
        ${season.variants.map(variant=>
        `<button class="variantToggle" data-variant="${variant.id}" data-variant-type="${variantType(variant)}" data-disabled="${progress.disabledVariants[variant.id] === true}">
            <span>${variant.label}</span>
            <small>${progress.disabledVariants[variant.id] === true ? "DISABLED" : "ENABLED"}</small>
        </button>`
    ).join("")}`;
    els.gridHeader.querySelectorAll("[data-season]").forEach(button=>{
        button.addEventListener("click",async()=>{
            state.seasonId = button.dataset.season;
            if(state.profile){
                state.profile.activeSeasonId = state.seasonId;
                await persist();
            }
            render();
        });
    });
    els.gridHeader.querySelectorAll(".variantToggle").forEach(button=>{
        button.addEventListener("click",async()=>{
            if(!profileLoaded()){
                return;
            }
            const id = button.dataset.variant;
            progress.disabledVariants[id] = progress.disabledVariants[id] !== true;
            await persist();
            render();
        });
    });

    season.families.forEach(family=>{
        const row = document.createElement("div");
        row.className = "spriteRow";
        const familyDisabled = progress.disabledFamilies[slug(family.name)] === true;
        const familyComplete = isFamilyComplete(family);
        const abilitySprite = season.sprites.find(sprite=>
            sprite.family === family.name && sprite.available
        );
        row.innerHTML = `
            <div class="familyCell" data-disabled="${familyDisabled}" data-complete="${familyComplete}">
                <button class="familyMain" type="button">
                    <span class="familyName">${family.name}</span>
                    <span class="familyMastered">SET COMPLETE</span>
                    <span class="familyStatus">${familyDisabled ? "DISABLED" : "ENABLED"}</span>
                </button>
                ${abilityButton(family,abilitySprite)}
            </div>
        `;
        const familyButton = row.querySelector(".familyMain");
        familyButton.addEventListener("click",async()=>{
            if(!profileLoaded()){
                return;
            }
            progress.disabledFamilies[slug(family.name)] = !familyDisabled;
            await persist();
            render();
        });

        season.variants.forEach(variant=>{
            const sprite = season.sprites.find(item=>
                item.family === family.name && item.variantId === variant.id
            );
            row.appendChild(createSpriteCard(sprite,family));
        });
        els.trackerGrid.appendChild(row);
    });
}

function createSpriteCard(sprite,family){
    const button = document.createElement("button");
    if(!sprite.available){
        button.type = "button";
        button.className = "spriteCard spriteCardEmpty";
        button.dataset.state = "unavailable";
        button.dataset.available = "false";
        button.dataset.variantType = variantType({id:sprite.variantId,label:sprite.variant});
        button.title = "Not available in this generation.";
        button.innerHTML = sprite.image
            ? `${spriteVariantName(sprite)}<img src="${sprite.image}" alt="${sprite.family} unavailable ${sprite.variant}">`
            : `${spriteVariantName(sprite)}<span class="pixelIcon" style="--accent:${family.accent || "#00e7ff"}"></span>`;
        button.disabled = true;
        return button;
    }
    const disabled = isDisabled(sprite);
    const current = spriteState(sprite);
    button.type = "button";
    button.className = "spriteCard";
    button.dataset.state = disabled ? "disabled" : current;
    button.dataset.available = String(sprite.available);
    button.dataset.variantType = variantType({id:sprite.variantId,label:sprite.variant});
    button.title = sprite.available
        ? "Left-click to cycle progress. Right-click to disable this sprite."
        : "Not available in this generation.";
    button.innerHTML = sprite.image
        ? `${spriteBadges()}${spriteVariantName(sprite)}<img src="${sprite.image}" alt="${sprite.family} ${sprite.variant}">${spriteRarity(sprite.rarity)}`
        : `${spriteBadges()}${spriteVariantName(sprite)}<span class="pixelIcon" style="--accent:${sprite.accent || family.accent || "#00e7ff"}"></span>${spriteRarity(sprite.rarity)}`;
    if(!sprite.available){
        button.disabled = true;
    }
    button.addEventListener("click",async()=>{
        if(!profileLoaded()){
            return;
        }
        if(mobileViewport()){
            cycleMobileSpriteState(sprite);
            await persist();
            render();
            return;
        }
        if(disabled){
            return;
        }
        setSpriteState(sprite,nextSpriteState(current));
        await persist();
        render();
    });
    button.addEventListener("contextmenu",async(event)=>{
        event.preventDefault();
        if(!profileLoaded() || !sprite.available){
            return;
        }
        const progress = seasonProgress(state.profile,state.seasonId);
        progress.disabledSprites[sprite.id] = progress.disabledSprites[sprite.id] !== true;
        await persist();
        render();
    });
    return button;
}

function abilityButton(family,sprite){
    if(!family.ability){
        return "";
    }
    return `
        <button class="abilityButton" type="button" data-family="${slug(family.name)}" aria-label="${family.name} ability" aria-haspopup="true">
            <span class="abilityIcon" aria-hidden="true">i</span>
        </button>
    `;
}

function escapeHtml(text){
    return String(text).replace(/[&<>"']/g,match=>({
        "&":"&amp;",
        "<":"&lt;",
        ">":"&gt;",
        '"':"&quot;",
        "'":"&#039;"
    }[match]));
}

function abilityDetails(familySlug){
    const season = activeSeason();
    const family = season.families.find(item=>slug(item.name) === familySlug);
    if(!family){
        return null;
    }
    const sprite = season.sprites.find(item=>
        item.family === family.name && item.available
    );
    return {
        name:family.name,
        ability:family.ability,
        rarity:sprite?.rarity || family.rarity || "",
        image:sprite?.image || ""
    };
}

function showAbilityPreview(familySlug){
    const details = abilityDetails(familySlug);
    if(!details){
        return;
    }
    els.abilityPreview.innerHTML = `
        ${details.image ? `<img src="${escapeHtml(details.image)}" alt="${escapeHtml(details.name)}">` : ""}
        <span class="abilityDataText">
            <strong>${escapeHtml(details.name)}</strong>
            ${details.rarity ? `<em class="abilityRarity ${rarityClass(details.rarity)}">${escapeHtml(details.rarity)}</em>` : ""}
            <span>${escapeHtml(details.ability)}</span>
        </span>
    `;
    els.abilityPreview.hidden = false;
}

function hideAbilityPreview(){
    els.abilityPreview.hidden = true;
}

function mobileAbilityPreviewOpen(){
    return mobileViewport() && !els.abilityPreview.hidden;
}

function mobileViewport(){
    return window.matchMedia("(max-width: 620px), (max-width: 980px) and (max-height: 620px) and (orientation: landscape) and (pointer: coarse)").matches;
}

function spriteVariantName(sprite){
    return `<span class="spriteVariantName">${sprite.variant}</span>`;
}

function spriteRarity(rarity){
    if(!rarity || rarity === "N/A"){
        return "";
    }
    return `<span class="spriteRarity ${rarityClass(rarity)}">${rarity}</span>`;
}

function spriteBadges(){
    return `
        <span class="spriteBadge" aria-hidden="true">
            <svg class="foundIcon" viewBox="0 0 24 24">
                <path d="M5 13.5L10 18L19 7" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        </span>
        <span class="masteredBadge" aria-hidden="true">
            <svg class="masteredIcon" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="0.32" xmlns="http://www.w3.org/2000/svg">
                <g stroke-linecap="round" stroke-linejoin="round" stroke="#000000" stroke-width="0.372">
                    <path d="M18.53 19.24H5.4C5.24283 19.2414 5.0893 19.1927 4.96164 19.101C4.83399 19.0094 4.73885 18.8794 4.69 18.73L1.5 9C1.45113 8.86009 1.446 8.70861 1.4853 8.56571C1.52459 8.42281 1.60646 8.29525 1.72 8.2C1.83214 8.10161 1.97141 8.03941 2.11953 8.02157C2.26764 8.00372 2.4177 8.03106 2.55 8.1L8.37 11L11.37 5.18C11.4392 5.06398 11.5373 4.9679 11.6547 4.90118C11.7722 4.83446 11.9049 4.79938 12.04 4.79938C12.1751 4.79938 12.3078 4.83446 12.4253 4.90118C12.5427 4.9679 12.6408 5.06398 12.71 5.18L15.71 11.01L21.54 8.11C21.6708 8.0419 21.8191 8.01501 21.9655 8.03286C22.1119 8.05071 22.2494 8.11247 22.36 8.21C22.4557 8.31491 22.5197 8.44486 22.5445 8.58471C22.5693 8.72456 22.5539 8.86858 22.5 9L19.24 18.72C19.1929 18.8713 19.0985 19.0034 18.9707 19.097C18.8429 19.1906 18.6884 19.2407 18.53 19.24ZM6 17.74H18L20.51 10.25L15.64 12.67C15.5528 12.7146 15.4576 12.7415 15.3599 12.749C15.2623 12.7566 15.1641 12.7446 15.071 12.7139C14.978 12.6832 14.892 12.6344 14.818 12.5702C14.744 12.506 14.6835 12.4278 14.64 12.34L12 7.16L9.37 12.34C9.32648 12.4278 9.26596 12.506 9.19197 12.5702C9.11798 12.6344 9.03197 12.6832 8.93895 12.7139C8.84593 12.7446 8.74774 12.7566 8.65007 12.749C8.5524 12.7415 8.45721 12.7146 8.37 12.67L3.48 10.22L6 17.74Z" fill="#000000"></path>
                </g>
            </svg>
        </span>
    `;
}

function isFamilyComplete(family){
    if(!profileLoaded()){
        return false;
    }
    const season = activeSeason();
    const progress = seasonProgress(state.profile,state.seasonId);
    const familySprites = season.sprites.filter(sprite=>
        sprite.family === family.name &&
        sprite.available &&
        !isDisabled(sprite)
    );
    return familySprites.length > 0 &&
        familySprites.every(sprite=>progress.sprites[sprite.id] === "mastered");
}

function render(){
    renderProfile();
    renderStats();
    renderTracker();
    renderDropTimer();
    renderLobbyHacks();
    updateStickyOffsets();
}

function updateStickyOffsets(){
    const topBarHeight = Math.round(els.topBar.getBoundingClientRect().height);
    document.documentElement.style.setProperty("--topbar-height", `${topBarHeight}px`);
}

function showDialog(title,content,actions){
    els.dialogTitle.textContent = title;
    els.dialogContent.innerHTML = "";
    els.dialogActions.innerHTML = "";
    if(typeof content === "string"){
        els.dialogContent.innerHTML = content;
    }
    else{
        els.dialogContent.appendChild(content);
    }
    actions.forEach(action=>{
        const button = document.createElement("button");
        button.type = action.type || "button";
        button.textContent = action.label;
        button.className = action.danger ? "danger" : "";
        button.addEventListener("click",async()=>{
            if(action.onClick){
                await action.onClick();
            }
            if(action.close !== false){
                els.dialog.close();
            }
        });
        els.dialogActions.appendChild(button);
    });
    els.dialog.showModal();
}

function promptDialog(title,label,defaultValue,onSubmit){
    const wrapper = document.createElement("label");
    wrapper.className = "field";
    wrapper.innerHTML = `<span>${label}</span><input id="dialogInput" maxlength="40" value="${defaultValue || ""}">`;
    showDialog(title,wrapper,[
        {label:"Cancel"},
        {
            label:"Save",
            onClick:async()=>{
                await onSubmit(wrapper.querySelector("input").value.trim());
            }
        }
    ]);
    setTimeout(()=>wrapper.querySelector("input").focus(),50);
}

function appNoticeHasBeenRead(){
    return localStorage.getItem(APP_NOTICE_STORAGE_KEY) === "read";
}

function updateNoticeButton(){
    if(!els.noticeButton){
        return;
    }
    els.noticeButton.dataset.unread = appNoticeHasBeenRead() ? "false" : "true";
}

function markAppNoticeRead(){
    localStorage.setItem(APP_NOTICE_STORAGE_KEY,"read");
    updateNoticeButton();
}

function showAppNotice(){
    markAppNoticeRead();
    showDialog("Notifications",`
        <div class="notificationsPanel">
            <article class="notificationCard">
                <div class="notificationIcon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                        <path d="M12 3.5c3.6 0 6.5 2.9 6.5 6.5v4.7l1.8 1.8v1.2H3.7v-1.2l1.8-1.8V10c0-3.6 2.9-6.5 6.5-6.5Z"></path>
                        <path d="M9.5 19.5a2.8 2.8 0 0 0 5 0"></path>
                    </svg>
                </div>
                <div class="notificationContent">
                    <span class="notificationMeta">Desktop App Available</span>
                    <strong>Sprite Tracker is also on Windows</strong>
                    <p>
                        Get Sprite Tracker from the Microsoft Store when you want
                        the same tracking style in a dedicated desktop app.
                    </p>
                    <p>
                        Profiles stay local on each device. To move progress,
                        export your profile here, open the app, and import that
                        profile there.
                    </p>
                    <button class="notificationAction" type="button" data-open-store>
                        Open Microsoft Store
                    </button>
                </div>
            </article>
        </div>
    `,[
        {label:"Close"}
    ]);
    els.dialog
        .querySelector("[data-open-store]")
        ?.addEventListener("click",()=>window.open(MICROSOFT_STORE_URL,"_blank","noopener"));
}

function showTrackerInfo(){
    showDialog("Sprite Tracker Info",`
        <div class="legalInfo trackerInfoPanel">
            <div class="legalIntro">
                <strong>Sprite Tracker</strong>
                <span>Developed by <b>AmericanVampire</b></span>
                <span>&copy; 2026 All Rights Reserved.</span>
            </div>
            <p>
                Sprite Tracker gives players a simple and intuitive way to
                organize, track, and monitor their Fortnite Sprite collection
                and overall collection progress.
            </p>
            <p>
                Fortnite&reg;, all related artwork, character and item names,
                logos, trademarks, and other intellectual property are owned by
                Epic Games, Inc. and are protected by applicable copyright and
                trademark laws.
            </p>
            <p>
                Sprite Tracker is not affiliated with, endorsed by, sponsored
                by, or approved by Epic Games, Inc.
            </p>
            <section class="howToUsePanel" aria-label="How to use Sprite Tracker">
                <h3>How to Use</h3>
                <div class="howToGrid">
                    <article>
                        <strong>Profiles</strong>
                        <p>Create, open, rename, import, export, or delete profiles from Menu. Progress saves automatically in this browser, so export a profile backup before clearing cookies, site data, or browser storage.</p>
                    </article>
                    <article>
                        <strong>Sprites</strong>
                        <p>Left-click a Sprite card to cycle between Not Found, Found, and Mastered.</p>
                    </article>
                    <article>
                        <strong>Disable One Sprite</strong>
                        <p>Right-click a Sprite card to disable or re-enable that specific Sprite. Disabled Sprites are ignored by progress totals.</p>
                    </article>
                    <article>
                        <strong>Rows and Variants</strong>
                        <p>Use the Sprite row button or variant column buttons to enable and disable full groups for each profile.</p>
                    </article>
                    <article>
                        <strong>Seasons</strong>
                        <p>Use the Season dropdown to switch between current and archived Sprite collections.</p>
                    </article>
                    <article>
                        <strong>Hack Codes</strong>
                        <p>Open Hack Codes to copy codes and mark which ones you have already used.</p>
                    </article>
                    <article>
                        <strong>Next Sprite Drop</strong>
                        <p>The drop timer counts down to the next Thursday Sprite release at 9:00 AM ET.</p>
                    </article>
                    <article>
                        <strong>Exports</strong>
                        <p>Export your profile as an image, text report, CSV spreadsheet, or internal profile backup.</p>
                    </article>
                </div>
            </section>
        </div>
    `,[{label:"Close"}]);
}

function showLicenseInfo(){
    showDialog("Copyright & Usage",`
        <div class="legalInfo legalScroll">
            <p>
                <strong>Sprite Tracker</strong><br>
                Developed by <b>AmericanVampire</b><br>
                Copyright &copy; 2026 AmericanVampire<br>
                <strong>All Rights Reserved.</strong>
            </p>
            <p>
                This website, including its original source code, design,
                graphics, layout, features, and other original content, is
                proprietary and protected by applicable copyright and
                intellectual property laws.
            </p>
            <p>
                You are granted a limited, non-exclusive, non-transferable
                license to access and use Sprite Tracker for personal,
                non-commercial purposes.
            </p>
            <p><strong>You may not:</strong></p>
            <ul>
                <li>Copy, reproduce, republish, or redistribute this website or its original code, assets, or content.</li>
                <li>Modify, adapt, or create derivative works based on this website or its original materials.</li>
                <li>Sell, rent, lease, sublicense, distribute, or otherwise transfer any portion of this website or its content.</li>
                <li>Remove, obscure, or alter any copyright notices, branding, trademarks, or ownership information.</li>
                <li>Claim, represent, or present this website, its design, code, or original content as your own work.</li>
                <li>Reverse engineer, decompile, disassemble, or otherwise attempt to reproduce protected portions of the website except where expressly permitted by applicable law.</li>
            </ul>
            <p>
                Third-party names, trademarks, game assets, images, data, and
                other intellectual property remain the property of their
                respective owners. Nothing on this website should be
                interpreted as claiming ownership of third-party intellectual
                property.
            </p>
            <p><strong>Disclaimer</strong></p>
            <p>
                Sprite Tracker is an independent project and is not affiliated
                with, endorsed by, sponsored by, or officially associated with
                Epic Games, Inc. or Fortnite. Fortnite and related trademarks,
                names, and assets are the property of Epic Games, Inc. and
                their respective owners.
            </p>
            <p>
                This website is provided <strong>"as is"</strong> and
                <strong>"as available"</strong> without warranties of any kind,
                either express or implied. To the fullest extent permitted by
                law, the developer disclaims all warranties, including
                warranties of merchantability, fitness for a particular
                purpose, accuracy, availability, and non-infringement.
            </p>
            <p>
                To the fullest extent permitted by applicable law, the
                developer shall not be liable for any direct, indirect,
                incidental, consequential, special, or other damages arising
                from or related to the use of, or inability to use, this
                website.
            </p>
            <p>
                By accessing or using Sprite Tracker, you acknowledge and agree
                to comply with this Copyright &amp; Usage Notice.
            </p>
        </div>
    `,[{label:"Close"}]);
}

function downloadFile(filename,type,content){
    const blob = new Blob([content],{type});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function safeFilename(value){
    return String(value || "Profile")
        .replace(/[<>:"/\\|?*]+/g,"")
        .replace(/\s+/g," ")
        .trim() || "Profile";
}

async function saveImageBlob(blob,filename,saveHandle = null){
    if(saveHandle){
        const writable = await saveHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
    }
    const file = new File([blob],filename,{type:"image/png"});
    if(mobileViewport() && navigator.canShare && navigator.canShare({files:[file]}) && navigator.share){
        try{
            await navigator.share({
                files:[file],
                title:"Sprite Tracker",
                text:"Sprite Tracker export"
            });
            return;
        }
        catch(error){
            if(error?.name === "AbortError"){
                return;
            }
        }
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.target = "_blank";
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    if(mobileViewport()){
        const preview = document.createElement("div");
        preview.className = "imageExportPreview";
        preview.innerHTML = `
            <p>If the PNG did not save automatically, press and hold the image below and choose Save Image.</p>
            <img src="${url}" alt="Sprite Tracker export preview">
        `;
        showDialog("Export Image",preview,[
            {
                label:"Open Image",
                close:false,
                onClick:()=>window.open(url,"_blank","noopener")
            },
            {
                label:"Done",
                onClick:()=>setTimeout(()=>URL.revokeObjectURL(url),1000)
            }
        ]);
        return;
    }
    setTimeout(()=>URL.revokeObjectURL(url),30000);
}

async function chooseDesktopImageFile(filename){
    if(mobileViewport() || !window.showSaveFilePicker){
        return null;
    }
    try{
        return await window.showSaveFilePicker({
            suggestedName:filename,
            startIn:"desktop",
            types:[
                {
                    description:"PNG Image",
                    accept:{"image/png":[".png"]}
                }
            ]
        });
    }
    catch(error){
        if(error?.name === "AbortError"){
            return false;
        }
        throw error;
    }
}

function exportCsv(){
    if(!state.profile){
        showDialog("Export CSV","Open a profile first.",[{label:"OK"}]);
        return;
    }
    const season = activeSeason();
    const progress = seasonProgress(state.profile,state.seasonId);
    const rows = [["Season","Sprite","Variant","Rarity","State","Disabled","Available"]];
    season.sprites.forEach(sprite=>{
        rows.push([
            season.title,
            sprite.family,
            sprite.variant,
            sprite.rarity,
            progress.sprites[sprite.id] || "not-found",
            isDisabled(sprite) ? "yes" : "no",
            sprite.available ? "yes" : "no"
        ]);
    });
    const csv = rows.map(row=>
        row.map(value=>`"${String(value).replace(/"/g,'""')}"`).join(",")
    ).join("\r\n");
    downloadFile(`Sprite Tracker - ${state.profile.profileName}.csv`,"text/csv;charset=utf-8",csv);
}

function buildTextExport(){
    const season = activeSeason();
    const stats = calculateStats();
    const rows = buildCollectionMatrix();
    const columnWidths = [
        Math.max(
            "Sprite".length,
            ...rows.map(row=>row[0].length)
        ),
        ...season.variants.map((variant,index)=>
            Math.max(
                variant.label.length,
                ...rows.map(row=>row[index + 1].length)
            )
        )
    ];
    const formatRow = row=>
        row
            .map((cell,index)=>
                cell.padEnd(columnWidths[index]," ")
            )
            .join("  ")
            .trimEnd();
    const lines = [
        "Sprite Tracker",
        `Profile - ${state.profile.profileName}`,
        "",
        `Found: ${stats.found} / ${stats.totalSprites}`,
        `Mastered: ${stats.mastered} / ${stats.totalSprites}`,
        `Completed Sets: ${stats.completedSets} / ${stats.totalSets}`,
        `Overall Progress: ${stats.percent.toFixed(1)}%`,
        "",
        "Collection"
    ];
    if(rows.length === 0){
        lines.push("");
        lines.push("No active sprites are enabled for this profile.");
        return lines.join("\r\n");
    }
    lines.push("");
    lines.push(
        formatRow([
            "Sprite",
            ...season.variants.map(variant=>variant.label)
        ])
    );
    lines.push(
        columnWidths
            .map(width=>"-".repeat(width))
            .join("  ")
    );
    rows.forEach(row=>{
        lines.push(formatRow(row));
    });
    return lines.join("\r\n");
}

function buildCollectionMatrix(){
    const season = activeSeason();
    const progress = seasonProgress(state.profile,state.seasonId);
    const rowMap = new Map(
        season.sprites
            .filter(sprite=>
                sprite.available &&
                progress.disabledSprites[sprite.id] !== true &&
                progress.disabledFamilies[slug(sprite.family)] !== true &&
                progress.disabledVariants[sprite.variantId] !== true
            )
            .map(sprite=>[
                `${sprite.family}-${sprite.variant}`,
                sprite
            ])
    );
    const stateLabel = sprite=>{
        if(!sprite){
            return "";
        }
        const current = progress.sprites[sprite.id];
        return current === "mastered"
            ? "Mastered"
            : current === "found"
                ? "Found"
                : "Not Found";
    };
    return season.families
        .filter(family=>
            season.variants.some(variant=>
                rowMap.has(`${family.name}-${variant.label}`)
            )
        )
        .map(family=>[
            family.name,
            ...season.variants.map(variant=>
                stateLabel(
                    rowMap.get(`${family.name}-${variant.label}`)
                )
            )
        ]);
}

function exportText(){
    if(!state.profile){
        showDialog("Export Text","Open a profile first.",[{label:"OK"}]);
        return;
    }
    downloadFile(
        `Sprite Tracker - ${state.profile.profileName}.txt`,
        "text/plain;charset=utf-8",
        buildTextExport()
    );
}

function buildImageExportSheet(){
    const season = activeSeason();
    const mobile = mobileViewport();
    const sheet = document.createElement("div");
    sheet.className = `imageExportSheet ${mobile ? "imageExportSheetMobile" : "imageExportSheetDesktop"}`;
    sheet.dataset.variantCount = String(season.variants.length);
    sheet.style.setProperty("--variant-count", season.variants.length);
    sheet.innerHTML = `
        <div class="exportBrand">
            <img src="assets/sprite-tracker-title.png" alt="Sprite Tracker">
        </div>
    `;
    const deck = document.createElement("section");
    deck.className = "trackerDeck";
    deck.dataset.variantCount = String(season.variants.length);
    deck.dataset.profileLoaded = "true";
    const sticky = document.createElement("div");
    sticky.className = "trackerSticky";
    sticky.appendChild(document.querySelector(".statsDeck").cloneNode(true));
    sticky.appendChild(els.gridHeader.cloneNode(true));
    deck.appendChild(sticky);
    deck.appendChild(mobile ? buildMobileImageExportGrid(season) : els.trackerGrid.cloneNode(true));
    sheet.appendChild(deck);
    const footer = document.createElement("footer");
    footer.className = "siteFooter";
    footer.innerHTML = `<div class="footerCopyright">AmericanVampire &copy; 2026</div>`;
    sheet.appendChild(footer);
    document.body.appendChild(sheet);
    return sheet;
}

function buildMobileImageExportGrid(season){
    const progress = seasonProgress(state.profile,state.seasonId);
    const grid = document.createElement("div");
    grid.className = "mobileExportGrid";
    season.families.forEach(family=>{
        const familyDisabled = progress.disabledFamilies[slug(family.name)] === true;
        const familyComplete = isFamilyComplete(family);
        const row = document.createElement("div");
        row.className = "mobileExportRow";
        row.innerHTML = `
            <div class="mobileExportFamily" data-disabled="${familyDisabled}" data-complete="${familyComplete}">
                <span class="mobileExportAbility">i</span>
                <span class="mobileExportName">${escapeHtml(family.name)}</span>
                <span class="mobileExportMastered">SET COMPLETE</span>
                <span class="mobileExportStatus">${familyDisabled ? "DISABLED" : "ENABLED"}</span>
            </div>
        `;
        season.variants.forEach(variant=>{
            const sprite = season.sprites.find(item=>
                item.family === family.name && item.variantId === variant.id
            );
            row.appendChild(buildMobileImageExportSprite(sprite,family));
        });
        grid.appendChild(row);
    });
    return grid;
}

function buildMobileImageExportSprite(sprite,family){
    const card = document.createElement("div");
    if(!sprite){
        card.className = "mobileExportSprite mobileExportSprite--unavailable";
        card.dataset.state = "unavailable";
        return card;
    }
    const disabled = sprite.available ? isDisabled(sprite) : false;
    const current = sprite.available ? spriteState(sprite) : "unavailable";
    const exportState = disabled ? "disabled" : current;
    card.className = `mobileExportSprite mobileExportSprite--${exportState}`;
    card.dataset.state = exportState;
    card.dataset.available = String(sprite.available);
    card.dataset.variantType = variantType({id:sprite.variantId,label:sprite.variant});
    if(exportState === "found"){
        card.style.background = "linear-gradient(180deg, #3282c0 0%, #276cab 100%)";
        card.style.borderColor = "#67ff50";
    }
    if(exportState === "mastered"){
        card.style.background = "linear-gradient(180deg, #b0a066 0%, #6977b8 100%)";
        card.style.borderColor = "#ffef5a";
    }
    card.innerHTML = `
        ${spriteBadges()}
        <span class="mobileExportVariant">${escapeHtml(sprite.variant)}</span>
        ${sprite.image
            ? `<img src="${escapeHtml(sprite.image)}" alt="${escapeHtml(sprite.family)} ${escapeHtml(sprite.variant)}">`
            : `<span class="pixelIcon" style="--accent:${escapeHtml(sprite.accent || family.accent || "#00e7ff")}"></span>`}
        ${sprite.available ? spriteRarity(sprite.rarity) : ""}
    `;
    return card;
}

async function waitForExportImages(root){
    const images = Array.from(root.querySelectorAll("img"));
    await Promise.all(images.map(image=>{
        if(image.complete && image.naturalWidth > 0){
            return Promise.resolve();
        }
        if(image.decode){
            return image.decode().catch(()=>{});
        }
        return new Promise(resolve=>{
            image.addEventListener("load",resolve,{once:true});
            image.addEventListener("error",resolve,{once:true});
        });
    }));
}

function canvasBlob(canvas){
    return new Promise((resolve,reject)=>{
        canvas.toBlob(blob=>{
            if(blob){
                resolve(blob);
            }
            else{
                reject(new Error("Image export did not create a file."));
            }
        },"image/png");
    });
}

function loadCanvasImage(src){
    return new Promise(resolve=>{
        if(!src){
            resolve(null);
            return;
        }
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => resolve(null);
        image.src = src;
    });
}

function roundRectPath(ctx,x,y,width,height,radius){
    const r = Math.min(radius,width / 2,height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r,y);
    ctx.lineTo(x + width - r,y);
    ctx.quadraticCurveTo(x + width,y,x + width,y + r);
    ctx.lineTo(x + width,y + height - r);
    ctx.quadraticCurveTo(x + width,y + height,x + width - r,y + height);
    ctx.lineTo(x + r,y + height);
    ctx.quadraticCurveTo(x,y + height,x,y + height - r);
    ctx.lineTo(x,y + r);
    ctx.quadraticCurveTo(x,y,x + r,y);
    ctx.closePath();
}

function fillRoundRect(ctx,x,y,width,height,radius,fill,stroke){
    roundRectPath(ctx,x,y,width,height,radius);
    ctx.fillStyle = fill;
    ctx.fill();
    if(stroke){
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

function drawText(ctx,text,x,y,options = {}){
    ctx.save();
    ctx.font = `${options.weight || 900} ${options.size || 14}px Arial, sans-serif`;
    ctx.textAlign = options.align || "left";
    ctx.textBaseline = options.baseline || "middle";
    if(options.stroke){
        ctx.lineWidth = options.strokeWidth || 3;
        ctx.strokeStyle = options.stroke;
        ctx.strokeText(text,x,y);
    }
    ctx.fillStyle = options.color || "#fff";
    ctx.fillText(text,x,y);
    ctx.restore();
}

function drawCenteredImage(ctx,image,x,y,width,height){
    if(!image){
        return;
    }
    const scale = Math.min(width / image.naturalWidth,height / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    ctx.drawImage(
        image,
        x + ((width - drawWidth) / 2),
        y + ((height - drawHeight) / 2),
        drawWidth,
        drawHeight
    );
}

function rarityColors(rarity){
    const key = rarityClass(rarity);
    if(key === "rare"){
        return ["#5ab8ff","#2f85ff","#ffffff"];
    }
    if(key === "epic"){
        return ["#c57cff","#742bff","#ffffff"];
    }
    if(key === "legendary"){
        return ["#ffd36a","#f28400","#111111"];
    }
    if(key === "mythic"){
        return ["#fff0a8","#d8a300","#111111"];
    }
    return ["#5dffe4","#ff7af1","#111111"];
}

function variantColor(variantId){
    if(variantId === "gold"){
        return "#ffdc3f";
    }
    if(variantId === "cheatmaster"){
        return "#72ff8c";
    }
    return "#eef4ff";
}

function drawBadge(ctx,x,y,state){
    if(state === "found"){
        fillRoundRect(ctx,x,y,28,28,7,"#60ff5a",null);
        ctx.strokeStyle = "#08240d";
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(x + 7,y + 15);
        ctx.lineTo(x + 12,y + 20);
        ctx.lineTo(x + 22,y + 8);
        ctx.stroke();
    }
    if(state === "mastered"){
        fillRoundRect(ctx,x,y,28,28,7,"#ffe45c",null);
        ctx.strokeStyle = "#111";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 6,y + 19);
        ctx.lineTo(x + 6,y + 10);
        ctx.lineTo(x + 11,y + 15);
        ctx.lineTo(x + 14,y + 8);
        ctx.lineTo(x + 17,y + 15);
        ctx.lineTo(x + 22,y + 10);
        ctx.lineTo(x + 22,y + 19);
        ctx.closePath();
        ctx.stroke();
    }
}

function drawRarity(ctx,rarity,x,y,width){
    if(!rarity || rarity === "N/A"){
        return;
    }
    const [start,end,textColor] = rarityColors(rarity);
    const gradient = ctx.createLinearGradient(x,y,x + width,y + 20);
    if(rarityClass(rarity) === "special"){
        gradient.addColorStop(0,"#5dffe4");
        gradient.addColorStop(.25,"#8dff9a");
        gradient.addColorStop(.5,"#fff36a");
        gradient.addColorStop(.75,"#ff7af1");
        gradient.addColorStop(1,"#8e7cff");
    }
    else{
        gradient.addColorStop(0,start);
        gradient.addColorStop(1,end);
    }
    fillRoundRect(ctx,x,y,width,20,5,gradient,null);
    drawText(ctx,rarity.toUpperCase(),x + (width / 2),y + 10,{
        align:"center",
        size:10,
        color:textColor,
        weight:950
    });
}

async function renderMobileExportCanvasBlob(){
    const season = activeSeason();
    const stats = calculateStats();
    const rowHeight = 292;
    const width = 540;
    const height = 16 + 90 + 14 + 244 + (season.families.length * rowHeight) + 70;
    const ratio = 2;
    const canvas = document.createElement("canvas");
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    const ctx = canvas.getContext("2d");
    ctx.scale(ratio,ratio);
    ctx.fillStyle = "#070519";
    ctx.fillRect(0,0,width,height);
    const title = await loadCanvasImage("assets/sprite-tracker-title.png");
    const imageEntries = await Promise.all(season.sprites.map(async sprite=>[
        sprite.id,
        await loadCanvasImage(sprite.image)
    ]));
    const imageMap = new Map(imageEntries);

    fillRoundRect(ctx,15,16,510,90,8,"#0b55bf","#4abfff");
    drawCenteredImage(ctx,title,55,25,430,70);

    let y = 120;
    fillRoundRect(ctx,15,y,510,244,0,"#0b49ad",null);
    [["Found",`${stats.found} / ${stats.totalSprites}`],["Completed Sets",`${stats.completedSets} / ${stats.totalSets}`],["Mastered",`${stats.mastered} / ${stats.totalSprites}`],["Overall Progress",`${stats.percent}%`]].forEach((item,index)=>{
        const col = index % 2;
        const row = Math.floor(index / 2);
        const x = col === 0 ? 28 : 276;
        const yy = y + 32 + (row * 38);
        drawText(ctx,item[0],x,yy,{size:15});
        drawText(ctx,item[1],col === 0 ? 260 : 508,yy,{size:24,align:"right"});
        ctx.strokeStyle = "rgba(145,229,255,.28)";
        ctx.beginPath();
        ctx.moveTo(x,yy + 18);
        ctx.lineTo(col === 0 ? 260 : 508,yy + 18);
        ctx.stroke();
    });
    fillRoundRect(ctx,28,y + 98,480,56,8,"#0c6ccc","#4abfff");
    drawText(ctx,"NEXT SPRITE DROP",40,y + 116,{size:11,color:"#d7f6ff"});
    drawText(ctx,els.timerValue.textContent || "",492,y + 126,{size:24,align:"right"});
    drawText(ctx,"IN-GAME RELEASE",40,y + 138,{size:11,color:"#fff56d"});
    fillRoundRect(ctx,28,y + 168,480,62,10,"#256be2","#5fbfff");
    drawText(ctx,seasonPickerLabel(season),270,y + 199,{size:16,align:"center"});
    y += 260;

    const progress = seasonProgress(state.profile,state.seasonId);
    season.families.forEach(family=>{
        const familyDisabled = progress.disabledFamilies[slug(family.name)] === true;
        const familyComplete = isFamilyComplete(family);
        fillRoundRect(ctx,28,y,480,106,8,familyDisabled ? "#31537f" : "#0b55bf",familyComplete ? "#ffe45c" : "#308fe8");
        fillRoundRect(ctx,42,y + 64,34,30,6,"#10aee8",null);
        drawText(ctx,"i",59,y + 79,{size:19,align:"center",style:"italic"});
        drawText(ctx,family.name,270,y + 54,{size:26,align:"center",stroke:"#00123f",strokeWidth:4});
        fillRoundRect(ctx,404,y + 64,88,24,5,familyDisabled ? "rgba(255,77,109,.22)" : "rgba(103,255,80,.14)",null);
        drawText(ctx,familyDisabled ? "DISABLED" : "ENABLED",448,y + 76,{size:10,align:"center",color:familyDisabled ? "#ff4d6d" : "#dbffe5"});
        if(familyComplete){
            fillRoundRect(ctx,42,y + 10,108,20,5,"rgba(255,224,92,.16)",null);
            drawText(ctx,"SET COMPLETE",96,y + 20,{size:9,align:"center",color:"#ffe45c"});
        }
        season.variants.forEach((variant,index)=>{
            const sprite = season.sprites.find(item=>
                item.family === family.name && item.variantId === variant.id
            );
            const x = 28 + (index * 164);
            const cardY = y + 118;
            const disabled = sprite?.available ? isDisabled(sprite) : false;
            const spriteProgress = sprite?.available ? spriteState(sprite) : "unavailable";
            const stateName = disabled ? "disabled" : spriteProgress;
            fillRoundRect(
                ctx,
                x,
                cardY,
                152,
                156,
                8,
                stateName === "disabled" ? "#42376d" : "#0b55bf",
                stateName === "found" ? "#60ff5a" : stateName === "mastered" ? "#ffe45c" : "#308fe8"
            );
            drawText(ctx,variant.label.toUpperCase(),x + 7,cardY + 15,{
                size:10,
                color:variantColor(variant.id),
                stroke:"#00123f",
                strokeWidth:2
            });
            if(sprite?.image){
                drawCenteredImage(ctx,imageMap.get(sprite.id),x + 28,cardY + 30,96,86);
            }
            if(sprite?.available){
                drawRarity(ctx,sprite.rarity,x + 8,cardY + 124,136);
            }
            drawBadge(ctx,x + 116,cardY + 10,stateName);
        });
        y += rowHeight;
    });
    drawText(ctx,"AmericanVampire © 2026",270,height - 32,{
        size:20,
        align:"center",
        stroke:"#00123f",
        strokeWidth:3
    });
    return canvasBlob(canvas);
}

async function exportImage(){
    if(!state.profile){
        showDialog("Export Image","Open a profile first.",[{label:"OK"}]);
        return;
    }
    if(window.location.protocol === "file:"){
        showDialog(
            "Export Image",
            "Image export needs the local preview or hosted website. Opening index.html directly blocks the browser from reading the sprite images for export.",
            [{label:"OK"}]
        );
        return;
    }
    if(!window.htmlToImage){
        showDialog(
            "Export Image",
            "Image export is still loading. Try again in a moment.",
            [{label:"OK"}]
        );
        return;
    }
    const filename = `Sprite Tracker - ${safeFilename(state.profile.profileName)}.png`;
    const saveHandle = await chooseDesktopImageFile(filename);
    if(saveHandle === false){
        return;
    }
    if(mobileViewport()){
        try{
            await saveImageBlob(
                await renderMobileExportCanvasBlob(),
                filename,
                saveHandle
            );
        }
        catch(error){
            console.error(error);
            showDialog(
                "Export Image",
                "The image export failed. Refresh the page and try again. On mobile, use the Share or Save Image option if your browser asks where to send the PNG.",
                [{label:"OK"}]
            );
        }
        return;
    }
    const restoreScroll = {x:window.scrollX,y:window.scrollY};
    let exportTarget = null;
    try{
        exportTarget = buildImageExportSheet();
        window.scrollTo(0,0);
        document.body.classList.add("exportingImage");
        await waitForExportImages(exportTarget);
        await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
        const exportOptions = {
            pixelRatio:mobileViewport() ? 1.25 : 2,
            cacheBust:true,
            backgroundColor:"#070519"
        };
        const imageBlob = window.htmlToImage.toBlob
            ? await window.htmlToImage.toBlob(exportTarget,exportOptions)
            : await fetch(await window.htmlToImage.toPng(exportTarget,exportOptions)).then(response=>response.blob());
        if(!imageBlob){
            throw new Error("Image export did not create a file.");
        }
        await saveImageBlob(
            imageBlob,
            filename,
            saveHandle
        );
    }
    catch(error){
        console.error(error);
        showDialog(
            "Export Image",
            "The image export failed. Refresh the page and try again. On mobile, use the Share or Save Image option if your browser asks where to send the PNG.",
            [{label:"OK"}]
        );
    }
    finally{
        document.body.classList.remove("exportingImage");
        exportTarget?.remove();
        window.scrollTo(restoreScroll.x,restoreScroll.y);
    }
}

async function openProfileChooser(){
    const profiles = await SpriteStore.getProfiles();
    if(!profiles.length){
        showDialog("Open Profile","No profiles exist yet.",[{label:"OK"}]);
        return;
    }
    const list = document.createElement("div");
    list.className = "profileList";
    profiles.forEach(profile=>{
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = profile;
        button.addEventListener("click",async()=>{
            state.profile = await SpriteStore.openProfile(profile);
            state.seasonId = state.profile.activeSeasonId || "override";
            await SpriteStore.setStartupProfile(state.profile.profileName);
            els.dialog.close();
            render();
        });
        list.appendChild(button);
    });
    showDialog("Open Profile",list,[{label:"Cancel"}]);
}

async function importProfile(file){
    const text = await file.text();
    const data = JSON.parse(text);
    const profile = SpriteStore.normalizeProfile(data);
    if(await SpriteStore.getProfiles().then(list=>list.includes(profile.profileName))){
        profile.profileName = `${profile.profileName} Imported`;
    }
    state.profile = await SpriteStore.saveProfile(profile);
    state.seasonId = state.profile.activeSeasonId || "override";
    await SpriteStore.setStartupProfile(state.profile.profileName);
    render();
}

function bindSourceDeterrents(){
    const blockedCombo = event=>{
        const key = event.key.toLowerCase();
        const commandKey = event.ctrlKey || event.metaKey;
        return event.key === "F12"
            || (commandKey && event.shiftKey && ["i","j","c"].includes(key))
            || (commandKey && ["u","s"].includes(key));
    };
    document.addEventListener("contextmenu",event=>{
        event.preventDefault();
    });
    document.addEventListener("keydown",event=>{
        if(blockedCombo(event)){
            event.preventDefault();
            event.stopPropagation();
        }
    },true);
}

function bindControls(){
    bindSourceDeterrents();
    updateNoticeButton();
    if(els.noticeButton){
        els.noticeButton.addEventListener("click",showAppNotice);
    }
    if(PAYPAL_DONATE_URL){
        els.donateButton.href = PAYPAL_DONATE_URL;
    }
    else{
        els.donateButton.removeAttribute("href");
        els.donateButton.setAttribute("aria-disabled","true");
        els.donateButton.title = "PayPal donate link coming soon.";
    }
    if(DISCORD_INVITE_URL){
        els.discordButton.href = DISCORD_INVITE_URL;
    }
    else{
        els.discordButton.removeAttribute("href");
        els.discordButton.setAttribute("aria-disabled","true");
        els.discordButton.title = "Discord invite link coming soon.";
    }
    document.getElementById("newProfileButton").addEventListener("click",()=>{
        promptDialog("New Profile","Profile name","",async(name)=>{
            state.profile = await SpriteStore.createProfile(name);
            state.seasonId = "override";
            await SpriteStore.setStartupProfile(name);
            render();
        });
    });
    document.getElementById("openProfileButton").addEventListener("click",openProfileChooser);
    document.getElementById("renameProfileButton").addEventListener("click",()=>{
        if(!state.profile){
            showDialog("Rename Profile","Open a profile first.",[{label:"OK"}]);
            return;
        }
        promptDialog("Rename Profile","Profile name",state.profile.profileName,async(name)=>{
            state.profile = await SpriteStore.renameProfile(state.profile.profileName,name);
            render();
        });
    });
    document.getElementById("deleteProfileButton").addEventListener("click",()=>{
        if(!state.profile){
            showDialog("Delete Profile","Open a profile first.",[{label:"OK"}]);
            return;
        }
        showDialog("Delete Profile",`Delete ${state.profile.profileName}? This cannot be undone.`,[
            {label:"Cancel"},
            {
                label:"Delete",
                danger:true,
                onClick:async()=>{
                    await SpriteStore.deleteProfile(state.profile.profileName);
                    state.profile = null;
                    render();
                }
            }
        ]);
    });
    document.getElementById("exportProfileButton").addEventListener("click",()=>{
        if(!state.profile){
            showDialog("Export Profile","Open a profile first.",[{label:"OK"}]);
            return;
        }
        downloadFile(
            `Sprite Tracker - ${state.profile.profileName}.json`,
            "application/json",
            JSON.stringify(state.profile,null,2)
        );
    });
    document.getElementById("exportImageButton").addEventListener("click",exportImage);
    document.getElementById("exportTextButton").addEventListener("click",exportText);
    document.getElementById("exportCsvButton").addEventListener("click",exportCsv);
    document.getElementById("importProfileButton").addEventListener("click",()=>{
        els.importFileInput.click();
    });
    els.footerInfoButton.addEventListener("click",showTrackerInfo);
    els.footerLicenseButton.addEventListener("click",showLicenseInfo);
    els.importFileInput.addEventListener("change",async()=>{
        const file = els.importFileInput.files[0];
        if(file){
            await importProfile(file);
        }
        els.importFileInput.value = "";
    });
    document.getElementById("backToTopButton").addEventListener("click",()=>{
        window.scrollTo({top:0,behavior:"smooth"});
    });
    els.trackerGrid.addEventListener("mouseover",event=>{
        if(mobileViewport()){
            return;
        }
        const button = event.target.closest(".abilityButton");
        if(button){
            showAbilityPreview(button.dataset.family);
        }
    });
    els.trackerGrid.addEventListener("mouseout",event=>{
        if(mobileViewport()){
            return;
        }
        const button = event.target.closest(".abilityButton");
        if(button && !button.contains(event.relatedTarget)){
            hideAbilityPreview();
        }
    });
    els.trackerGrid.addEventListener("focusin",event=>{
        if(mobileViewport()){
            return;
        }
        const button = event.target.closest(".abilityButton");
        if(button){
            showAbilityPreview(button.dataset.family);
        }
    });
    els.trackerGrid.addEventListener("focusout",event=>{
        if(mobileViewport()){
            return;
        }
        const button = event.target.closest(".abilityButton");
        if(button){
            hideAbilityPreview();
        }
    });
    els.trackerGrid.addEventListener("pointerdown",event=>{
        const button = event.target.closest(".abilityButton");
        if(button && mobileViewport()){
            event.preventDefault();
            event.stopPropagation();
            showAbilityPreview(button.dataset.family);
        }
    });
    els.trackerGrid.addEventListener("click",event=>{
        const button = event.target.closest(".abilityButton");
        if(button){
            event.preventDefault();
            event.stopPropagation();
            showAbilityPreview(button.dataset.family);
        }
    });
    els.abilityPreview.addEventListener("click",event=>{
        event.stopPropagation();
    });
    document.addEventListener("pointerdown",event=>{
        if(!mobileAbilityPreviewOpen()){
            return;
        }
        if(event.target.closest(".abilityPreview") || event.target.closest(".abilityButton")){
            return;
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        suppressNextAbilityCloseClick = true;
        hideAbilityPreview();
    },true);
    document.addEventListener("click",event=>{
        if(!suppressNextAbilityCloseClick){
            return;
        }
        suppressNextAbilityCloseClick = false;
        event.preventDefault();
        event.stopImmediatePropagation();
    },true);
    document.addEventListener("click",event=>{
        if(!event.target.closest(".abilityButton")){
            hideAbilityPreview();
        }
        document.querySelectorAll("details[open]").forEach(menu=>{
            if(!menu.contains(event.target)){
                menu.removeAttribute("open");
            }
        });
    });
    window.addEventListener("resize",updateStickyOffsets);
}

async function init(){
    bindControls();
    render();
    let startup = null;
    try{
        startup = await SpriteStore.getStartupProfile();
    }
    catch(error){
        console.warn(error);
    }
    if(startup){
        try{
            state.profile = await SpriteStore.openProfile(startup);
            state.seasonId = state.profile.activeSeasonId || "override";
            await SpriteStore.setStartupProfile(state.profile.profileName);
        }
        catch(error){
            console.warn(error);
        }
    }
    if(!state.profile){
        let profileName = null;
        try{
            profileName = await SpriteStore.getMostRecentProfileName();
        }
        catch(error){
            console.warn(error);
        }
        if(profileName){
            try{
                state.profile = await SpriteStore.openProfile(profileName);
                state.seasonId = state.profile.activeSeasonId || "override";
                await SpriteStore.setStartupProfile(state.profile.profileName);
            }
            catch(error){
                console.warn(error);
            }
        }
    }
    state.loading = false;
    render();
    setInterval(renderDropTimer,1000);
}

init();
