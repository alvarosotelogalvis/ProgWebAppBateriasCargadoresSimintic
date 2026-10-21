/* eslint-disable no-restricted-syntax */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Card } from '@/shared/ui/Card';
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

export function CatalogoUiPage(): React.JSX.Element {
  const { t } = useTranslation('tecnico');
  const [segmento, setSegmento] = useState('1');

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
