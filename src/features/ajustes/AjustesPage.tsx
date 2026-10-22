import { useTranslation } from 'react-i18next';

import { Card } from '@/shared/ui/Card';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { ESCALAS_FUENTE, type EscalaFuente } from '@/app/escalaFuente';

import { usePreferenciasStore } from '@/features/ajustes/preferenciasStore';

export function AjustesPage(): React.JSX.Element {
  const { t } = useTranslation('ajustes');
  const escalaFuente = usePreferenciasStore((estado) => estado.escalaFuente);
  const setEscalaFuente = usePreferenciasStore((estado) => estado.setEscalaFuente);

  const items = ESCALAS_FUENTE.map((escala) => ({
    id: String(escala.valor),
    etiqueta: t(`tamano.${escala.etiqueta}`),
  }));

  return (
    <div>
      <Card fill>
        <h2 className="titulo-seccion">{t('titulo')}</h2>
        <p className="descripcion">{t('tamano.descripcion')}</p>
        <SegmentedControl
          items={items}
          selectedKey={String(escalaFuente)}
          onChange={(clave) => setEscalaFuente(Number(clave) as EscalaFuente)}
          aria-label={t('tamano.aria')}
        />
        <p className="vista-previa">{t('tamano.vistaPrevia')}</p>
      </Card>
    </div>
  );
}
