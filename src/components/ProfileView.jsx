import React, { useState, useEffect } from 'react';
import { styles } from '../styles';
import { API_URL } from '../config';

const ProfileView = () => {
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(false);

  // Загружаем профиль
  const loadProfile = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/profile`);
      const data = await response.json();
      setAlbums(data);
    } catch (error) {
      console.error("Ошибка профиля:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfile(); }, []);

  // Удаление альбома
  const handleRemove = async (idToRemove) => {
    // 1. Убираем визуально сразу (оптимистичный UI)
    const newAlbums = albums.filter(alb => alb.id !== idToRemove);
    setAlbums(newAlbums);

    try {
      // 2. Получаем текущий список ID (нам нужно знать полный список для сохранения)
      const subResp = await fetch(`${API_URL}/subscriptions`);
      const currentSubs = await subResp.json();
      
      // 3. Фильтруем
      const updatedSubs = currentSubs.filter(id => String(id) !== String(idToRemove));

      // 4. Сохраняем на сервер
      await fetch(`${API_URL}/save`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(updatedSubs),
      });
    } catch (e) {
      console.error("Ошибка удаления", e);
      // Если ошибка, можно вернуть альбом обратно, но для прототипа не обязательно
    }
  };

  return (
    <div style={styles.galleryContainer}>
      <h2 style={{margin: '20px', textAlign: 'center'}}>Мой Профиль</h2>
      <p style={{color: '#888', fontSize: '12px', marginBottom: '20px'}}>
        Нажмите на альбом, чтобы удалить его
      </p>

      {loading && <div style={{color: 'white'}}>Загрузка...</div>}
      
      {!loading && albums.length === 0 && (
        <div style={{marginTop: '50px', color: '#555'}}>Нет подписок</div>
      )}

      <div style={styles.grid}>
        {albums.map((album) => (
          <div 
            key={album.id} 
            style={{...styles.card, border: '4px solid #ff0050'}} // Красная рамка (удаление)
            onClick={() => handleRemove(album.id)}
          >
            <img src={album.cover} style={styles.gridImage} referrerPolicy="no-referrer" alt="" />
            {/* Иконка корзины */}
            <div style={{
               position: 'absolute', top: '5px', right: '5px', 
               background: '#ff0050', color: 'white', borderRadius: '50%', 
               width: '24px', height: '24px', display: 'flex', 
               justifyContent: 'center', alignItems: 'center', fontWeight: 'bold'
            }}>×</div>
            
            <div style={{padding: '5px', fontSize: '10px', textAlign: 'center', color: '#ccc'}}>
                {album.title.slice(0, 20)}...
            </div>
          </div>
        ))}
      </div>
      <div style={{height: '80px'}}></div>
    </div>
  );
};

export default ProfileView;