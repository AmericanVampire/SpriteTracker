const SpriteStore = (() => {
    const dbName = "sprite-tracker-web";
    const dbVersion = 1;
    const profilesStore = "profiles";
    const settingsStore = "settings";
    const startupStorageKey = "sprite-tracker-startup-profile";

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

    function normalizeProfile(profile){
        const now = new Date().toISOString();
        return {
            profileName:String(profile.profileName || "Imported Profile").trim(),
            created:profile.created || now,
            lastOpened:now,
            version:APP_VERSION,
            activeSeasonId:profile.activeSeasonId || "override",
            seasons:profile.seasons || {},
            sprites:profile.sprites || {},
            disabledSprites:profile.disabledSprites || {}
        };
    }

    async function getProfile(name){
        return withStore(profilesStore,"readonly",store=>
            requestToPromise(store.get(name))
        );
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
        await withStore(profilesStore,"readwrite",store=>{
            store.put(normalized);
        });
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
        await withStore(profilesStore,"readwrite",store=>{
            store.delete(name);
        });
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
        return withStore(profilesStore,"readonly",store=>
            requestToPromise(store.getAllKeys())
        ).then(keys=>keys.sort((a,b)=>a.localeCompare(b)));
    }

    async function getMostRecentProfileName(){
        const profiles = await withStore(profilesStore,"readonly",store=>
            requestToPromise(store.getAll())
        );
        const mostRecent = profiles
            .filter(profile=>profile?.profileName)
            .sort((a,b)=>{
                const bTime = Date.parse(b.lastOpened || b.created || "") || 0;
                const aTime = Date.parse(a.lastOpened || a.created || "") || 0;
                return bTime - aTime;
            })[0];
        return mostRecent?.profileName || null;
    }

    async function getStartupProfile(){
        const setting = await withStore(settingsStore,"readonly",store=>
            requestToPromise(store.get("startupProfile"))
        );
        return setting?.value || localStorage.getItem(startupStorageKey) || null;
    }

    async function setStartupProfile(name){
        if(name){
            localStorage.setItem(startupStorageKey,name);
        }
        else{
            localStorage.removeItem(startupStorageKey);
        }
        await withStore(settingsStore,"readwrite",store=>{
            if(name){
                store.put({key:"startupProfile",value:name});
            }
            else{
                store.delete("startupProfile");
            }
        });
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
