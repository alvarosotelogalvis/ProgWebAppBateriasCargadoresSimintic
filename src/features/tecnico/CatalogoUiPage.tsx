/* eslint-disable no-restricted-syntax */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Card } from '@/shared/ui/Card';
import { ComboboxField } from '@/shared/ui/ComboboxField';
import { DateChip, DateRangeFilter } from '@/shared/ui/DateChip';
import { PhotoGallery } from '@/shared/ui/PhotoGallery';
import { PillInput } from '@/shared/ui/PillInput';
import { PrimaryButton } from '@/shared/ui/PrimaryButton';
import { SecondaryButton } from '@/shared/ui/SecondaryButton';
import { PillButton } from '@/shared/ui/PillButton';
import { TextLink } from '@/shared/ui/TextLink';
import { TextField } from '@/shared/ui/TextField';
import { SelectField } from '@/shared/ui/SelectField';
import { Checkbox } from '@/shared/ui/Checkbox';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { Banner } from '@/shared/ui/Banner';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { SyncBadge } from '@/shared/ui/SyncBadge';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Skeleton } from '@/shared/ui/Skeleton';
import { ListRow } from '@/shared/ui/ListRow';
import { Icon } from '@/shared/ui/Icon';
import { BarList } from '@/shared/ui/BarList';
import { DonutProgress } from '@/shared/ui/DonutProgress';
import { Chip } from '@/shared/ui/Chip';

export function CatalogoUiPage(): React.JSX.Element {
  const { t } = useTranslation('tecnico');
  const [segmento, setSegmento] = useState('1');
  const [fecha, setFecha] = useState('2026-10-22');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [combo, setCombo] = useState('');
  const [busqueda, setBusqueda] = useState('');

  return (
    <div className="catalogo">
      <h2>{t('catalogo.titulo')}</h2>

      <Card fill>
        <h3>Botones</h3>
        <div className="fila">
          <PrimaryButton>Normal</PrimaryButton>
          <PrimaryButton size="small">Pequeno</PrimaryButton>
          <SecondaryButton>Secundario</SecondaryButton>
          <SecondaryButton isDisabled>Deshabilitado</SecondaryButton>
        </div>
        <div className="fila">
          <PillButton>Pastilla</PillButton>
          <PillButton seleccionado>Seleccionada</PillButton>
          <TextLink>Enlace de texto</TextLink>
        </div>
      </Card>

      <Card fill>
        <h3>Campos</h3>
        <TextField etiqueta="Texto" placeholder="Escribe aqui" />
        <TextField etiqueta="Con error" error="Este campo es obligatorio" />
        <TextField etiqueta="Multilinea" multilinea ayuda="Texto de ayuda" />
        <SelectField
          etiqueta="Seleccion"
          items={[
            { id: 'a', texto: 'Opcion A' },
            { id: 'b', texto: 'Opcion B' },
          ]}
          selectedKey="a"
          onSelectionChange={() => undefined}
        />
        <Checkbox etiqueta="Casilla de verificacion" />
        <SegmentedControl
          items={[
            { id: '1', etiqueta: 'Uno' },
            { id: '2', etiqueta: 'Dos' },
            { id: '3', etiqueta: 'Tres' },
          ]}
          selectedKey={segmento}
          onChange={setSegmento}
          aria-label="Control segmentado"
        />
      </Card>

      <Card fill>
        <h3>Busqueda, combos y fechas</h3>
        <PillInput
          etiqueta="Buscar"
          valor={busqueda}
          onCambio={setBusqueda}
          placeholder="Buscar servicios"
        />
        <ComboboxField
          etiqueta="Cliente"
          valor={combo}
          items={[
            { id: '1', texto: 'Navar Asociados' },
            { id: '2', texto: 'Distribuidora Andina' },
          ]}
          onCambio={setCombo}
        />
        <DateChip etiqueta="Fecha" valor={fecha} max="2026-10-22" onCambio={setFecha} />
        <DateRangeFilter
          desde={desde}
          hasta={hasta}
          max="2026-10-22"
          onCambio={(nuevoDesde, nuevoHasta) => {
            setDesde(nuevoDesde);
            setHasta(nuevoHasta);
          }}
          desdeEtiqueta="Desde"
          hastaEtiqueta="Hasta"
        />
      </Card>

      <Card fill>
        <h3>Galería de fotos</h3>
        <PhotoGallery
          adjuntos={[
            {
              id: 'demo-1',
              servicioId: 'demo',
              tipo: 'FOTO_INGRESO',
              nombreArchivo: 'foto-demo.jpg',
              mime: 'image/jpeg',
              tamanoBytes: 0,
              sha256: '',
              capturadoEn: '2026-10-22T08:00:00.000Z',
              capturadoPor: 'demo',
              blob: null,
              miniatura: null,
              syncState: 'local',
              eliminarRemoto: false,
            },
          ]}
        />
      </Card>

      <Card fill>
        <h3>Estados y insignias</h3>
        <div className="fila">
          <StatusBadge estado="RECIBIDO" etiqueta="Recibido" />
          <StatusBadge estado="EN_REPARACION" etiqueta="En reparacion" />
          <StatusBadge estado="DISPOSICION_FINAL" etiqueta="D. final" />
        </div>
        <div className="fila">
          <SyncBadge estado="pendiente" etiqueta="Pendiente" />
          <SyncBadge estado="sincronizado" etiqueta="Sincronizado" />
          <SyncBadge estado="error" etiqueta="Error" />
        </div>
      </Card>

      <Card fill>
        <h3>Avisos</h3>
        <Banner tipo="info">Banner informativo</Banner>
        <Banner tipo="exito">Banner de exito</Banner>
        <Banner tipo="advertencia">Banner de advertencia</Banner>
        <Banner tipo="peligro">Banner de peligro</Banner>
      </Card>

      <Card fill>
        <h3>Listas y estados vacios</h3>
        <ListRow icono="servicios" etiqueta="Fila de lista" descripcion="Descripcion secundaria" />
        <EmptyState titulo="Estado vacio" descripcion="Descripcion del estado vacio" />
        <Skeleton lineas={3} />
      </Card>

      <Card fill>
        <h3>Progreso y chips</h3>
        <BarList
          etiqueta="Progreso de sincronizacion"
          items={[
            { id: 'a', etiqueta: 'CAR-1-NV4520', valor: 42, detalle: 'foto 3/5' },
            { id: 'b', etiqueta: 'BAT-7-X99', valor: 100 },
            { id: 'c', etiqueta: 'BAT-8-Y10', valor: 8, tono: 'accent' },
          ]}
        />
        <div className="fila">
          <DonutProgress valor={68} etiqueta="Sincronizado" />
          <div className="fila">
            <Chip tono="account">ESTE DISPOSITIVO</Chip>
            <Icon nombre="avanzar" tamano={20} />
            <Chip tono="account">SHAREPOINT</Chip>
            <Chip tono="tag">Etiqueta</Chip>
          </div>
        </div>
      </Card>

      <Card fill>
        <h3>Iconos</h3>
        <div className="fila">
          <Icon nombre="inicio" tamano={24} />
          <Icon nombre="servicios" tamano={24} />
          <Icon nombre="sincronizar" tamano={24} />
          <Icon nombre="configuracion" tamano={24} />
          <Icon nombre="ayuda" tamano={24} />
          <Icon nombre="acerca" tamano={24} />
        </div>
      </Card>
    </div>
  );
}
