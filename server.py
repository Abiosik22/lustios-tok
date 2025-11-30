from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import json
import random
import requests
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
DB_FILE = "selected_albums.json"

def get_external_ip():
    """Получает и печатает внешний IP-адрес."""
    try:
        response = requests.get('https://api.ipify.org')
        if response.status_code == 200:
            ip_address = response.text
            print(f"Ваш внешний IP-адрес: {ip_address}")
        else:
            print(f"Не удалось получить IP. Код статуса: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"Произошла ошибка при запросе: {e}")

get_external_ip()


def load_subs_from_file():
    if not os.path.exists(DB_FILE):
        return []
    try:
        with open(DB_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return []

@app.get("/albums")
def get_albums(page: int = 1, search: str = "", sort: str = "rating_all_time"):
    """
    page: номер страницы
    search: поисковой запрос (текст или ID)
    sort: сортировка (rating_all_time, date_trending, newest)
    """
    try:
        print(f"Запрос: {search}, Сортировка: {sort}, Стр: {page}")
        
        # Если search пустой, ищем просто список
        query_str = search if search else ""
        
        # Используем параметры из luscious.py
        search_res = api.searchAlbum(
            query=query_str, 
            page=page, 
            display=sort 
        )
        
        results = []
        # Берем до 12 штук
        for item_id in search_res['items'][:12]:
            try:
                album = api.getAlbum(item_id)
                results.append({
                    "id": str(album.id),
                    "title": album.name,
                    "cover": album.thumbnail
                })
            except:
                continue
        return results
    except Exception as e:
        print(f"Error: {e}")
        return []
    
# --- НОВЫЙ ЭНДПОИНТ: Данные для профиля ---
@app.get("/profile")
def get_profile_data():
    """Возвращает полные данные (обложка, название) для подписок"""
    subscribed_ids = load_subs_from_file()
    
    profile_albums = []
    # Чтобы не ждать вечность, если подписок 100 штук, 
    # в реальном проекте тут нужна база данных. 
    # Пока берем последние 20 добавленных (или все, если их мало)
    ids_to_fetch = subscribed_ids[-20:] 
    
    # Разворачиваем, чтобы новые были сверху
    ids_to_fetch.reverse()

    print(f"Загрузка профиля: {len(ids_to_fetch)} альбомов")

    for alb_id in ids_to_fetch:
        try:
            album = api.getAlbum(int(alb_id))
            profile_albums.append({
                "id": str(album.id),
                "title": album.name,
                "cover": album.thumbnail
            })
        except Exception as e:
            print(f"Ошибка профиля {alb_id}: {e}")
            continue
            
    return profile_albums

@app.get("/album/{album_id}")
def get_one_album(album_id: str):
    """Поиск одного альбома"""
    try:
        clean_id = int(album_id.strip())
        album = api.getAlbum(clean_id)
        return {
            "id": str(album.id),
            "title": album.name,
            "cover": album.thumbnail
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail="Альбом не найден")

# --- НОВЫЙ ЭНДПОИНТ: Получить текущие подписки ---
@app.get("/subscriptions")
def get_subscriptions():
    return load_subs_from_file()

@app.post("/save")
def save_selection(selected_ids: List[str] = Body(...)):
    """Сохранение"""
    try:
        # Сначала читаем старые, чтобы не потерять (на всякий случай, хотя фронтенд пришлет всё)
        # Но в данном случае мы доверяем фронтенду, который пришлет полный список
        with open(DB_FILE, "w", encoding="utf-8") as f:
            json.dump(selected_ids, f, indent=4)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/feed")
def get_feed():
    """Лента: больше картинок, больше рандома"""
    subscribed_ids = load_subs_from_file()
    
    if not subscribed_ids:
        return {"error": "empty_subs", "items": []}

    try:
        # УЛУЧШЕНИЕ 1: Берем до 5 случайных альбомов за раз (было 3)
        count_to_pick = min(len(subscribed_ids), 5)
        random_albums = random.sample(subscribed_ids, count_to_pick)
        
        feed_images = []
        print(f"Генерация ленты из: {random_albums}")

        for alb_id in random_albums:
            try:
                album = api.getAlbum(int(alb_id))
                
                # УЛУЧШЕНИЕ 2: Берем первые 50 картинок (было 10)
                # contentUrls может грузиться долго, если альбом огромный, поэтому ставим разумный лимит
                urls = album.contentUrls[:50] 
                
                # Если в альбоме мало картинок, берем все
                
                for url in urls:
                    feed_images.append({
                        "url": url,
                        "album_title": album.name,
                        "album_id": alb_id
                    })
            except Exception as e:
                print(f"Ошибка с альбомом {alb_id}: {e}")
                continue

        # УЛУЧШЕНИЕ 3: Тщательно перемешиваем
        random.shuffle(feed_images)
        
        # Возвращаем максимум 100 картинок за один запрос ленты, чтобы не перегружать память телефона
        return feed_images[:100]

    except Exception as e:
        print(f"Feed error: {e}")
        return []

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)

