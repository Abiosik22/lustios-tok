from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
import json
import random
import os
from luscious import Luscious

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api = Luscious()
FOLDERS_FILE = "folders.json"
TRASH_FILE = "trash.json"

# --- Вспомогательные функции ---
def load_json(filename):
    if not os.path.exists(filename):
        return {} if filename == FOLDERS_FILE else []
    try:
        with open(filename, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return {} if filename == FOLDERS_FILE else []

def save_json(filename, data):
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)

# --- Эндпоинты ---

@app.get("/albums")
def get_albums(page: int = 1, search: str = "", sort: str = "rating_all_time"):
    try:
        query_str = search if search else ""
        search_res = api.searchAlbum(query=query_str, page=page, display=sort)
        results = []
        for item_id in search_res['items'][:12]:
            try:
                album = api.getAlbum(item_id)
                results.append({
                    "id": str(album.id),
                    "title": album.name,
                    "cover": album.thumbnail
                })
            except: continue
        return results
    except Exception as e:
        print(f"Search error: {e}")
        return []

# НОВЫЙ ЭНДПОИНТ: Случайные альбомы
@app.get("/albums/random")
def get_random_albums():
    """Берет случайную страницу (от 1 до 50) популярных альбомов"""
    try:
        rand_page = random.randint(1, 50)
        # display="date_trending" чтобы было свежее, или "rating_all_time"
        search_res = api.searchAlbum(query="", page=rand_page, display="rating_all_time")
        
        # Перемешиваем результаты страницы
        items = search_res['items']
        random.shuffle(items)
        
        results = []
        # Берем 12 штук
        for item_id in items[:12]:
            try:
                album = api.getAlbum(item_id)
                results.append({
                    "id": str(album.id),
                    "title": album.name,
                    "cover": album.thumbnail
                })
            except: continue
        return results
    except Exception as e:
        return []

@app.get("/album/{album_id}")
def get_one_album(album_id: str):
    try:
        album = api.getAlbum(int(album_id.strip()))
        return {"id": str(album.id), "title": album.name, "cover": album.thumbnail}
    except:
        raise HTTPException(status_code=404, detail="Not found")

@app.get("/album/{album_id}/pictures")
def get_album_pictures(album_id: str, page: int = 1):
    try:
        query = """query ListAlbumPictures($input: PictureListInput!) {
            picture { list(input: $input) { info { total_items total_pages } items { url_to_original } } }
        }"""
        variables = {"input": {"display": "position", "filters": [{"name": "album_id", "value": str(album_id)}], "page": page}}
        response = api.post(Luscious.API, json={"query": query, "variables": variables})
        data = response.json()
        pic_list = data["data"]["picture"]["list"]
        return {"page": page, "total_pages": pic_list["info"]["total_pages"], "items": [i["url_to_original"] for i in pic_list["items"]]}
    except:
        return {"items": [], "page": page, "total_pages": 0}

# === ПАПКИ И КОРЗИНА ===

@app.get("/folders")
def get_folders():
    data = load_json(FOLDERS_FILE)
    simple_data = {}
    for k, v in data.items():
        simple_data[k] = v["ids"]
    return simple_data

@app.post("/folders/create")
def create_folder(name: str = Body(..., embed=True)):
    data = load_json(FOLDERS_FILE)
    if name not in data:
        data[name] = {"ids": [], "active": True} 
        save_json(FOLDERS_FILE, data)
    return {"status": "ok"}

@app.post("/folders/delete")
def delete_folder(name: str = Body(..., embed=True)):
    data = load_json(FOLDERS_FILE)
    if name in data:
        del data[name]
        save_json(FOLDERS_FILE, data)
    return {"status": "ok"}

@app.post("/folders/add")
def add_to_folder(folder: str = Body(...), album_id: str = Body(...)):
    data = load_json(FOLDERS_FILE)
    if folder not in data:
        data[folder] = {"ids": [], "active": True}
    if str(album_id) not in data[folder]["ids"]:
        data[folder]["ids"].append(str(album_id))
        save_json(FOLDERS_FILE, data)
    return {"status": "ok"}

@app.post("/folders/toggle_feed")
def toggle_folder_feed(name: str = Body(..., embed=True)):
    data = load_json(FOLDERS_FILE)
    if name in data:
        data[name]["active"] = not data[name].get("active", True)
        save_json(FOLDERS_FILE, data)
    return {"status": "ok"}

@app.get("/folders/preview")
def get_folders_preview():
    data = load_json(FOLDERS_FILE)
    previews = []
    for name, info in data.items():
        ids = info["ids"]
        cover = None
        if len(ids) > 0:
            try:
                alb = api.getAlbum(int(ids[-1]))
                cover = alb.thumbnail
            except: pass
        previews.append({"name": name, "count": len(ids), "cover": cover, "active": info.get("active", True)})
    return previews

@app.post("/folders/content")
def get_folder_content(name: str = Body(..., embed=True)):
    data = load_json(FOLDERS_FILE)
    if name not in data: return []
    ids_to_fetch = data[name]["ids"][-50:]
    ids_to_fetch.reverse()
    result = []
    for aid in ids_to_fetch:
        try:
            album = api.getAlbum(int(aid))
            result.append({"id": str(album.id), "title": album.name, "cover": album.thumbnail})
        except: continue
    return result

# === ЛОГИКА КОРЗИНЫ ===

@app.post("/folders/remove")
def remove_from_folder(folder: str = Body(...), album_id: str = Body(...)):
    """Удаляет из папки -> Переносит в Trash"""
    folders = load_json(FOLDERS_FILE)
    trash = load_json(TRASH_FILE)
    
    str_id = str(album_id)
    
    # 1. Удаляем из папки
    if folder in folders and str_id in folders[folder]["ids"]:
        folders[folder]["ids"].remove(str_id)
        save_json(FOLDERS_FILE, folders)
        
        # 2. Добавляем в корзину (сохраняем откуда удалили)
        # Получаем инфо об альбоме для отображения в корзине
        try:
            alb = api.getAlbum(int(str_id))
            trash_item = {
                "id": str_id,
                "title": alb.name,
                "cover": alb.thumbnail,
                "origin_folder": folder
            }
            trash.insert(0, trash_item) # Добавляем в начало
            save_json(TRASH_FILE, trash)
        except: pass
        
    return {"status": "moved_to_trash"}

@app.get("/trash")
def get_trash():
    return load_json(TRASH_FILE)

@app.post("/trash/restore")
def restore_from_trash(item_id: str = Body(..., embed=True)):
    trash = load_json(TRASH_FILE)
    folders = load_json(FOLDERS_FILE)
    
    # Находим элемент
    item = next((x for x in trash if x["id"] == item_id), None)
    if not item: return {"status": "error"}
    
    # Восстанавливаем
    origin = item["origin_folder"]
    if origin not in folders:
        # Если папка была удалена, создаем новую или кидаем в дефолт
        folders[origin] = {"ids": [], "active": True}
        
    if item_id not in folders[origin]["ids"]:
        folders[origin]["ids"].append(item_id)
        save_json(FOLDERS_FILE, folders)
        
    # Удаляем из корзины
    trash = [x for x in trash if x["id"] != item_id]
    save_json(TRASH_FILE, trash)
    
    return {"status": "restored"}

@app.post("/trash/delete")
def delete_forever(item_id: str = Body(..., embed=True)):
    """Удалить навсегда"""
    trash = load_json(TRASH_FILE)
    trash = [x for x in trash if x["id"] != item_id]
    save_json(TRASH_FILE, trash)
    return {"status": "deleted_forever"}

# === ЛЕНТА ===
@app.get("/feed")
def get_feed():
    data = load_json(FOLDERS_FILE)
    all_ids = set()
    active_cnt = 0
    for info in data.values():
        if info.get("active", True):
            active_cnt += 1
            for i in info["ids"]: all_ids.add(i)
    
    subs = list(all_ids)
    if not subs: return {"error": "empty_subs" if active_cnt>0 else "no_active_folders", "items": []}

    try:
        rand_albs = random.sample(subs, min(len(subs), 5))
        feed = []
        for aid in rand_albs:
            try:
                album = api.getAlbum(int(aid))
                for url in album.contentUrls[:50]:
                    feed.append({"url": url, "album_title": album.name, "album_id": aid})
            except: continue
        random.shuffle(feed)
        return feed[:100]
    except: return []

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)