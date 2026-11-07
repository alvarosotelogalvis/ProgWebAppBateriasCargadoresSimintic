import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Eleccion } from '@/application/servicios/resolverConflictos';
import type { Servicio } from '@/domain/servicio';
import { usarContenedor } from '@/app/container';
import { CampoConflicto } from '../components/CampoConflicto';

/**
 * Página para resolver conflictos
 * UX §3.9: Tarjetas en compacto, tabla en expandido
 * T-020
 */

export function ResolverConflictoPage() {
  const { t } = useTranslation('sync');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [servicio, setServicio] = useState<Servicio | null>(null);
  const [cargando, setCargando] = useState(true);
  const [resolviendo, setResolviendo] = useState(false);
  const [elecciones, setElecciones] = useState<Map<string, 'LOCAL' | 'REMOTO'>>(new Map());

  const { servicios, casosDeUso } = usarContenedor();

  // Cargar servicio
  useEffect(() => {
    const cargar = async () => {
      if (!id) return;
      try {
        const svc = await servicios.obtener(id);
        setServicio(svc);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [id, servicios]);

  if (cargando || !servicio) {
    return <div>{t('conflictos.titulo')}...</div>;
  }

  if (servicio.conflictos.length === 0) {
    return <p>{t('conflictos.sinConflictos')}</p>;
  }

  const todasElegidas = servicio.conflictos.every((c) => elecciones.has(c.campo));

  const handleChange = (campo: string, valor: 'LOCAL' | 'REMOTO') => {
    const nueva = new Map(elecciones);
    nueva.set(campo, valor);
    setElecciones(nueva);
  };

  const handleAplicar = async () => {
    setResolviendo(true);
    try {
      const eleccionesArray: Eleccion[] = servicio.conflictos
        .filter((c) => elecciones.has(c.campo))
        .map((c) => ({
          campo: c.campo,
          usar: elecciones.get(c.campo)!,
        }));

      await casosDeUso.resolverConflictos(servicio.id, eleccionesArray);
      navigate('/sincronizacion', { replace: true });
    } finally {
      setResolviendo(false);
    }
  };

  return (
    <div>
      <h2>{t('conflictos.titulo')}</h2>

      <div role="region" aria-label="Conflictos">
        {servicio.conflictos.map((conflicto) => (
          <CampoConflicto
            key={conflicto.campo}
            conflicto={conflicto}
            seleccion={elecciones.get(conflicto.campo)}
            onChange={(valor) => handleChange(conflicto.campo, valor)}
          />
        ))}
      </div>

      <button onClick={handleAplicar} disabled={!todasElegidas || resolviendo} type="button">
        {resolviendo ? 'Aplicando...' : t('conflictos.boton')}
      </button>
    </div>
  );
}
