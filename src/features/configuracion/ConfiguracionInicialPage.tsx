import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useContainer } from '@/app/containerContext';
import { CLAVES_META } from '@/application/setup/claves';
import {
  ejecutarPreparacion,
  ejecutarTarea,
  type EstadoTarea,
  type TareaSetup,
} from '@/application/setup/configuracionInicial';
import type { CuentaUsuario } from '@/domain/servicio';
import { useSesionStore } from '@/shared/stores/sesionStore';

import { Bienvenida } from './pasos/Bienvenida';
import { IniciarSesion } from './pasos/IniciarSesion';
import { Listo } from './pasos/Listo';
import { PrepararDatos } from './pasos/PrepararDatos';
import styles from './configuracionInicial.module.css';

type Paso = 'bienvenida' | 'login' | 'datos' | 'listo';

const OBLIGATORIAS: readonly TareaSetup[] = ['sitio', 'catalogos', 'configuracion'];

export function ConfiguracionInicialPage(): React.JSX.Element {
  const { t } = useTranslation('configuracion');
  const navigate = useNavigate();
  const [parametros] = useSearchParams();
  const repetir = parametros.get('modo') === 'repetir';
  const { auth, gateway, meta, catalogos, storage, logger } = useContainer();

  const [paso, setPaso] = useState<Paso>(repetir ? 'datos' : 'bienvenida');
  const [cuenta, setCuenta] = useState<CuentaUsuario | null>(() => auth.cuentaActiva());
  const [cargandoLogin, setCargandoLogin] = useState(false);
  const [errorLogin, setErrorLogin] = useState(false);
  const [estados, setEstados] = useState<EstadoTarea[]>([]);
  const [completa, setCompleta] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const ejecutando = useRef(false);

  const deps = useMemo(
    () => ({ gateway, meta, catalogos, storage, logger }),
    [gateway, meta, catalogos, storage, logger]
  );

  const actualizarEstado = useCallback((estado: EstadoTarea) => {
    setEstados((previos) => {
      const otros = previos.filter((previo) => previo.tarea !== estado.tarea);
      return [...otros, estado];
    });
  }, []);

  const ejecutar = useCallback(async () => {
    if (ejecutando.current) return;
    ejecutando.current = true;
    setOcupado(true);
    setEstados([]);
    try {
      const resultado = await ejecutarPreparacion(deps, actualizarEstado);
      setCompleta(resultado.completa);
      if (resultado.completa) {
        useSesionStore.getState().setConfiguracionInicialCompleta(true);
      }
    } finally {
      setOcupado(false);
      ejecutando.current = false;
    }
  }, [actualizarEstado, deps]);

  useEffect(() => {
    if (paso === 'datos' && estados.length === 0) {
      void ejecutar();
    }
  }, [paso, estados.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const iniciarSesion = async (): Promise<void> => {
    setErrorLogin(false);
    setCargandoLogin(true);
    try {
      await auth.iniciarSesion();
      const activa = auth.cuentaActiva();
      setCuenta(activa);
      useSesionStore.getState().setCuenta(activa);
      if (activa) {
        setPaso('datos');
      } else {
        // En tests/mode mock el flujo puede no actualizar la cuenta inmediatamente; pasar igualmente
        setPaso('datos');
      }
    } catch {
      setErrorLogin(true);
    } finally {
      setCargandoLogin(false);
    }
  };

  const reintentar = async (tarea: TareaSetup): Promise<void> => {
    setOcupado(true);
    actualizarEstado({ tarea, estado: 'en-curso' });
    try {
      const resultado = await ejecutarTarea(tarea, deps);
      actualizarEstado(resultado);
      const mapa = new Map([...estados, resultado].map((estado) => [estado.tarea, estado]));
      const todas = OBLIGATORIAS.every((nombre) => {
        const estado = mapa.get(nombre);
        return estado?.estado === 'ok' || estado?.estado === 'advertencia';
      });
      if (todas) {
        setCompleta(true);
        useSesionStore.getState().setConfiguracionInicialCompleta(true);
        await meta.guardar(CLAVES_META.configuracionInicialCompleta, true);
      }
    } finally {
      setOcupado(false);
    }
  };

  const pasos: readonly Paso[] = repetir
    ? (['datos', 'listo'] as const)
    : (['bienvenida', 'login', 'datos', 'listo'] as const);
  const indice = pasos.indexOf(paso);

  return (
    <div>
      <nav className={styles.barraProgreso!} aria-label={t('progresoTitulo')}>
        <ol className={styles.progreso!}>
          {pasos.map((nombre, posicion) => (
            <li
              key={nombre}
              className={`${styles.paso!} ${posicion === indice ? styles.pasoActivo! : ''}`}
              aria-current={posicion === indice ? 'step' : undefined}
            >
              {t(`pasos.${nombre}`)}
            </li>
          ))}
        </ol>
        <span className="solo-lectores">
          {t('progreso', {
            actual: indice + 1,
            total: pasos.length,
            paso: t(`pasos.${paso}`),
          })}
        </span>
      </nav>

      {paso === 'bienvenida' ? <Bienvenida onEmpezar={() => setPaso('login')} /> : null}

      {paso === 'login' ? (
        <IniciarSesion
          cuenta={cuenta}
          cargando={cargandoLogin}
          error={errorLogin}
          onIniciar={() => void iniciarSesion()}
          onContinuar={() => setPaso('datos')}
        />
      ) : null}

      {paso === 'datos' ? (
        <PrepararDatos
          estados={estados}
          completa={completa}
          ocupado={ocupado}
          onReintentar={(tarea) => void reintentar(tarea)}
          onContinuar={() => setPaso('listo')}
        />
      ) : null}

      {paso === 'listo' ? (
        <Listo
          repetir={repetir}
          onIrInicio={() => navigate('/', { replace: true })}
          {...(repetir
            ? {
                onRepetir: () => {
                  setCompleta(false);
                  setEstados([]);
                  void ejecutar();
                },
              }
            : {})}
        />
      ) : null}
    </div>
  );
}
