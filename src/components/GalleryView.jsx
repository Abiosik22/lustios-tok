import React, { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../config';
import AddToFolderModal from './AddToFolderModal';
import AlbumContentModal from './AlbumContentModal';

const GalleryView = () => {
  const [albums, setAlbums] = useState([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(""); 
  const [sort, setSort] = useState("rating_all_time");
  const [loading, setLoading] = useState(false);
  const [folders, setFolders] = useState({});
  
  const [selectedAlbumForModal, setSelectedAlbumForModal] = useState(null);
  const [viewingAlbum, setViewingAlbum] = useState(null);

  const fetchFolders = () => {
    fetch(`${API_URL}/folders`)
      .then(r => r.json())
      .then(data => setFolders(data))
      .catch(e => console.error(e));
  };
  useEffect(() => { fetchFolders(); }, []);

  const loadAlbums = useCallback(async (pageNum, reset = false, isRandom = false) => {
      setLoading(true);
      try {
        let url;
        if (isRandom) {
            // Запрос на рандом
            url = `${API_URL}/albums/random`;
        } else if (/^\d+$/.test(search.trim())) {
            url = `${API_URL}/album/${search.trim()}`;
        } else {
            url = `${API_URL}/albums?page=${pageNum}&search=${search}&sort=${sort}`;
        }
        
        const res = await fetch(url);
        const data = await res.json();
        const newData = Array.isArray(data) ? data : [data];

        if (reset) setAlbums(newData);
        else setAlbums(prev => [...prev, ...newData]);
      } catch (e) { if (reset) setAlbums([]); } 
      finally { setLoading(false); }
  }, [search, sort]);

  // Обычная загрузка при старте
  useEffect(() => { setPage(1); loadAlbums(1, true); }, [sort, loadAlbums]);
  const handleSearch = () => { setPage(1); loadAlbums(1, true); };
  
  // Кнопка рандома
  const handleRandom = () => {
      setPage(1); // Рандом сбрасывает пагинацию
      setSearch(""); // Очищает поиск
      loadAlbums(1, true, true); // true = reset, true = isRandom
  };

  const isSaved = (id) => {
      const strId = String(id);
      for (let key in folders) { if (folders[key].includes(strId)) return true; }
      return false;
  };

  return (
    <div className="gallery-container">
      {selectedAlbumForModal && (
        <AddToFolderModal album={selectedAlbumForModal} folders={folders} onClose={() => setSelectedAlbumForModal(null)} onUpdate={fetchFolders} />
      )}
      {viewingAlbum && (
        <AlbumContentModal album={viewingAlbum} onClose={() => setViewingAlbum(null)} />
      )}

      <div className="filters-bar">
         <input className="search-input" placeholder="Поиск..." value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSearch()}/>
         
         {!/^\d+$/.test(search) && (
             <div style={{display:'flex', gap:'5px'}}>
                <select className="sort-select" value={sort} onChange={e=>setSort(e.target.value)}>
                    <option value="rating_all_time">❤️ Топ</option>
                    <option value="date_trending">🔥 Тренды</option>
                    <option value="newest">🆕 Новое</option>
                </select>
                
                {/* КНОПКА РАНДОМ */}
                <button onClick={handleRandom} style={{
                    background:'#ff0050', border:'none', borderRadius:'50%', width:'36px', height:'36px',
                    fontSize:'20px', display:'flex', alignItems:'center', justifyContent:'center'
                }} title="Мне повезет">
                    🎲
                </button>
             </div>
         )}
         <button onClick={handleSearch} style={{background:'var(--accent-cyan)',border:'none',borderRadius:'50%',width:'36px',height:'36px'}}>🔍</button>
      </div>

      <div className="grid">
        {albums.map((album) => {
          const saved = isSaved(album.id);
          return (
            <div key={album.id + Math.random()} className={`card ${saved ? 'selected' : ''}`}>
              <img src={album.cover} className="grid-image" referrerPolicy="no-referrer" alt="" onClick={() => setSelectedAlbumForModal(album)}/>
              {saved && <div className="check-mark">✔</div>}
              
              <div className="view-album-btn" onClick={(e) => { e.stopPropagation(); setViewingAlbum(album); }}>
                 👁
              </div>

              <div style={{position:'absolute', bottom:0, width:'100%', padding:'5px', background:'rgba(0,0,0,0.7)', fontSize:'10px'}}>
                  {album.title ? album.title.slice(0, 15) : ''}...
              </div>
            </div>
          );
        })}
      </div>

      {!/^\d+$/.test(search) && (
        <button className="load-more-btn" onClick={() => {const n = page + 1; setPage(n); loadAlbums(n, false);}}>
          {loading ? "..." : "Загрузить больше"}
        </button>
      )}
      <div style={{height: '80px'}}></div>
    </div>
  );
};

export default GalleryView;