import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import AlbumContentModal from './AlbumContentModal'; // ИМПОРТ

const ProfileView = () => {
  const [viewMode, setViewMode] = useState('list'); // list | folder | trash
  const [activeFolder, setActiveFolder] = useState(null);
  
  const [folderPreviews, setFolderPreviews] = useState([]);
  const [folderContent, setFolderContent] = useState([]); 
  const [trashContent, setTrashContent] = useState([]); // Контент корзины
  const [loading, setLoading] = useState(false);
  
  // Стейт для просмотра альбома (Глаз)
  const [viewingAlbum, setViewingAlbum] = useState(null);

  const loadPreviews = () => {
    setLoading(true);
    fetch(`${API_URL}/folders/preview`)
      .then(r => r.json())
      .then(data => setFolderPreviews(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadPreviews(); }, []);

  // --- ЛОГИКА ПАПОК ---
  const openFolder = (folderName) => {
    setActiveFolder(folderName);
    setViewMode('folder');
    setLoading(true);
    fetch(`${API_URL}/folders/content`, {
        method: 'POST', 
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ name: folderName })
    })
    .then(r => r.json())
    .then(data => setFolderContent(data))
    .finally(() => setLoading(false));
  };

  const toggleFolderFeed = async (folderName, e) => {
    e.stopPropagation();
    setFolderPreviews(prev => prev.map(f => f.name === folderName ? { ...f, active: !f.active } : f));
    await fetch(`${API_URL}/folders/toggle_feed`, {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ name: folderName })
    });
  };

  const removeAlbumToTrash = async (id, e) => {
      e.stopPropagation(); // Не открывать альбом
      // Оптимистичное удаление
      setFolderContent(prev => prev.filter(a => a.id !== id));
      await fetch(`${API_URL}/folders/remove`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ folder: activeFolder, album_id: id })
      });
  };

  // --- ЛОГИКА КОРЗИНЫ ---
  const openTrash = () => {
      setViewMode('trash');
      setLoading(true);
      fetch(`${API_URL}/trash`)
        .then(r => r.json())
        .then(data => setTrashContent(data))
        .finally(() => setLoading(false));
  };

  const restoreFromTrash = async (id) => {
      setTrashContent(prev => prev.filter(x => x.id !== id));
      await fetch(`${API_URL}/trash/restore`, {
          method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ item_id: id })
      });
  };

  const deleteForever = async (id) => {
      if (!window.confirm("Удалить навсегда?")) return;
      setTrashContent(prev => prev.filter(x => x.id !== id));
      await fetch(`${API_URL}/trash/delete`, {
          method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ item_id: id })
      });
  };

  // 1. ПРОСМОТР АЛЬБОМА (МОДАЛКА)
  if (viewingAlbum) {
      return <AlbumContentModal album={viewingAlbum} onClose={() => setViewingAlbum(null)} />;
  }

  // 2. ВНУТРИ ПАПКИ
  if (viewMode === 'folder') {
      return (
        <div className="gallery-container">
            <div style={{display:'flex', alignItems:'center', marginBottom:'20px'}}>
                <button onClick={() => setViewMode('list')} style={{background:'none', border:'none', color:'white', fontSize:'20px', marginRight:'10px'}}>⬅</button>
                <h2 style={{margin:0}}>{activeFolder}</h2>
            </div>
            <div className="grid">
                {folderContent.map(album => (
                    <div key={album.id} className="card delete-mode">
                        <img src={album.cover} className="grid-image" referrerPolicy="no-referrer" alt="" onClick={() => setViewingAlbum(album)} />
                        
                        {/* Кнопка "В корзину" */}
                        <div className="delete-folder-btn" onClick={(e) => removeAlbumToTrash(album.id, e)}>×</div>
                        
                        {/* Кнопка "Глаз" */}
                        <div className="view-album-btn" onClick={(e) => { e.stopPropagation(); setViewingAlbum(album); }}>👁</div>
                        
                        <div style={{position:'absolute', bottom:0, width:'100%', padding:'5px', background:'rgba(0,0,0,0.7)', fontSize:'10px'}}>
                           {album.title.slice(0, 15)}...
                        </div>
                    </div>
                ))}
            </div>
            {folderContent.length === 0 && !loading && <p style={{textAlign:'center', color:'#777'}}>Пусто</p>}
            <div style={{height: '80px'}}></div>
        </div>
      );
  }

  // 3. КОРЗИНА
  if (viewMode === 'trash') {
      return (
        <div className="gallery-container">
            <div style={{display:'flex', alignItems:'center', marginBottom:'20px'}}>
                <button onClick={() => { setViewMode('list'); loadPreviews(); }} style={{background:'none', border:'none', color:'white', fontSize:'20px', marginRight:'10px'}}>⬅</button>
                <h2 style={{margin:0}}>Корзина 🗑</h2>
            </div>
            <p style={{fontSize:'12px', color:'#777', textAlign:'center'}}>Здесь находятся удаленные альбомы</p>

            <div className="grid">
                {trashContent.map(item => (
                    <div key={item.id} className="card" style={{border: '1px solid #555'}}>
                        <img src={item.cover} className="grid-image" referrerPolicy="no-referrer" alt="" style={{opacity: 0.5}} />
                        
                        {/* Кнопка ВОССТАНОВИТЬ (Зеленая) */}
                        <div onClick={() => restoreFromTrash(item.id)} style={{
                            position:'absolute', top:'5px', right:'40px', background:'#00f2ea', color:'black',
                            width:'24px', height:'24px', borderRadius:'50%', display:'flex', justifyContent:'center', alignItems:'center', cursor:'pointer'
                        }}>♻</div>

                        {/* Кнопка УДАЛИТЬ НАВСЕГДА (Красная) */}
                        <div onClick={() => deleteForever(item.id)} style={{
                            position:'absolute', top:'5px', right:'5px', background:'#ff0050', color:'white',
                            width:'24px', height:'24px', borderRadius:'50%', display:'flex', justifyContent:'center', alignItems:'center', cursor:'pointer'
                        }}>×</div>

                        <div style={{position:'absolute', bottom:0, width:'100%', padding:'5px', background:'rgba(0,0,0,0.8)', fontSize:'10px'}}>
                           <div style={{color:'#00f2ea'}}>Из: {item.origin_folder}</div>
                           {item.title.slice(0, 15)}...
                        </div>
                    </div>
                ))}
            </div>
            {trashContent.length === 0 && <p style={{textAlign:'center', marginTop:'20px'}}>Корзина пуста</p>}
            <div style={{height: '80px'}}></div>
        </div>
      );
  }

  // 4. ГЛАВНЫЙ СПИСОК ПАПОК
  return (
    <div style={{paddingBottom: '80px'}}>
      <div className="profile-header">
        <div className="avatar"><img src="https://via.placeholder.com/150/00f2ea/000000?text=U" alt="User" /></div>
        <h1 className="nickname">LustUser</h1>
        
        {/* КНОПКА ОТКРЫТЬ КОРЗИНУ */}
        <button onClick={openTrash} style={{
            marginTop: '10px', background:'#333', color:'#aaa', border:'1px solid #555', 
            padding:'8px 15px', borderRadius:'20px', cursor:'pointer'
        }}>
            Открыть Корзину 🗑
        </button>
      </div>

      <div className="gallery-container">
        {loading && <div>Загрузка...</div>}

        <div className="grid" style={{gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px'}}>
            {folderPreviews.map((f) => (
            <div key={f.name} className="folder-card" onClick={() => openFolder(f.name)}>
                <div style={{height: 'calc(100% - 40px)', position: 'relative'}}>
                     {f.cover ? <img src={f.cover} className="grid-image" referrerPolicy="no-referrer" alt="" /> : <div style={{width:'100%', height:'100%', background:'#333'}}></div>}
                     {/* Тут можно кнопку удаления самой папки, но аккуратно */}
                </div>
                <div className="folder-controls">
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <span style={{fontWeight:'bold', fontSize:'13px'}}>{f.name}</span>
                        <span style={{fontSize:'10px', color:'#888'}}>{f.count}</span>
                    </div>
                    <button className={`feed-toggle-btn ${f.active ? 'active' : 'inactive'}`} onClick={(e) => toggleFolderFeed(f.name, e)}>
                        {f.active ? "В ЛЕНТЕ ✔" : "СКРЫТО"}
                    </button>
                </div>
            </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default ProfileView;