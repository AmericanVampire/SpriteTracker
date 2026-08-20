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
    seasonTabs:document.getElementById("seasonTabs"),
    seasonTitle:document.getElementById("seasonTitle"),
    seasonDescription:document.getElementById("seasonDescription"),
    trackerHeading:document.getElementById("trackerHeading"),
    trackerGrid:document.getElementById("trackerGrid"),
    trackerEmpty:document.getElementById("trackerEmpty"),
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

function profileLoaded(){
    return Boolean(state.profile);
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
    els.storageNote.textContent = state.profile
        ? "Autosaved locally in this browser"
        : "Create or open a local profile";
}

function renderSeasonTabs(){
    els.seasonTabs.innerHTML = "";
    SEASONS.forEach(season=>{
        const button = document.createElement("button");
        button.type = "button";
        button.className = "seasonTab";
        button.dataset.active = String(season.id === state.seasonId);
        button.innerHTML = `<strong>${season.label}</strong><span>${season.kind}</span>`;
        button.addEventListener("click",async()=>{
            state.seasonId = season.id;
            if(state.profile){
                state.profile.activeSeasonId = season.id;
                await persist();
            }
            render();
        });
        els.seasonTabs.appendChild(button);
    });
}

function renderSeasonDetails(){
    const season = activeSeason();
    els.seasonTitle.textContent = season.title;
    els.seasonDescription.textContent = season.summary;
    els.trackerHeading.textContent = season.kind === "archive"
        ? "Archived Sprite Generation"
        : "Current Sprite Generation";
}

function renderTracker(){
    const season = activeSeason();
    els.trackerGrid.innerHTML = "";
    els.trackerGrid.style.setProperty(
        "--variant-count",
        season.variants.length
    );
    els.trackerEmpty.hidden = profileLoaded();
    els.trackerGrid.hidden = !profileLoaded();
    if(!profileLoaded()){
        return;
    }
    const progress = seasonProgress(state.profile,state.seasonId);
    const header = document.createElement("div");
    header.className = "gridHeader";
    header.innerHTML = `<div>Sprite</div>${season.variants.map(variant=>
        `<button class="variantToggle" data-variant="${variant.id}" data-disabled="${progress.disabledVariants[variant.id] === true}">
            ${variant.label}
        </button>`
    ).join("")}`;
    els.trackerGrid.appendChild(header);
    header.querySelectorAll(".variantToggle").forEach(button=>{
        button.addEventListener("click",async()=>{
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
        row.innerHTML = `
            <button class="familyCell" data-disabled="${familyDisabled}">
                <span class="familyName">${family.name}</span>
                <span class="familyMeta">${family.rarity}${family.status ? ` // ${family.status}` : ""}</span>
                <img class="setStar" src="assets/set-complete-star.webp" alt="Completed set">
            </button>
        `;
        const familyButton = row.querySelector(".familyCell");
        familyButton.addEventListener("click",async()=>{
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
        row.querySelector(".setStar").hidden = !isFamilyComplete(family);
    });
}

function createSpriteCard(sprite,family){
    const button = document.createElement("button");
    const disabled = !sprite.available || isDisabled(sprite);
    const current = spriteState(sprite);
    button.type = "button";
    button.className = "spriteCard";
    button.dataset.state = disabled ? "disabled" : current;
    button.dataset.available = String(sprite.available);
    button.title = sprite.available
        ? "Left-click to cycle progress. Right-click to disable this sprite."
        : "Not available in this generation.";
    button.innerHTML = sprite.image
        ? `<img src="${sprite.image}" alt="${sprite.family} ${sprite.variant}"><span>${sprite.variant}</span>`
        : `<span class="pixelIcon" style="--accent:${sprite.accent || family.accent || "#00e7ff"}"></span><span>${sprite.variant}</span>`;
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
    renderSeasonTabs();
    renderSeasonDetails();
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
