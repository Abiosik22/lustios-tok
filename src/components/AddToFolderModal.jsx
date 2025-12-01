import React, { useState } from 'react';
import { API_URL } from '../config';

const AddToFolderModal = ({ album, folders, onClose, onUpdate }) => {
  const [newFolderName, setNewFolderName] = useState("");

  // Функция добавления в папку
  const handleAddTo = async (folderName) => {
    try {
      await fetch(`${API_URL}/folders/add`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ folder: folderName, album_id: album.id }),
      });
      // Обновляем данные в родителе
      onUpdate();
      onClose(); // Закрываем окно
    } catch (e) {
      console.error(e);
    }
  };

  // Создать новую папку и сразу добавить туда
  const handleCreateAndAdd = async () => {
    if (!newFolderName) return;
    await fetch(`${API_URL}/folders/create`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ name: newFolderName }),
    });
    handleAddTo(newFolderName);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3 style={{marginTop:0}}>Добавить в папку</h3>
        <p style={{color: '#aaa', fontSize: '12px'}}>{album.title}</p>
        
        <div style={{maxHeight: '200px', overflowY: 'auto'}}>
          {Object.keys(folders).map(folderName => {
             // Проверяем, есть ли уже этот альбом в этой папке
             const isInside = folders[folderName].includes(String(album.id));
             
             return (
               <div 
                 key={folderName} 
                 className={`folder-option ${isInside ? 'active' : ''}`}
                 onClick={() => handleAddTo(folderName)}
               >
                 <span>📁 {folderName}</span>
                 {isInside && <span style={{color: '#00f2ea'}}>✔</span>}
               </div>
             )
          })}
        </div>

        <div className="create-folder-row">
           <input 
             className="search-input" 
             placeholder="Имя новой папки..."
             value={newFolderName}
             onChange={e => setNewFolderName(e.target.value)}
           />
           <button 
             className="nav-btn" 
             style={{background: '#333', borderRadius: '8px'}}
             onClick={handleCreateAndAdd}
           >
             +
           </button>
        </div>
      </div>
    </div>
  );
};

export default AddToFolderModal;