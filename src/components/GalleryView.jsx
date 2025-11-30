import React, { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../config';

const GalleryView = () => {
  const [albums, setAlbums] = useState([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(""); 
  const [sort, setSort] = useState("rating_all_time");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);

  // Инициализация подписок
  useEffect(() => {
    fetch(`${API_URL}/subscriptions`)
      .then(r => r.json())
      .then(data => setSelectedIds(new Set(data)))
      .catch(e => console.error("Ошибка подписок:", e));
  }, []);

  // Функция загрузки
  const loadAlbums = useCallback(async (pageNum, reset = false) => {
    setLoading(true);
    try {
      let url;
      
      // ЛОГИКА ПОИСКА:
      // Если поиск состоит только из цифр и не пустой -> ищем один альбом по ID
      const isIdSearch = /^\d+$/.test(search.trim());

      if (isIdSearch) {
         url = `${API_URL}/album/${search.trim()}`;
      } else {
         // Иначе обычный поиск списка
         url = `${API_URL}/albums?page=${pageNum}&search=${search}&sort=${sort}`;
      }

      const res = await fetch(url);
      
      if (!res.ok) throw new Error("Ошибка запроса");
      
      const data = await res.json();
      
      // Если это поиск одного альбома, data будет объектом, а не массивом. Превращаем в массив.
      const newData = Array.isArray(data) ? data : [data];

      if (reset) {
        setAlbums(newData);
      } else {
        setAlbums(prev => [...prev, ...newData]);
      }
    } catch (e) { 
      console.error(e); 
      // Если поиск по ID не дал результатов, можно очистить список или показать ошибку
      if (reset) setAlbums([]);
    } finally { 
      setLoading(false); 
    }
  }, [search, sort]); // Зависимости функции

  // Перезагрузка при изменении фильтров
  useEffect(() => {
    setPage(1);
    loadAlbums(1, true); 
  }, [sort, loadAlbums]); // Теперь loadAlbums в зависимостях

  // Поиск по Enter
  const handleSearch = () => {
    setPage(1);
    loadAlbums(1, true);
  };

  const toggleSelection = (id) => {
    const newSel = new Set(selectedIds);
    const sId = String(id);
    if (newSel.has(sId)) newSel.delete(sId);
    else newSel.add(sId);
    setSelectedIds(newSel);
    
    fetch(`${API_URL}/save`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(Array.from(newSel)),
    });
  };

  return (
    <div className="gallery-container">
      
      <div className="filters-bar">
        <input 
          className="search-input"
          placeholder="Название или ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        
        {/* Скрываем сортировку, если ищем конкретный ID */}
        {!/^\d+$/.test(search) && (
          <select 
            className="sort-select"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="rating_all_time">❤️ Популярное</option>
            <option value="date_trending">🔥 Тренды</option>
            <option value="newest">🆕 Новое</option>
          </select>
        )}
        
        <button onClick={handleSearch} style={{
            background: 'var(--accent-cyan)', border:'none', 
            borderRadius:'50%', width:'36px', height:'36px', cursor:'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>🔍</button>
      </div>

      <div className="grid">
        {albums.map((album) => {
          const isSelected = selectedIds.has(String(album.id));
          return (
            <div 
              key={album.id} 
              className={`card ${isSelected ? 'selected' : ''}`}
              onClick={() => toggleSelection(album.id)}
            >
              <img 
                src={album.cover} 
                className="grid-image" 
                referrerPolicy="no-referrer" 
                alt={album.title} // Исправлен alt
              />
              {isSelected && <div className="check-mark">✔</div>}
              <div style={{position:'absolute', bottom:0, width:'100%', padding:'5px', background:'rgba(0,0,0,0.7)', fontSize:'10px'}}>
                  {album.title ? album.title.slice(0, 15) : 'No Title'}...
              </div>
            </div>
          );
        })}
      </div>

      {/* Кнопку "Еще" скрываем, если ищем конкретный ID (там всего 1 результат) */}
      {!/^\d+$/.test(search) && (
        <button className="load-more-btn" style={{cursor: 'pointer'}} onClick={() => {
            const n = page + 1;
            setPage(n);
            loadAlbums(n, false);
        }}>
          {loading ? "..." : "Загрузить больше"}
        </button>
      )}

      <div style={{height: '80px'}}></div>
    </div>
  );
};

export default GalleryView;