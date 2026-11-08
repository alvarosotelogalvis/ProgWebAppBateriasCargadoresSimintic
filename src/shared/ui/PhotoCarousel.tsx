import { useState, useCallback } from 'react';
import styles from './PhotoCarousel.module.css';

export interface Foto {
  url: string;
  alt: string;
}

export interface PhotoCarouselProps {
  fotos: Foto[];
  breakpoint?: 'compact' | 'medium' | 'expanded';
  onSelect?: (index: number) => void;
}

/**
 * Carrusel de fotos responsive.
 * - Compacto (360px): 1 foto visible
 * - Medio (768px): 3 fotos visibles
 * - Expandido (1280px): 5 fotos visibles
 * Navegable por teclado (flechas izquierda/derecha, Home, End).
 */
export default function PhotoCarousel({
  fotos,
  breakpoint = 'compact',
  onSelect,
}: PhotoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const photosPerView = {
    compact: 1,
    medium: 3,
    expanded: 5,
  }[breakpoint];

  const handlePrev = useCallback(() => {
    setCurrentIndex((i) => (i === 0 ? fotos.length - 1 : i - 1));
  }, [fotos.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((i) => (i === fotos.length - 1 ? 0 : i + 1));
  }, [fotos.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') handlePrev();
    if (e.key === 'ArrowRight') handleNext();
    if (e.key === 'Home') setCurrentIndex(0);
    if (e.key === 'End') setCurrentIndex(fotos.length - 1);
  };

  if (fotos.length === 0) {
    return <div className={styles.empty}>No hay fotos</div>;
  }

  const visiblePhotos = fotos.slice(currentIndex, currentIndex + photosPerView);

  return (
    <div
      className={`${styles.carousel} ${styles[breakpoint]}`}
      role="region"
      aria-label="Carrusel de fotos"
    >
      <div className={styles.track} onKeyDown={handleKeyDown} role="presentation">
        {visiblePhotos.map((foto, i) => (
          <button
            key={currentIndex + i}
            className={styles.slide}
            onClick={() => onSelect?.(currentIndex + i)}
            type="button"
            aria-label={`Seleccionar ${foto.alt}`}
          >
            <img src={foto.url} alt={foto.alt} />
          </button>
        ))}
      </div>

      <div className={styles.controls}>
        <button
          onClick={handlePrev}
          className={styles.arrow}
          aria-label="Foto anterior"
          type="button"
        >
          ‹
        </button>
        <span className={styles.counter} role="status" aria-live="polite">
          Foto {currentIndex + 1} de {fotos.length}
        </span>
        <button
          onClick={handleNext}
          className={styles.arrow}
          aria-label="Foto siguiente"
          type="button"
        >
          ›
        </button>
      </div>
    </div>
  );
}
