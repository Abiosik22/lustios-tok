import React, { useState } from 'react';
import { styles } from '../styles';
import { API_URL } from '../config';

const SearchAlbum = ({ selectedIds, onToggle }) => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/album/${query}`);
      if (!response.ok) {
        throw new Error('Альбом не найден');
      }
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError('Ошибка: ID не найден');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      
      {/* Форма поиска */}
      <div style={styles.searchContainer}>
        <input 
          type="number" 
          placeholder="Введите ID альбома..." 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={styles.searchInput}
        />
        <button onClick={handleSearch} style={styles.searchBtn}>
          {loading ? "..." : "Найти"}
        </button>
      </div>

      {/* Ошибка */}
      {error && <div style={{color: 'red', marginBottom: '10px'}}>{error}</div>}

      {/* Результат поиска (Карточка) */}
      {result && (
        <>
          <div style={styles.searchResultLabel}>Результат поиска:</div>
          <div style={{...styles.grid, display: 'flex', justifyContent: 'center'}}> 
            {/* Используем стиль карточки из галереи, но оборачиваем в флекс для центрирования */}
            <div 
              style={{
                ...styles.card,
                width: '150px', // Фиксированная ширина для одиночной карточки
                border: selectedIds.has(result.id) ? '4px solid #00f2ea' : '4px solid #444',
                transform: selectedIds.has(result.id) ? 'scale(0.95)' : 'scale(1)'
              }}
              onClick={() => onToggle(result.id)}
            >
              <img 
                src={result.cover} 
                style={styles.gridImage} 
                referrerPolicy="no-referrer" 
                alt={result.title} 
              />
              {selectedIds.has(result.id) && <div style={styles.checkMark}>✔</div>}
              {/* Название снизу */}
              <div style={{padding: '5px', fontSize: '10px', textAlign: 'center', color: '#ccc'}}>
                  {result.title.slice(0, 20)}...
              </div>
            </div>
          </div>
          <hr style={{width: '90%', borderColor: '#333', margin: '20px 0'}} />
        </>
      )}
    </div>
  );
};

export default SearchAlbum;