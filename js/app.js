const state = {
    profile:null,
    seasonId:"override"
};

const els = {
    currentProfileName:document.getElementById("currentProfileName"),
    storageNote:document.getElementById("storageNote"),
    foundStat:document.getElementById("foundStat"),
    masteredStat:document.getElementById("masteredStat"),
    setsStat:document.getElementById("setsStat"),
    overallStat:document.getElementById("overallStat"),
    profileProgressBadge:document.getElementById("profileProgressBadge"),
    trackerDeck:document.querySelector(".trackerDeck"),
    gridHeader:document.getElementById("gridHeader"),
    trackerGrid:document.getElementById("trackerGrid"),
    dialog:document.getElementById("dialog"),
    dialogTitle:document.getElementById("dialogTitle"),
    dialogContent:document.getElementById("dialogContent"),
    dialogActions:document.getElementById("dialogActions"),
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

function profileLoaded(){
    return Boolean(state.profile);
}

function seasonPickerLabel(season){
    return season.season.toUpperCase();
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

async function persist(){
    if(!state.profile){
        return;
    }
    state.profile.activeSeasonId = state.seasonId;
    state.profile = await SpriteStore.saveProfile(state.profile);
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
    const stats = calculateStats();
    els.foundStat.textContent = `${stats.found} / ${stats.totalSprites}`;
    els.masteredStat.textContent = `${stats.mastered} / ${stats.totalSprites}`;
    els.setsStat.textContent = `${stats.completedSets} / ${stats.totalSets}`;
    els.overallStat.textContent = `${stats.percent}%`;
}

function renderProfile(){
    els.currentProfileName.textContent = state.profile?.profileName || "No profile loaded";
    els.profileProgressBadge.textContent = state.profile
        ? `Profile: ${state.profile.profileName}`
        : "Profile: No profile loaded";
    els.storageNote.textContent = state.profile
        ? "Autosaved locally in this browser"
        : "Create or open a local profile";
}

function renderTracker(){
    const season = activeSeason();
    els.trackerGrid.innerHTML = "";
    els.gridHeader.innerHTML = "";
    els.trackerGrid.style.setProperty(
        "--variant-count",
        season.variants.length
    );
    els.gridHeader.style.setProperty(
        "--variant-count",
        season.variants.length
    );
    els.trackerDeck.dataset.variantCount = String(season.variants.length);
    const progress = profileLoaded()
        ? seasonProgress(state.profile,state.seasonId)
        : emptySeasonProgress();
    els.gridHeader.innerHTML = `
        <div class="seasonPickerCell">
            <span>${season.chapter}</span>
            <details class="seasonMenu">
                <summary>${seasonPickerLabel(season)}</summary>
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
        `<button class="variantToggle" data-variant="${variant.id}" data-variant-type="${variant.id}" data-disabled="${progress.disabledVariants[variant.id] === true}">
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
        row.innerHTML = `
            <button class="familyCell" data-disabled="${familyDisabled}" data-complete="${familyComplete}">
                <span class="familyName">${family.name}</span>
                <span class="familyMeta">${family.rarity}</span>
                <span class="familyMastered">MASTERED</span>
                <span class="familyStatus">${familyDisabled ? "DISABLED" : "ENABLED"}</span>
                <img class="setStar" src="assets/set-complete-star.webp" alt="Completed set">
            </button>
        `;
        const familyButton = row.querySelector(".familyCell");
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
        row.querySelector(".setStar").hidden = !familyComplete;
    });
}

function createSpriteCard(sprite,family){
    const button = document.createElement("button");
    if(!sprite.available){
        button.type = "button";
        button.className = "spriteCard spriteCardEmpty";
        button.dataset.state = "unavailable";
        button.dataset.available = "false";
        button.title = "Not available in this generation.";
        button.innerHTML = sprite.image
            ? `<img src="${sprite.image}" alt="${sprite.family} unavailable ${sprite.variant}"><span>${sprite.variant}</span>`
            : `<span class="pixelIcon" style="--accent:${family.accent || "#00e7ff"}"></span><span>${sprite.variant}</span>`;
        button.disabled = true;
        return button;
    }
    const disabled = isDisabled(sprite);
    const current = spriteState(sprite);
    button.type = "button";
    button.className = "spriteCard";
    button.dataset.state = disabled ? "disabled" : current;
    button.dataset.available = String(sprite.available);
    button.title = sprite.available
        ? "Left-click to cycle progress. Right-click to disable this sprite."
        : "Not available in this generation.";
    button.innerHTML = sprite.image
        ? `${spriteBadges()}<img src="${sprite.image}" alt="${sprite.family} ${sprite.variant}"><span>${sprite.variant}</span>`
        : `${spriteBadges()}<span class="pixelIcon" style="--accent:${sprite.accent || family.accent || "#00e7ff"}"></span><span>${sprite.variant}</span>`;
    if(!sprite.available){
        button.disabled = true;
    }
    button.addEventListener("click",async()=>{
        if(!profileLoaded() || disabled){
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
    const progress = seasonProgress(state.profile,state.seasonId);
    const lines = [
        "Sprite Tracker",
        `Profile: ${state.profile.profileName}`,
        `Season: ${season.title} (${season.chapter} ${season.season})`,
        "",
        `Found: ${stats.found} / ${stats.totalSprites}`,
        `Mastered: ${stats.mastered} / ${stats.totalSprites}`,
        `Completed Sets: ${stats.completedSets} / ${stats.totalSets}`,
        `Overall Progress: ${stats.percent}%`,
        "",
        "Collection"
    ];
    season.families.forEach(family=>{
        const familyDisabled =
            progress.disabledFamilies[slug(family.name)] === true;
        lines.push("");
        lines.push(`${family.name} - ${family.rarity} - ${familyDisabled ? "DISABLED" : "ENABLED"}`);
        season.variants.forEach(variant=>{
            const sprite = season.sprites.find(item=>
                item.family === family.name &&
                item.variantId === variant.id
            );
            if(!sprite || !sprite.available){
                lines.push(`  ${variant.label}: N/A`);
                return;
            }
            const status = isDisabled(sprite)
                ? "Disabled"
                : progress.sprites[sprite.id] === "mastered"
                    ? "Mastered"
                    : progress.sprites[sprite.id] === "found"
                        ? "Found"
                        : "Not Found";
            lines.push(`  ${variant.label}: ${status}`);
        });
    });
    return lines.join("\r\n");
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

async function exportImage(){
    if(!state.profile){
        showDialog("Export Image","Open a profile first.",[{label:"OK"}]);
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
    try{
        const exportTarget = document.querySelector(".appGrid");
        document.body.classList.add("exportingImage");
        await new Promise(resolve=>requestAnimationFrame(resolve));
        const imageData = await window.htmlToImage.toPng(exportTarget,{
            pixelRatio:2,
            cacheBust:true,
            backgroundColor:"#070519"
        });
        const link = document.createElement("a");
        link.href = imageData;
        link.download = `Sprite Tracker - ${state.profile.profileName}.png`;
        document.body.appendChild(link);
        link.click();
        link.remove();
    }
    catch(error){
        console.error(error);
        showDialog("Export Image","The image export failed. Please try again.",[{label:"OK"}]);
    }
    finally{
        document.body.classList.remove("exportingImage");
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
    render();
}

function bindControls(){
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
}

async function init(){
    bindControls();
    const startup = await SpriteStore.getStartupProfile();
    if(startup){
        try{
            state.profile = await SpriteStore.openProfile(startup);
            state.seasonId = state.profile.activeSeasonId || "override";
        }
        catch(error){
            console.warn(error);
        }
    }
    render();
}

init();
