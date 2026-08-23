const SpriteStore = (() => {
    const dbName = "sprite-tracker-web";
    const dbVersion = 1;
    const profilesStore = "profiles";
    const settingsStore = "settings";
    const startupStorageKey = "sprite-tracker-startup-profile";
    const profileBackupKey = "sprite-tracker-profile-backups";

    function openDb(){
        return new Promise((resolve,reject)=>{
            const request = indexedDB.open(dbName,dbVersion);
            request.onupgradeneeded = () => {
                const db = request.result;
                if(!db.objectStoreNames.contains(profilesStore)){
                    db.createObjectStore(profilesStore,{keyPath:"profileName"});
                }
                if(!db.objectStoreNames.contains(settingsStore)){
                    db.createObjectStore(settingsStore,{keyPath:"key"});
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async function withStore(storeName,mode,callback){
        const db = await openDb();
        return new Promise((resolve,reject)=>{
            const tx = db.transaction(storeName,mode);
            const store = tx.objectStore(storeName);
            const result = callback(store);
            tx.oncomplete = () => resolve(result);
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
        }).finally(()=>db.close());
    }

    function requestToPromise(request){
        return new Promise((resolve,reject)=>{
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    function readProfileBackups(){
        try{
            return JSON.parse(localStorage.getItem(profileBackupKey) || "{}");
        }
        catch(error){
            console.warn(error);
            return {};
        }
    }

    function writeProfileBackups(backups){
        try{
            localStorage.setItem(profileBackupKey,JSON.stringify(backups));
        }
        catch(error){
            console.warn(error);
        }
    }

    function getBackupProfile(name){
        return readProfileBackups()[name] || null;
    }

    function setBackupProfile(profile){
        if(!profile?.profileName){
            return;
        }
        const backups = readProfileBackups();
        backups[profile.profileName] = profile;
        writeProfileBackups(backups);
    }

    function deleteBackupProfile(name){
        const backups = readProfileBackups();
        delete backups[name];
        writeProfileBackups(backups);
    }

    function normalizeProfile(profile){
        const now = new Date().toISOString();
        return {
            profileName:String(profile.profileName || "Imported Profile").trim(),
            created:profile.created || now,
            lastOpened:now,
            version:APP_VERSION,
            activeSeasonId:profile.activeSeasonId || "override",
            seasons:profile.seasons || {},
            lobbyHacks:profile.lobbyHacks || {},
            sprites:profile.sprites || {},
            disabledSprites:profile.disabledSprites || {}
        };
    }

    async function getProfile(name){
        try{
            const profile = await withStore(profilesStore,"readonly",store=>
                requestToPromise(store.get(name))
            );
            return profile || getBackupProfile(name);
        }
        catch(error){
            console.warn(error);
            return getBackupProfile(name);
        }
    }

    async function createProfile(name){
        const profileName = String(name).trim();
        if(!profileName){
            throw new Error("Profile name is required.");
        }
        if(await getProfile(profileName)){
            throw new Error("Profile already exists.");
        }
        const profile = normalizeProfile({profileName});
        await saveProfile(profile);
        return profile;
    }

    async function saveProfile(profile){
        const normalized = normalizeProfile(profile);
        setBackupProfile(normalized);
        try{
            await withStore(profilesStore,"readwrite",store=>{
                store.put(normalized);
            });
        }
        catch(error){
            console.warn(error);
        }
        return normalized;
    }

    async function openProfile(name){
        const profile = await getProfile(name);
        if(!profile){
            throw new Error("Profile not found.");
        }
        profile.lastOpened = new Date().toISOString();
        await saveProfile(profile);
        return normalizeProfile(profile);
    }

    async function deleteProfile(name){
        try{
            await withStore(profilesStore,"readwrite",store=>{
                store.delete(name);
            });
        }
        catch(error){
            console.warn(error);
        }
        deleteBackupProfile(name);
        const startup = await getStartupProfile();
        if(startup === name){
            await setStartupProfile(null);
        }
    }

    async function renameProfile(oldName,newName){
        const profileName = String(newName).trim();
        if(!profileName){
            throw new Error("Profile name is required.");
        }
        if(await getProfile(profileName)){
            throw new Error("Profile already exists.");
        }
        const startup = await getStartupProfile();
        const profile = await openProfile(oldName);
        profile.profileName = profileName;
        await saveProfile(profile);
        await deleteProfile(oldName);
        if(startup === oldName){
            await setStartupProfile(profileName);
        }
        return profile;
    }

    async function getProfiles(){
        const backupKeys = Object.keys(readProfileBackups());
        let keys = [];
        try{
            keys = await withStore(profilesStore,"readonly",store=>
                requestToPromise(store.getAllKeys())
            );
        }
        catch(error){
            console.warn(error);
        }
        return [...new Set([...keys,...backupKeys])]
            .sort((a,b)=>a.localeCompare(b));
    }

    async function getMostRecentProfileName(){
        const backupProfiles = Object.values(readProfileBackups());
        let profiles = [];
        try{
            profiles = await withStore(profilesStore,"readonly",store=>
                requestToPromise(store.getAll())
            );
        }
        catch(error){
            console.warn(error);
        }
        const mostRecent = profiles
            .concat(backupProfiles)
            .filter(profile=>profile?.profileName)
            .sort((a,b)=>{
                const bTime = Date.parse(b.lastOpened || b.created || "") || 0;
                const aTime = Date.parse(a.lastOpened || a.created || "") || 0;
                return bTime - aTime;
            })[0];
        return mostRecent?.profileName || null;
    }

    async function getStartupProfile(){
        let setting = null;
        try{
            setting = await withStore(settingsStore,"readonly",store=>
                requestToPromise(store.get("startupProfile"))
            );
        }
        catch(error){
            console.warn(error);
        }
        return setting?.value || localStorage.getItem(startupStorageKey) || null;
    }

    async function setStartupProfile(name){
        if(name){
            localStorage.setItem(startupStorageKey,name);
        }
        else{
            localStorage.removeItem(startupStorageKey);
        }
        try{
            await withStore(settingsStore,"readwrite",store=>{
                if(name){
                    store.put({key:"startupProfile",value:name});
                }
                else{
                    store.delete("startupProfile");
                }
            });
        }
        catch(error){
            console.warn(error);
        }
    }

    return {
        createProfile,
        saveProfile,
        openProfile,
        deleteProfile,
        renameProfile,
        getProfiles,
        getMostRecentProfileName,
        getStartupProfile,
        setStartupProfile,
        normalizeProfile
    };
})();
