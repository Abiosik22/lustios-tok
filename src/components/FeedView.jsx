import React, { useState, useEffect, useRef, useCallback } from 'react';
import { API_URL } from '../config';

const FeedView = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Автопрокрутка
  const [autoScroll, setAutoScroll] = useState(false);
  const [seconds, setSeconds] = useState(3);
  const scrollRef = useRef(null);

  // Оборачиваем в useCallback, чтобы функция не пересоздавалась и useEffect не сходил с ума
  const fetchMore = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/feed`);
      const data = await res.json();
      
      if (data.error) {
        setError(data.error);
      } else if (Array.isArray(data) && data.length > 0) {
        setImages(prev => [...prev, ...data]);
      }
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  }, [loading]); // Зависимость от loading, чтобы не спамить

  // Первая загрузка
  useEffect(() => {
    // Грузим только если список пустой
    if (images.length === 0) {
      fetchMore();
    }
  }, [fetchMore, images.length]); // Правильные зависимости

  // Логика автопрокрутки
  useEffect(() => {
    let interval;
    if (autoScroll) {
      interval = setInterval(() => {
        if (scrollRef.current) {
          const height = scrollRef.current.clientHeight;
          scrollRef.current.scrollBy({ top: height, behavior: 'smooth' });
          
          const { scrollTop, scrollHeight } = scrollRef.current;
          // Если осталось меньше 3 экранов до низа, грузим еще
          if (scrollHeight - scrollTop < height * 3) {
             fetchMore();
          }
        }
      }, seconds * 1000);
    }
    return () => clearInterval(interval);
  }, [autoScroll, seconds, fetchMore]);

  // Если нет подписок
  if (error === 'empty_subs' || error === 'no_subs') {
    return (
      <div style={{display:'flex', height:'100vh', alignItems:'center', justifyContent:'center', flexDirection:'column'}}>
        <h3>Пусто :(</h3>
        <p>Зайдите в Галереи и подпишитесь на что-нибудь.</p>
      </div>
    );
  }

  return (
    <div className="feed-container" ref={scrollRef}>
      {images.map((img, index) => (
        <div key={`${img.album_id}-${index}-${img.url}`} className="feed-item">
          <img 
            src={img.url} 
            className="feed-image" 
            referrerPolicy="no-referrer" 
            loading="lazy" 
            alt={`Content from ${img.album_title}`} // Исправлен alt
          />
          
          <div className="auto-scroll-panel">
            <span style={{fontSize: '10px', color: '#ccc'}}>Сек</span>
            <input 
              type="number" 
              value={seconds} 
              onChange={(e) => setSeconds(Number(e.target.value))} 
              min="1"
            />
            <button 
              className={`auto-scroll-btn ${autoScroll ? 'active' : ''}`}
              onClick={() => setAutoScroll(!autoScroll)}
            >
              {autoScroll ? '❚❚' : '▶'}
            </button>
          </div>

          <div className="feed-overlay">
            <h4 style={{margin:0}}>{img.album_title}</h4>
            <small>ID: {img.album_id}</small>
          </div>
        </div>
      ))}

      {/* Кнопка "Еще" показывается только если есть картинки */}
      {images.length > 0 && (
        <div className="feed-item" style={{flexDirection: 'column', background: '#111'}}>
            <h2>Вы всё посмотрели</h2>
            <button className="load-more-btn" style={{width: '200px', cursor: 'pointer'}} onClick={fetchMore}>
              {loading ? "Загружаем..." : "Загрузить еще 50"}
            </button>
            <div style={{height:'100px'}}></div>
        </div>
      )}
      
      {/* Если картинок нет и идет загрузка - показываем спиннер по центру */}
      {images.length === 0 && loading && (
         <div className="feed-item"><h2>Загрузка ленты...</h2></div>
      )}
    </div>
  );
};

export default FeedView;