import { createBrowserRouter, Navigate } from 'react-router-dom';

import { AppShell } from '@/app/layout/AppShell';
import { InstallGate } from '@/app/guards/InstallGate';
import { RoleGuard } from '@/app/guards/RoleGuard';
import { SetupGuard } from '@/app/guards/SetupGuard';
import { obtenerEnv } from '@/shared/env';

const env = obtenerEnv();
const esDev = env.ok && env.env.VITE_APP_ENV === 'dev';

export const router = createBrowserRouter([
  {
    path: '/instalar',
    lazy: async () => ({
      Component: (await import('@/features/instalacion/InstalarPage')).InstalarPage,
    }),
  },
  {
    path: '/configuracion-inicial',
    lazy: async () => ({
      Component: (await import('@/features/configuracion/ConfiguracionInicialPage'))
        .ConfiguracionInicialPage,
    }),
  },
  {
    element: <SetupGuard />,
    children: [
      {
        element: <InstallGate />,
        children: [
          {
            element: <AppShell />,
            children: [
              {
                index: true,
                lazy: async () => ({
                  Component: (await import('@/features/inicio/InicioPage')).InicioPage,
                }),
              },
              {
                path: 'servicios',
                children: [
                  {
                    index: true,
                    lazy: async () => ({
                      Component: (await import('@/features/servicios/pages/ListaServiciosPage'))
                        .ListaServiciosPage,
                    }),
                  },
                  {
                    path: 'nuevo',
                    lazy: async () => ({
                      Component: (await import('@/features/servicios/pages/NuevoServicioPage'))
                        .NuevoServicioPage,
                    }),
                  },
                  {
                    path: ':id',
                    lazy: async () => ({
                      Component: (await import('@/features/servicios/pages/DetalleServicioPage'))
                        .DetalleServicioPage,
                    }),
                  },
                  {
                    path: ':id/etapa/recepcion',
                    lazy: async () => ({
                      Component: (await import('@/features/servicios/pages/EtapaRecepcionPage'))
                        .EtapaRecepcionPage,
                    }),
                  },
                ],
              },
              {
                path: 'sincronizacion',
                lazy: async () => ({
                  Component: (await import('@/features/sincronizacion/pages/SincronizacionPage'))
                    .SincronizacionPage,
                }),
              },
              {
                path: 'sincronizar',
                element: <Navigate to="/sincronizacion" replace />,
              },
              {
                path: 'mas',
                lazy: async () => ({
                  Component: (await import('@/features/mas/MasPage')).MasPage,
                }),
              },
              {
                path: 'cuenta',
                lazy: async () => ({
                  Component: (await import('@/features/auth/MiCuentaPage')).MiCuentaPage,
                }),
              },
              {
                path: 'ajustes',
                lazy: async () => ({
                  Component: (await import('@/features/ajustes/AjustesPage')).AjustesPage,
                }),
              },
              {
                path: 'ayuda',
                lazy: async () => ({
                  Component: (await import('@/features/ayuda/AyudaPage')).AyudaPage,
                }),
              },
              {
                path: 'ayuda/:tema',
                lazy: async () => ({
                  Component: (await import('@/features/ayuda/AyudaTemaPage')).AyudaTemaPage,
                }),
              },
              {
                path: 'acerca',
                lazy: async () => ({
                  Component: (await import('@/features/acerca/AcercaPage')).AcercaPage,
                }),
              },
              {
                path: 'alertas',
                lazy: async () => ({
                  Component: (await import('@/features/alertas/AlertasPage')).AlertasPage,
                }),
              },
              {
                path: 'tecnico',
                element: <RoleGuard roles={['Administrador']} />,
                children: [
                  {
                    index: true,
                    lazy: async () => ({
                      Component: (await import('@/features/tecnico/TecnicoPage')).TecnicoPage,
                    }),
                  },
                ],
              },
              // El catalogo de componentes solo existe en DEV (import dinamico fuera del build de PRD).
              ...(esDev
                ? [
                    {
                      path: 'tecnico/ui',
                      lazy: async () => ({
                        Component: (await import('@/features/tecnico/CatalogoUiPage'))
                          .CatalogoUiPage,
                      }),
                    },
                  ]
                : []),
            ],
          },
        ],
      },
    ],
  },
]);
