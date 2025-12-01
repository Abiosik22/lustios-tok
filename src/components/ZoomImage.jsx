import React, { useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

const ZoomImage = ({ src, alt }) => {
  const [isZoomed, setIsZoomed] = useState(false);

  return (
    <TransformWrapper
      initialScale={1}
      minScale={1}
      maxScale={8}
      centerOnInit={true}
      // Отключаем колесико для зума (чтобы листать ленту на ПК)
      wheel={{ disabled: true }} 
      
      // Отключаем перемещение (panning), если картинка не увеличена (чтобы листать ленту пальцем)
      panning={{ disabled: !isZoomed }}
      
      // Отключаем встроенный двойной клик, чтобы написать свой "умный"
      doubleClick={{ disabled: true }} 

      // Следим за состоянием (увеличено или нет)
      onTransformed={(ref) => {
        // Используем порог 1.01, чтобы избежать глюков с дробными числами
        setIsZoomed(ref.state.scale > 1.01);
      }}
    >
      {({ zoomIn, resetTransform }) => (
        <React.Fragment>
          <TransformComponent
            wrapperStyle={{ width: "100%", height: "100%" }}
            contentStyle={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <img 
              src={src} 
              alt={alt} 
              style={{
                maxWidth: "100%", 
                maxHeight: "100vh", 
                width: "auto", 
                height: "auto",
                objectFit: "contain",
                // Меняем курсор для ПК: Лупа (+) или Лупа (-)
                cursor: isZoomed ? "zoom-out" : "zoom-in",
                // Важно для мобилок: блокируем жесты браузера только если зум включен
                touchAction: isZoomed ? "none" : "pan-y" 
              }}
              referrerPolicy="no-referrer"
              loading="lazy"
              
              // НАШ КАСТОМНЫЙ ОБРАБОТЧИК
              onDoubleClick={(e) => {
                e.stopPropagation(); // Останавливаем всплытие, чтобы не задеть другие элементы
                if (isZoomed) {
                  resetTransform(); // Если было крупно -> Сброс
                } else {
                  zoomIn(2); // Если было мелко -> Увеличиваем (число 2 - сила приближения)
                }
              }}
            />
          </TransformComponent>
        </React.Fragment>
      )}
    </TransformWrapper>
  );
};

export default ZoomImage;