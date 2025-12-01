import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import ZoomImage from './ZoomImage'; // Используем наш зум для картинок внутри!

const AlbumContentModal = ({ album, onClose }) => {
  const [images, setImages] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Загрузка картинок
  const loadPictures = async (pageNum) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/album/${album.id}/pictures?page=${pageNum}`);
      const data = await res.json();
      
      if (pageNum === 1) setImages(data.items);
      else setImages(prev => [...prev, ...data.items]);
      
      setTotalPages(data.total_pages);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPictures(1);
  }, []); // eslint-disable-line

  // Копирование ID
  const handleCopyId = () => {
    navigator.clipboard.writeText(String(album.id));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); // Сброс надписи через 2 сек
  };

  return (
    <div className="album-viewer-overlay">
      
      {/* Шапка */}
      <div className="album-viewer-header">
        <button className="close-viewer-btn" onClick={onClose}>✕</button>
        
        <div className="id-badge" onClick={handleCopyId}>
           <span>{copied ? "Скопировано!" : `ID: ${album.id}`}</span>
           {!copied && <span style={{opacity:0.5}}>📋</span>}
        </div>
      </div>

      {/* Сетка картинок */}
      <div className="album-viewer-content">
        <h3 style={{textAlign:'center', marginTop:0}}>{album.title}</h3>
        
        {/* Можно использовать обычную сетку или одну под другой. 
            Для просмотра удобнее одна под другой с зумом */}
        <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
           {images.map((url, idx) => (
             <div key={idx} style={{width: '100%', minHeight: '300px', background: '#111'}}>
                <ZoomImage src={url} alt={`Page ${idx}`} />
             </div>
           ))}
        </div>

        {/* Кнопка "Еще" */}
        {page < totalPages && (
           <button 
             className="load-more-btn" 
             onClick={() => {
                const next = page + 1;
                setPage(next);
                loadPictures(next);
             }}
           >
             {loading ? "Загрузка..." : "Загрузить еще"}
           </button>
        )}
        
        <div style={{height: '50px'}}></div>
      </div>
    </div>
  );
};

export default AlbumContentModal;